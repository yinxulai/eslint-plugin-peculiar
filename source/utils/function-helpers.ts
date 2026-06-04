import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils'

/**
 * 四种"函数定义"分类：
 *
 * - `declaration`  → `function foo() {}` / `declare function foo() {}`
 * - `expression`   → `const foo = function () {}`
 * - `arrow`        → `const foo = () => {}`
 * - `method`       → `class A { foo() {} }`（MethodDefinition 的内部函数视为 method）
 */
export const FUNCTION_KINDS = [
  'declaration',
  'expression',
  'arrow',
  'method',
] as const

export type FunctionKind = (typeof FUNCTION_KINDS)[number]

/**
 * 判断一个 FunctionExpression 是否属于一个"方法"上下文：
 *   - class 方法  → 父节点是 `MethodDefinition`
 *   - 对象方法简写 → 父节点是 `Property` 且 `method === true`
 *
 * 用于在 `func-definition` 中将方法内部的函数归类为 `method` 而非 `expression`。
 */
export function isInsideMethod(node: TSESTree.FunctionExpression): boolean {
  const parent = node.parent
  if (!parent) return false
  if (parent.type === AST_NODE_TYPES.MethodDefinition) return true
  if (
    parent.type === AST_NODE_TYPES.Property &&
    (parent as TSESTree.Property).method === true
  ) {
    return true
  }
  return false
}
