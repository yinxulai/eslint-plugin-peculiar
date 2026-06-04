import type { Rule, SourceCode, AST } from 'eslint'
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils'

type SignatureStyle = 'consistent' | 'single' | 'multiple'

type Options = [
  {
    /**
     * 签名换行风格:
     * - `single`     : 签名必须在一行内
     * - `multiple`   : 签名必须多行,且每个参数独占一行
     * - `consistent` : 签名要么全在一行,要么多行且每个参数独占一行
     *
     * @default 'consistent'
     */
    style?: SignatureStyle
    /**
     * 当 `(...)` 内部的字符数超过该值时,强制按 `multiple` 风格处理(每个参数独占一行)。
     * 仅在 `style: 'consistent'` 或 `style: 'single'` 时生效(用于检测单行过长)。
     *
     * 注意:计的是 `(...)` **内部**的字符数(不含 `(` `)` 本身),含注释。
     */
    maxLength?: number
  },
]

type MessageIds =
  | 'expectedSingleLine'
  | 'expectedMultipleLines'
  | 'expectedConsistent'
  | 'paramShouldBeOnOwnLine'
  | 'signatureTooLong'

const DEFAULT_STYLE: SignatureStyle = 'consistent'

type FunctionLike =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression

interface SignatureRange {
  openParen: AST.Token
  closeParen: AST.Token
  innerText: string
  isSingleLine: boolean
  eachParamOnOwnLine: boolean
}

/**
 * 在 `node` 的参数列表外侧找到 `(` 和 `)` token。
 *
 * - 有参数:`(` 是 `params[0]` 前的 token,`)` 是 `params[last]` 后的 token
 * - 无参数:从 `node` 自身的最后一个非 `(`/`)` token 之后,找 `(` / `)`
 *
 * **深度防御**:所有 token 查找都加 `t.range ⊆ node.range` 限制,确保不会跨越
 * 节点边界(避免 nested 场景误把外层 call 的 `(`/`)` 当作本节点的签名括号)。
 * 实际触发案例:`async request => {...}` 是 1 参无括号箭头,嵌在 `server.post('...', cb)` 里,
 * `getTokenBefore(request, t => t.value === '(')` 会拿到外层 `.post(` 的 `(`。
 * (虽然主流程 1 参已早返回不报,这里加范围限制是双重保险。)
 */
function getOpenCloseParen(
  sourceCode: SourceCode,
  node: FunctionLike,
): { openParen: AST.Token; closeParen: AST.Token } | null {
  const nodeStart = node.range[0]
  const nodeEnd = node.range[1]
  const inNode = (t: AST.Token, side: 'open' | 'close'): boolean =>
    side === 'open' ? t.range[0] >= nodeStart : t.range[1] <= nodeEnd

  const params = node.params
  if (params.length > 0) {
    // ESLint 的 getTokenBefore/After 要 estree `Node | Token`;
    // TSESTree.Parameter 在运行时是同一对象,这里 cast 一下
    const first = params[0]! as unknown as Rule.Node
    const last = params[params.length - 1]! as unknown as Rule.Node
    const openParen = sourceCode.getTokenBefore(
      first,
      (t) => t.value === '(' && inNode(t, 'open'),
    ) as AST.Token | null
    const closeParen = sourceCode.getTokenAfter(
      last,
      (t) => t.value === ')' && inNode(t, 'close'),
    ) as AST.Token | null
    if (!openParen || !closeParen) return null
    return { openParen, closeParen }
  }

  // 0 参:从 `node` 自身的最后一个非 `(`/`)` token 之后找
  const anchor = sourceCode.getLastToken(node as unknown as Rule.Node, (t) => t.value !== '(' && t.value !== ')')
  if (!anchor) return null
  const openParen = sourceCode.getTokenAfter(
    anchor,
    (t) => t.value === '(' && inNode(t, 'open'),
  ) as AST.Token | null
  if (!openParen) return null
  const closeParen = sourceCode.getTokenAfter(
    openParen,
    (t) => t.value === ')' && inNode(t, 'close'),
  ) as AST.Token | null
  if (!closeParen) return null
  return { openParen, closeParen }
}

