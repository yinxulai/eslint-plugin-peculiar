import type { Rule, SourceCode, AST } from 'eslint'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

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

    function check(node: Rule.Node): void {
      if (
        node.type !== AST_NODE_TYPES.FunctionDeclaration &&
        node.type !== AST_NODE_TYPES.FunctionExpression &&
        node.type !== AST_NODE_TYPES.ArrowFunctionExpression
      ) {
        return
      }
      const params = (node as unknown as { params: { loc: { start: { line: number }; end: { line: number } } }[] }).params
      // 没有参数或只有一个参数:不需要换行讨论
      if (params.length < 2) return

      const sig = computeSignatureRange(sourceCode, { params })
      if (!sig) return

      // 长度超限:要求必须是 multiple
      if (
        maxLength !== undefined &&
        sig.isSingleLine &&
        sig.text.length > maxLength
      ) {
        context.report({
          node,
          loc: reportLoc(sig),
          messageId: 'signatureTooLong',
          data: {
            length: String(sig.text.length),
            max: String(maxLength),
          },
        })
        return
      }

      if (style === 'single') {
        if (!sig.isSingleLine) {
          context.report({
            node,
            loc: reportLoc(sig),
            messageId: 'expectedSingleLine',
          })
        }
        return
      }

      if (style === 'multiple') {
        if (sig.isSingleLine) {
          context.report({
            node,
            loc: reportLoc(sig),
            messageId: 'expectedMultipleLines',
          })
          return
        }
        if (!sig.eachParamOnOwnLine) {
          context.report({
            node,
            loc: reportLoc(sig),
            messageId: 'paramShouldBeOnOwnLine',
          })
        }
        return
      }

      // style === 'consistent'
      if (!sig.isSingleLine && !sig.eachParamOnOwnLine) {
        context.report({
          node,
          loc: reportLoc(sig),
          messageId: 'expectedConsistent',
        })
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
