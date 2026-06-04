import type { Rule } from 'eslint'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import {
  FUNCTION_KINDS,
  FunctionKind,
  isInsideMethod,
} from '../utils/function-helpers'

type Options = [
  {
    /**
     * 允许的函数种类。
     * - 数组:仅允许数组中列出的种类
     * - 留空(默认):全部允许
     *
     * @example ['arrow', 'method']
     */
    allow?: FunctionKind[]
  },
]

type MessageIds = 'disallowedFunction' | 'invalidAllowOption'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Configure which kinds of function definitions are allowed.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // 不在 schema 层做 minItems / enum 强约束,留到 create() 里报错
          // (空数组、含未知值都作为 `invalidAllowOption` 上报,而不是 schema 报错)
          allow: {
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
      disallowedFunction:
        'Function of kind "{{kind}}" is not allowed. Allowed kinds: [{{allowed}}].',
      invalidAllowOption:
        'Invalid `allow` option. It must be an array containing one or more of: {{kinds}}.',
    },
  },
  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as Options[0]
    const rawAllow = options.allow

    // 选项校验
    if (rawAllow !== undefined) {
      if (!Array.isArray(rawAllow) || rawAllow.length === 0) {
        context.report({
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
          messageId: 'invalidAllowOption',
          data: { kinds: FUNCTION_KINDS.join(', ') },
        })
        return {}
      }
      const invalid = rawAllow.filter((k) => !FUNCTION_KINDS.includes(k))
      if (invalid.length > 0) {
        context.report({
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
          messageId: 'invalidAllowOption',
          data: { kinds: FUNCTION_KINDS.join(', ') },
        })
        return {}
      }
    }

    const allowSet: Set<FunctionKind> = new Set(
      rawAllow ?? FUNCTION_KINDS,
    )

    function isAllowed(kind: FunctionKind): boolean {
      return allowSet.has(kind)
    }

    function report(node: Rule.Node, kind: FunctionKind): void {
      context.report({
        node,
        messageId: 'disallowedFunction',
        data: {
          kind,
          allowed: Array.from(allowSet).join(', '),
        },
      })
    }

    return {
      // 顶层声明 - FunctionDeclaration
      FunctionDeclaration(node: Rule.Node) {
        if (node.type !== AST_NODE_TYPES.FunctionDeclaration) return
        if (!isAllowed('declaration')) report(node, 'declaration')
      },

      // 顶层声明 - TSDeclareFunction
      // 注意:`TSDeclareFunction` 是 @typescript-eslint 独有的 estree 扩展,
      // ESLint v9 内置的 `Rule.Node['type']` 联合里没有它,所以这里直接信任 selector。
      TSDeclareFunction(node: Rule.Node) {
        if (!isAllowed('declaration')) report(node, 'declaration')
      },

      // 箭头函数
      ArrowFunctionExpression(node: Rule.Node) {
        if (node.type !== AST_NODE_TYPES.ArrowFunctionExpression) return
        if (!isAllowed('arrow')) report(node, 'arrow')
      },

      // 函数表达式 / 方法的内部函数
      FunctionExpression(node: Rule.Node) {
        if (node.type !== AST_NODE_TYPES.FunctionExpression) return
        // 如果父节点是 MethodDefinition,按"方法"分类
        if (isInsideMethod(node as never)) {
          if (!isAllowed('method')) report(node, 'method')
        } else {
          if (!isAllowed('expression')) report(node, 'expression')
        }
      },
    }
  },
}

export default rule