function computeSignatureRange(
  sourceCode: SourceCode,
  node: FunctionLike,
): SignatureRange | null {
  const tokens = getOpenCloseParen(sourceCode, node)
  if (!tokens) return null
  const { openParen, closeParen } = tokens

  const innerText = sourceCode.text.slice(openParen.range[1], closeParen.range[0])
  // 用 token 行号判断:openParen 结束行 !== closeParen 开始行 => 签名多行
  // 不被 `text.includes('\n')` 干扰(块注释里的换行不会让"逻辑单行"误判为多行)
  const isSingleLine = openParen.loc.end.line === closeParen.loc.start.line

  // 每个参数独占一行:相邻参数不在同一行
  const params = node.params
  let eachParamOnOwnLine = true
  for (let i = 1; i < params.length; i++) {
    const prevEndLine = params[i - 1]!.loc.end.line
    const curStartLine = params[i]!.loc.start.line
    if (curStartLine === prevEndLine) {
      eachParamOnOwnLine = false
      break
    }
  }

  return { openParen, closeParen, innerText, isSingleLine, eachParamOnOwnLine }
}

/**
 * innerRange 内部是否有"参数之外"的注释。
 *
 * 注释如果出现在 `(` 和 `)` 之间、但又**不在**参数节点自身范围内,fix 重建参数
 * 列表时容易把它吞掉。遇到这种情况,只 report、不 fix —— 让用户自己手摆。
 *
 * 实现:遍历 `sourceCode.getAllComments()`,挑出完全在 `[openParen.end, closeParen.start)`
 * 内的注释,再排除"落在某个 param 节点自身范围内"的(TS 类型注解内的注释,fix 安全)。
 * 这样能同时覆盖:
 *   - 第一个参数前的注释:        `function foo(<注释> a, b)`
 *   - 最后一个参数后的注释:       `function foo(a, b, <注释>)`
 *   - 相邻参数之间的注释:         `function foo(a, <注释> b)`
 *   - 0 参时 innerRange 内的注释:  `function foo(<注释>)`
 */
