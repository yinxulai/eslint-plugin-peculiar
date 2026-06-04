import type { Rule } from 'eslint'
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils'
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
    /**
     * 仅在"安全"场景下提供 fix —— 即:
     * - 函数体是 BlockStatement(不是箭头表达式体)
     * - 没有 `this` 形参(避免改写挪动其它形参索引)
     * - 解构形参没有外层默认值(避免把默认值从模式上剥到 Identifier 上)
     *
     * 不满足上述条件时仍会报 `paramDestructuring`,但不带 fix。
     */
    fixable: 'code',
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

    /**
     * 提取 destructure 模式的"纯模式文本"和"TS 类型注解文本"。
     * 例:({ a, b }: Props) → patternText=`{ a, b }`, typeText=`: Props`
     * 例:[a, b]            → patternText=`[a, b]`,  typeText=``
     */
    function getPatternInfo(
      sc: Rule.RuleContext['sourceCode'],
      pattern: TSESTree.ObjectPattern | TSESTree.ArrayPattern
    ): { patternText: string; typeText: string } {
      const ta = (pattern as TSESTree.ObjectPattern).typeAnnotation
      if (ta) {
        const patternText = sc.text.slice(pattern.range[0], ta.range[0]).trim()
        const typeText = sc.text.slice(ta.range[0], ta.range[1])
        return { patternText, typeText }
      }
      // 没有类型注解时,直接按 range 切片 —— 避开 sc.getText 对 TSESTree 节点
      // 的递归类型不兼容问题
      return {
        patternText: sc.text.slice(pattern.range[0], pattern.range[1]),
        typeText: '',
      }
    }

    /**
     * 这个函数是否处于"可安全 fix"的状态。
     * 不满足的会照常报 `paramDestructuring`,但不带 fix。
     */
    function isFixable(node: FunctionLike): boolean {
      if (node.body.type !== AST_NODE_TYPES.BlockStatement) return false
      // 有 `this` 形参(TSESTree 表示成 name === 'this' 的 Identifier)时跳过 fix,
      // 改写会挪动其它形参索引
      const first = node.params[0]
      if (
        first &&
        first.type === AST_NODE_TYPES.Identifier &&
        (first as TSESTree.Identifier).name === 'this'
      ) {
        return false
      }
      for (const param of node.params) {
        if (param.type === AST_NODE_TYPES.AssignmentPattern) {
          const left = (param as TSESTree.AssignmentPattern).left
          if (
            left.type === AST_NODE_TYPES.ObjectPattern ||
            left.type === AST_NODE_TYPES.ArrayPattern
          ) {
            return false
          }
        }
      }
      return true
    }

    function buildFix(
      fixer: Rule.RuleFixer,
      sc: Rule.RuleContext['sourceCode'],
      node: FunctionLike
    ): Rule.Fix[] {
      const params = node.params
      const body = node.body as TSESTree.BlockStatement
      // 防御性:check() 只在 params 非空时才会调到这里,但 TS 推不出这一点
      if (params.length === 0) return []

      const newParamTexts: string[] = []
      const constStmts: string[] = []
      let destructIndex = 0

      for (const param of params) {
        if (
          param.type === AST_NODE_TYPES.ObjectPattern ||
          param.type === AST_NODE_TYPES.ArrayPattern
        ) {
          const name = `arg${destructIndex++}`
          const { patternText, typeText } = getPatternInfo(sc, param)
          newParamTexts.push(name + typeText)
          constStmts.push(`const ${patternText} = ${name}`)
        } else {
          // 普通形参:直接按 range 切片,避开 sc.getText 对 TSESTree 节点的
          // 递归类型不兼容问题
          newParamTexts.push(sc.text.slice(param.range[0], param.range[1]))
        }
      }

      const paramsRange: [number, number] = [
        params[0]!.range[0],
        params[params.length - 1]!.range[1],
      ]

      return [
        fixer.replaceTextRange(paramsRange, newParamTexts.join(', ')),
        fixer.insertTextAfterRange(
          [body.range[0], body.range[0] + 1],
          constStmts.join(';\n') + ';\n'
        ),
      ]
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

      const fnNode = node as FunctionLike
      const hasDestructuring = fnNode.params.some(
        (p) =>
          p.type === AST_NODE_TYPES.ObjectPattern ||
          p.type === AST_NODE_TYPES.ArrayPattern ||
          (p.type === AST_NODE_TYPES.AssignmentPattern &&
            ((p as TSESTree.AssignmentPattern).left.type ===
              AST_NODE_TYPES.ObjectPattern ||
              (p as TSESTree.AssignmentPattern).left.type ===
                AST_NODE_TYPES.ArrayPattern))
      )
      if (!hasDestructuring) return

      context.report({
        node,
        messageId: 'paramDestructuring',
        fix: (fixer) => {
          if (!isFixable(fnNode)) return null
          return buildFix(fixer, context.sourceCode, fnNode)
        },
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
