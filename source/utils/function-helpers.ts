import { AST_NODE_TYPES } from '@typescript-eslint/utils'

/**
 * 四种"函数定义"分类：
 *
 * - `declaration`  → `function foo() {}` / `declare function foo() {}`
 * - `expression`   → `const foo = function () {}`
 * - `arrow`        → `const foo = () => {}`
 * - `method`       → `class A { foo() {} }`(MethodDefinition 的内部函数视为 method)
 */
export const FUNCTION_KINDS = [
  'declaration',
  'expression',
  'arrow',
  'method',
] as const

export type FunctionKind = (typeof FUNCTION_KINDS)[number]

/**
 * 判断一个函数的 `.parent` 是否落在"方法上下文"上：
 *   - class 方法        → 父节点是 `MethodDefinition`
 *   - 对象方法简写       → 父节点是 `Property` 且 `method === true`
 *
 * 用于在 `func-definition` / `func-param-destructuring` 中将方法内部的函数归类为 `method`。
 *
 * 入参是结构化类型 `{ parent: Node | null }`,兼容 ESTree 与 TSESTree 节点。
 */
export function isInsideMethod(node: {
  parent: { type: string; method?: boolean } | null
}): boolean {
  const parent = node.parent
  if (!parent) return false
  if (parent.type === AST_NODE_TYPES.MethodDefinition) return true
  if (parent.type === AST_NODE_TYPES.Property && parent.method === true) {
    return true
  }
  return false
}