function hasInnerRangeComments(
  sourceCode: SourceCode,
  openParen: AST.Token,
  closeParen: AST.Token,
  params: TSESTree.Parameter[],
): boolean {
  const innerStart = openParen.range[1]
  const innerEnd = closeParen.range[0]
  for (const c of sourceCode.getAllComments()) {
    const r = c.range
    if (!r) continue
    if (r[0] < innerStart || r[1] > innerEnd) continue
    const inParam = params.some(
      (p) => r[0] >= p.range[0] && r[1] <= p.range[1],
    )
    if (!inParam) return true
  }
  return false
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    fixable: 'code',
    docs: {
      description:
        'Enforce a consistent line break style for function signatures.',
      recommended: false,
      url: 'https://github.com/yinxulai/eslint-plugin-peculiar#func-signature-linebreak',
    },
    schema: [
      {
        type: 'object',
        properties: {
          style: {
            type: 'string',
            enum: ['consistent', 'single', 'multiple'],
          },
          maxLength: {
            type: 'integer',
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      expectedSingleLine:
        'Function signature should be on a single line.',
      expectedMultipleLines:
        'Function signature should be split across multiple lines (one parameter per line).',
      expectedConsistent:
        'Function signature should be either all on one line, or split with each parameter on its own line.',
      paramShouldBeOnOwnLine:
        'In a multi-line signature, each parameter must be on its own line.',
      signatureTooLong:
        'Function signature is too long ({{length}} chars). Maximum allowed is {{max}}.',
    },
  },
  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as Options[0]
    const style: SignatureStyle = options.style ?? DEFAULT_STYLE
    const maxLength = options.maxLength
    const sourceCode = context.sourceCode

    /**
     * 构造 fix。不可机械修复时返回 null(让 ESLint 跳过 fix,但仍保留 report)。
     *
     * 修复策略按 messageId 分类:
     * | messageId              | 输入             | 修复方向               |
     * | ---------------------- | ---------------- | ---------------------- |
     * | expectedSingleLine     | 多行             | 把 `()` 内全部空白压成单空格 |
     * | paramShouldBeOnOwnLine | 多行(参数未分行) | 每个参数独占一行       |
     * | expectedConsistent     | 多行(参数未分行) | 同上                   |
     * | expectedMultipleLines  | 单行             | 拆成"每个参数独占一行" |
     * | signatureTooLong       | 单行(过长)       | 同上                   |
     *
     * 缩进策略:
     * - 多行输入:用第一个参数所在的列号作参数缩进(沿用源码已有缩进)
     * - 单行输入:用 2 空格
     *
     * 安全护栏:innerRange 内有"参数外注释"时,返回 null(只 report 不 fix)。
     */
    function buildFix(
      fixer: Rule.RuleFixer,
      sig: SignatureRange,
      params: TSESTree.Parameter[],
      messageId: MessageIds,
    ): Rule.Fix | null {
      const { openParen, closeParen, innerText, isSingleLine } = sig
      const innerRange: [number, number] = [openParen.range[1], closeParen.range[0]]

      // Case 1: 多行 → 单行
      if (messageId === 'expectedSingleLine') {
        // 把内层全部空白压成单空格(块注释内部的空白不动,因为它们不是连续空白)
        const collapsed = innerText.replace(/\s+/g, ' ').trim()
        return fixer.replaceTextRange(innerRange, collapsed)
      }

      // 其余 4 个:拆成"每个参数独占一行"
      if (params.length < 2) return null
      if (hasInnerRangeComments(sourceCode, openParen, closeParen, params)) {
        return null
      }

      // 自动获取缩进：
      // - 多行输入：使用第一个参数的列号（保持现有缩进）
      // - 单行输入：使用固定的 2 空格（标准缩进，不随嵌套深度变化）
      const paramIndent = isSingleLine
        ? '  ' // 固定 2 空格，避免嵌套时缩进过多
        : ' '.repeat(params[0]!.loc.start.column)
      const newInner =
        '\n' +
        params
          .map((p) => paramIndent + sourceCode.text.slice(p.range[0], p.range[1]))
          .join(',\n') +
        '\n'

      return fixer.replaceTextRange(innerRange, newInner)
    }

    function check(node: Rule.Node): void {
      if (
        node.type !== AST_NODE_TYPES.FunctionDeclaration &&
        node.type !== AST_NODE_TYPES.FunctionExpression &&
        node.type !== AST_NODE_TYPES.ArrowFunctionExpression
      ) {
        return
      }
      const fnNode = node as unknown as FunctionLike
      const params = fnNode.params

      const sig = computeSignatureRange(sourceCode, fnNode)
      if (!sig) return

      const reportLoc = {
        start: sig.openParen.loc.start,
        end: sig.closeParen.loc.end,
      }

      // 早返回前:把 sig 拷到 closure-local const,避免 TS 在回调里丢掉 narrowing
      const sigRef = sig

      // 0 参 / 1 参:签名内层基本无可"换行风格"可言,直接放行。
      // 0 参的 `function foo(\n) {}` 几乎不存在(`@typescript-eslint/parser` 严格时也拒绝),
      // 1 参无括号箭头 `request =>` 是常见用法(Fastify/async 包装),
      //   强检会误把外层 call 的 `(`/`)` 当作签名括号,破坏代码 —— 见测试 case
      //   "嵌套箭头函数在外层 call 内:fix 不应误伤外层"。
      if (params.length < 2) return

      // 内层有"非参数注释":只 report,不 fix
      const unsafeComments = hasInnerRangeComments(
        sourceCode,
        sig.openParen,
        sig.closeParen,
        params,
      )

      function reportFixable(
        messageId: MessageIds,
        data?: Record<string, unknown>,
      ) {
        context.report({
          node,
          loc: reportLoc,
          messageId,
          data,
          fix: unsafeComments
            ? undefined
            : (fixer) => buildFix(fixer, sigRef, params, messageId),
        })
      }

      // 长度超限:要求拆成多行
      if (maxLength !== undefined && sig.isSingleLine && sig.innerText.length > maxLength) {
        reportFixable('signatureTooLong', {
          length: String(sig.innerText.length),
          max: String(maxLength),
        })
        return
      }

      if (style === 'single') {
        if (!sig.isSingleLine) reportFixable('expectedSingleLine')
        return
      }

      if (style === 'multiple') {
        if (sig.isSingleLine) {
          reportFixable('expectedMultipleLines')
          return
        }
        if (!sig.eachParamOnOwnLine) {
          reportFixable('paramShouldBeOnOwnLine')
        }
        return
      }

      // style === 'consistent'
      if (!sig.isSingleLine && !sig.eachParamOnOwnLine) {
        reportFixable('expectedConsistent')
      }
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    }
  },
}

export default rule
