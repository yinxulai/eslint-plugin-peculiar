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
     */
    style?: SignatureStyle
    /**
     * 当一行签名字符数超过该值时,强制按 `multiple` 风格处理(每个参数独占一行)。
     * 仅在 `style: 'consistent'` 或 `style: 'single'` 时生效(用于检测单行过长)。
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

interface SignatureRange {
  openParen: AST.Token | null
  closeParen: AST.Token | null
  text: string
  isSingleLine: boolean
  eachParamOnOwnLine: boolean
  lines: number
}

function getParamTokens(
  sourceCode: SourceCode,
  params: { loc: { start: { line: number } } }[],
): { openParen: AST.Token | null; closeParen: AST.Token | null } {
  if (params.length === 0) {
    // 没有参数时,需要找到 `()` 这个空括号对
    // 通过父节点的位置推断:取父节点后第一个 `(` 和与之匹配的 `)`
    // 这里为了简洁,直接返回 null 让上层跳过
    return { openParen: null, closeParen: null }
  }
  const first = params[0]! as unknown as Rule.Node
  const last = params[params.length - 1]! as unknown as Rule.Node
  const openParen = sourceCode.getTokenBefore(first, (t) => t.value === '(') as AST.Token | null
  const closeParen = sourceCode.getTokenAfter(last, (t) => t.value === ')') as AST.Token | null
  return { openParen, closeParen }
}

function computeSignatureRange(
  sourceCode: SourceCode,
  node: { params: { loc: { start: { line: number }; end: { line: number } } }[] },
): SignatureRange | null {
  const { openParen, closeParen } = getParamTokens(sourceCode, node.params)
  if (!openParen || !closeParen) return null

  const text = sourceCode.text.slice(openParen.range[0], closeParen.range[1])
  const lines = closeParen.loc.end.line - openParen.loc.start.line + 1
  const isSingleLine = !text.includes('\n')

  // 每个参数独占一行:相邻参数的起始行号不同
  let eachParamOnOwnLine = true
  for (let i = 1; i < node.params.length; i++) {
    const prevEnd = node.params[i - 1]!.loc.end.line
    const curStart = node.params[i]!.loc.start.line
    if (curStart === prevEnd) {
      eachParamOnOwnLine = false
      break
    }
  }

  return {
    openParen,
    closeParen,
    text,
    isSingleLine,
    eachParamOnOwnLine,
    lines,
  }
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    fixable: 'code',
    docs: {
      description:
        'Enforce a consistent line break style for function signatures.',
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

    function reportLoc(sig: SignatureRange) {
      return {
        start: sig.openParen!.loc.start,
        end: sig.closeParen!.loc.end,
      }
    }

    /**
     * 构造 fix。不可机械修复时返回 null(让 ESLint 跳过 fix,但仍保留 report)。
     *
     * 修复策略按 messageId 分类:
     * | messageId              | 输入            | 修复方向               |
     * | ---------------------- | --------------- | ---------------------- |
     * | expectedSingleLine     | 多行            | 把 `()` 内全部空白压成单空格 |
     * | paramShouldBeOnOwnLine | 多行(参数未分行) | 每个参数独占一行       |
     * | expectedConsistent     | 同上            | 同上                   |
     * | expectedMultipleLines  | 单行            | 拆成"每个参数独占一行" |
     * | signatureTooLong       | 单行(过长)      | 同上                   |
     *
     * 缩进策略:
     * - 多行输入:用第一个参数所在的列号作参数缩进(沿用源码已有缩进),`)` 留在原位不动
     * - 单行输入:用 2 空格(项目里用 4 空格 / tab 的可改 SINGLE_LINE_INDENT)
     */
    const SINGLE_LINE_INDENT = '  '

    type FixableFunctionLike =
      | TSESTree.FunctionDeclaration
      | TSESTree.FunctionExpression
      | TSESTree.ArrowFunctionExpression

    function buildFix(
      fixer: Rule.RuleFixer,
      sc: SourceCode,
      node: FixableFunctionLike,
      sig: SignatureRange,
      messageId: MessageIds,
    ): Rule.Fix | null {
      const openParen = sig.openParen
      const closeParen = sig.closeParen
      if (!openParen || !closeParen) return null
      const params = node.params
      if (params.length < 2) return null

      // 替换区间:紧贴 () 内部,不动 `(` 和 `)` —— 这样 `)` 保持在原位
      const innerRange: [number, number] = [
        openParen.range[1],
        closeParen.range[0],
      ]

      // Case 1: 多行 → 单行
      if (messageId === 'expectedSingleLine') {
        const innerText = sc.text.slice(innerRange[0], innerRange[1])
        const collapsed = innerText.replace(/\s+/g, ' ').trim()
        return fixer.replaceTextRange(innerRange, collapsed)
      }

      // 其余 4 个:拆成"每个参数独占一行"
      const isMultilineInput = !sig.isSingleLine
      const paramIndent = isMultilineInput
        ? ' '.repeat(params[0]!.loc.start.column)
        : SINGLE_LINE_INDENT
      const newInner =
        '\n' +
        params
          .map((p) => paramIndent + sc.text.slice(p.range[0], p.range[1]))
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
      const fnNode = node as unknown as FixableFunctionLike
      const params = fnNode.params
      // 没有参数或只有一个参数:不需要换行讨论
      if (params.length < 2) return

      const sig = computeSignatureRange(sourceCode, { params })
      if (!sig) return

      function reportFixable(
        messageId: MessageIds,
        data?: Record<string, unknown>,
      ) {
        context.report({
          node,
          loc: reportLoc(sig!),
          messageId,
          data,
          fix: (fixer) => buildFix(fixer, sourceCode, fnNode, sig!, messageId),
        })
      }

      // 长度超限:要求拆成多行
      if (
        maxLength !== undefined &&
        sig.isSingleLine &&
        sig.text.length > maxLength
      ) {
        reportFixable('signatureTooLong', {
          length: String(sig.text.length),
          max: String(maxLength),
        })
        return
      }

      if (style === 'single') {
        if (!sig.isSingleLine) {
          reportFixable('expectedSingleLine')
        }
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
