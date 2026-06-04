import type { Rule } from 'eslint'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

type Options = [
  {
    /**
     * 允许的最大参数数量。函数参数(包括解构、rest、TS 类型注解)超过该值即报错。
     * 默认: `4`
     */
    max?: number
  },
]

type MessageIds = 'tooManyParams'

const DEFAULT_MAX = 4

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce a maximum number of parameters in function definitions.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'integer',
            minimum: 0,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyParams:
        'Function has too many parameters ({{count}}). Maximum allowed is {{max}}.',
    },
  },
  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as Options[0]
    const max = options.max ?? DEFAULT_MAX

    function check(node: Rule.Node): void {
      if (
        node.type !== AST_NODE_TYPES.FunctionDeclaration &&
        node.type !== AST_NODE_TYPES.FunctionExpression &&
        node.type !== AST_NODE_TYPES.ArrowFunctionExpression
      ) {
        return
      }
      // 类型已缩窄到三种函数节点之一,都带 `params: Parameter[]`
      const params = (node as unknown as { params: unknown[] }).params
      if (params.length > max) {
        context.report({
          node,
          messageId: 'tooManyParams',
          data: {
            count: String(params.length),
            max: String(max),
          },
        })
      }
    }

    return {
      FunctionDeclaration: check,
      // 注意:方法(MethodDefinition)内部的 FunctionExpression 也会触发这里
      // 我们希望方法也受参数数量限制,因此这是有意为之
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    }
  },
}

export default rule
