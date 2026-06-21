import type { Rule, SourceCode, AST } from 'eslint'
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils'

type SignatureStyle = 'consistent' | 'single' | 'multiple'

type Options = [
  {
    style?: SignatureStyle
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

  const anchor = sourceCode.getLastToken(
    node as unknown as Rule.Node,
    (t) => t.value !== '(' && t.value !== ')',
  )
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
  const isSingleLine = openParen.loc.end.line === closeParen.loc.start.line

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

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
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
        'Signature must be single-line. Bad: function foo(\n  a,\n  b\n) {}. Good: function foo(a, b) {}.',
      expectedMultipleLines:
        'Signature must be multi-line with one parameter per line. Bad: function foo(a, b) {}. Good: function foo(\n  a,\n  b\n) {}.',
      expectedConsistent:
        'Signature style is inconsistent. Bad: function foo(\n  a, b\n) {}. Good: function foo(a, b) {} or function foo(\n  a,\n  b\n) {}.',
      paramShouldBeOnOwnLine:
        'In multi-line signatures, each parameter must be on its own line. Bad: function foo(\n  a, b\n) {}. Good: function foo(\n  a,\n  b\n) {}.',
      signatureTooLong:
        'Signature is too long ({{length}} chars, max {{max}}). Bad: function foo(longArg1, longArg2, longArg3) {}. Good: function foo(\n  longArg1,\n  longArg2,\n  longArg3\n) {}.',
    },
  },
  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as Options[0]
    const style: SignatureStyle = options.style ?? DEFAULT_STYLE
    const maxLength = options.maxLength
    const sourceCode = context.sourceCode

    function report(node: Rule.Node, messageId: MessageIds, data?: Record<string, unknown>) {
      const fnNode = node as unknown as FunctionLike
      const sig = computeSignatureRange(sourceCode, fnNode)
      if (!sig) return

      context.report({
        node,
        loc: {
          start: sig.openParen.loc.start,
          end: sig.closeParen.loc.end,
        },
        messageId,
        data,
      })
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
      if (fnNode.params.length < 2) return

      const sig = computeSignatureRange(sourceCode, fnNode)
      if (!sig) return

      if (maxLength !== undefined && sig.isSingleLine && sig.innerText.length > maxLength) {
        report(node, 'signatureTooLong', {
          length: String(sig.innerText.length),
          max: String(maxLength),
        })
        return
      }

      if (style === 'single') {
        if (!sig.isSingleLine) report(node, 'expectedSingleLine')
        return
      }

      if (style === 'multiple') {
        if (sig.isSingleLine) {
          report(node, 'expectedMultipleLines')
          return
        }

        if (!sig.eachParamOnOwnLine) {
          report(node, 'paramShouldBeOnOwnLine')
        }
        return
      }

      if (!sig.isSingleLine && !sig.eachParamOnOwnLine) {
        report(node, 'expectedConsistent')
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
