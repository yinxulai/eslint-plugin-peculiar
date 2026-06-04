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
 * 所有可识别的"函数式"节点类型。
 */
export type FunctionLikeNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression
  | TSESTree.MethodDefinition
  | TSESTree.TSDeclareFunction

/**
 * 根据节点类型推断它的"函数种类"。
 *
 * 注意：MethodDefinition 自身没有 params,返回值由 inner FunctionExpression 提供,
 * 因此本函数对 MethodDefinition 仍返回 `'method'`。真正的 params 检查需要走它的 value。
 */
export function getFunctionKind(node: TSESTree.Node): FunctionKind | null {
  switch (node.type) {
    case AST_NODE_TYPES.FunctionDeclaration:
    case AST_NODE_TYPES.TSDeclareFunction:
      return 'declaration'
    case AST_NODE_TYPES.FunctionExpression:
      return 'expression'
    case AST_NODE_TYPES.ArrowFunctionExpression:
      return 'arrow'
    case AST_NODE_TYPES.MethodDefinition:
      return 'method'
    default:
      return null
  }
}

/**
 * 判断节点是否"看起来像函数"（可能携带 params）。
 *
 * MethodDefinition 不直接携带 params,需要访问其 value。
 */
export function isFunctionLike(node: TSESTree.Node): node is FunctionLikeNode {
  return getFunctionKind(node) !== null
}

/**
 * 获取节点真正用来计算参数个数的内部函数节点。
 *
 * - `MethodDefinition`  → 它的 `value`（FunctionExpression）
 * - 其他                → 它自己
 */
export function getInnerFunctionNode(
  node: FunctionLikeNode,
):
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression
  | TSESTree.TSDeclareFunction {
  if (node.type === AST_NODE_TYPES.MethodDefinition) {
    // MethodDefinition.value 在 TS-ESLint 中可能是 FunctionExpression 或 TSEmptyBodyFunctionExpression
    // 两种都视作函数表达式处理
    return node.value as TSESTree.FunctionExpression
  }
  return node
}

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
