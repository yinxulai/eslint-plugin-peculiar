import type { Rule } from 'eslint'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import { isInsideMethod } from '../utils/function-helpers'

type AllowedContext = 'function' | 'arrow' | 'method'

type Options = [
  {
    /**
     * 允许参数解构的函数类型。
     * - `function` → 顶层 function declaration / function expression
     * - `arrow`    → 箭头函数
     * - `method`   → 类/对象方法
     *
     * 显式传入空数组会作为配置错误上报(`invalidAllowInOption`),
     * 不传该选项 = 全部不允许(与 `func-definition` 一致)。
     */
    allowIn?: AllowedContext[]
  },
]

type MessageIds = 'paramDestructuring' | 'invalidAllowInOption'

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
    },
    schema: [
      {
        type: 'object',
        properties: {
          // 不在 schema 层做 minItems / enum 强约束,留到 create() 里报错
          // (空数组、含未知值都作为 `invalidAllowInOption` 上报,而不是 schema 报错)
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
        'Destructuring in function parameters is not allowed. Use explicit parameters instead.',
      invalidAllowInOption:
        'Invalid `allowIn` option. It must be an array of one or more of: function, arrow, method.',
    },
  },
  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as Options[0]
    const rawAllowIn = options.allowIn

    // 选项校验
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

    function isAllowedContext(node: Rule.Node): boolean {
      let kind: AllowedContext
      if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
        kind = 'arrow'
      } else if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
        kind = 'function'
      } else if (node.type === AST_NODE_TYPES.FunctionExpression) {
        // method = inside MethodDefinition / Property(method=true)
        kind = isInsideMethod(node as never) ? 'method' : 'function'
      } else {
        return false
      }
      return allowSet.has(kind)
    }

    function check(node: Rule.Node): void {
      if (
        node.type !== AST_NODE_TYPES.FunctionDeclaration &&
        node.type !== AST_NODE_TYPES.FunctionExpression &&
        node.type !== AST_NODE_TYPES.ArrowFunctionExpression
      ) {
        return
      }
      if (isAllowedContext(node)) return

      const params = (node as unknown as { params: Rule.Node[] }).params
      for (const param of params) {
        if (
          param.type === AST_NODE_TYPES.ObjectPattern ||
          param.type === AST_NODE_TYPES.ArrayPattern
        ) {
          context.report({
            node: param,
            messageId: 'paramDestructuring',
          })
        }
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
