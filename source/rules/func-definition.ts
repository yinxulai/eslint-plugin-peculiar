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
     * @default undefined (= 全开)
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
      recommended: false,
      url: 'https://github.com/yinxulai/eslint-plugin-peculiar#func-definition',
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
      FunctionDeclaration(node) {
        if (!isAllowed('declaration')) report(node, 'declaration')
      },

      // TS 声明函数 (`TSDeclareFunction` 是 @typescript-eslint 扩展的 estree 节点,
      // ESLint `RuleListener` 联合里没有它,只能用字符串 key,所以 node 显式标注)
      'TSDeclareFunction'(node: { type: AST_NODE_TYPES.TSDeclareFunction; range: [number, number]; loc: Rule.Node['loc'] }) {
        if (!isAllowed('declaration')) report(node as unknown as Rule.Node, 'declaration')
      },

      // 箭头函数
      ArrowFunctionExpression(node) {
        if (!isAllowed('arrow')) report(node, 'arrow')
      },

      // 函数表达式 / 方法的内部函数
      FunctionExpression(node) {
        // isInsideMethod 接结构化类型,estree 节点也有 .parent
        const kind: FunctionKind = isInsideMethod(node) ? 'method' : 'expression'
        if (!isAllowed(kind)) report(node, kind)
      },
    }
  },
}

export default rule
