import type { Rule } from 'eslint'
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils'
import { isInsideMethod } from '../utils/function-helpers'

type AllowedContext = 'function' | 'arrow' | 'method'

type Options = [
  {
    allowIn?: AllowedContext[]
  },
]

type FunctionLike =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression

const ALLOWED_CONTEXTS: readonly AllowedContext[] = [
  'function',
  'arrow',
  'method',
] as const

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow destructuring patterns in function parameters.',
      recommended: false,
      url: 'https://github.com/yinxulai/eslint-plugin-peculiar#func-param-destructuring',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowIn: {
            type: 'array',
            items: {
              type: 'string',
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      paramDestructuring:
        'Destructuring in parameters is not allowed. Bad: function foo({ a, b }) {}. Good: function foo(params) { const { a, b } = params }.',
      invalidAllowInOption:
        'Invalid `allowIn` option. Bad: { allowIn: [] } or { allowIn: ["foo"] }. Good: { allowIn: ["arrow"] } or { allowIn: ["function", "method"] }.',
    },
  },
  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as Options[0]
    const rawAllowIn = options.allowIn

    if (rawAllowIn !== undefined) {
      if (!Array.isArray(rawAllowIn) || rawAllowIn.length === 0) {
        context.report({
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
          messageId: 'invalidAllowInOption',
        })
        return {}
      }

      const invalid = rawAllowIn.filter((c) => !ALLOWED_CONTEXTS.includes(c))
      if (invalid.length > 0) {
        context.report({
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
          messageId: 'invalidAllowInOption',
        })
        return {}
      }
    }

    const allowSet: Set<AllowedContext> = new Set(rawAllowIn ?? [])

    function classify(node: FunctionLike): AllowedContext {
      if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) return 'arrow'
      if (node.type === AST_NODE_TYPES.FunctionDeclaration) return 'function'
      return isInsideMethod(node) ? 'method' : 'function'
    }

    function hasDestructuringParam(node: FunctionLike): boolean {
      return node.params.some(
        (p) =>
          p.type === AST_NODE_TYPES.ObjectPattern ||
          p.type === AST_NODE_TYPES.ArrayPattern ||
          (p.type === AST_NODE_TYPES.AssignmentPattern &&
            (p.left.type === AST_NODE_TYPES.ObjectPattern ||
              p.left.type === AST_NODE_TYPES.ArrayPattern)),
      )
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
      if (allowSet.has(classify(fnNode))) return
      if (!hasDestructuringParam(fnNode)) return

      context.report({
        node,
        messageId: 'paramDestructuring',
      })
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    }
  },
}

export default rule
