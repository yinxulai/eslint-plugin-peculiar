import type { Rule } from 'eslint'
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils'

type FunctionLike =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression

type MessageIds = 'inlineObjectType'

type AstNodeLike = {
  type?: unknown
  [key: string]: unknown
}

function getTypeAnnotation(
  param: TSESTree.Parameter,
): TSESTree.TSTypeAnnotation | undefined {
  if (
    param.type === AST_NODE_TYPES.Identifier ||
    param.type === AST_NODE_TYPES.ObjectPattern ||
    param.type === AST_NODE_TYPES.ArrayPattern
  ) {
    return param.typeAnnotation
  }

  if (param.type === AST_NODE_TYPES.AssignmentPattern) {
    const left = param.left
    if (
      left.type === AST_NODE_TYPES.Identifier ||
      left.type === AST_NODE_TYPES.ObjectPattern ||
      left.type === AST_NODE_TYPES.ArrayPattern
    ) {
      return left.typeAnnotation
    }
  }

  if (param.type === AST_NODE_TYPES.RestElement) {
    if (param.typeAnnotation) {
      return param.typeAnnotation
    }

    const arg = param.argument
    if (
      arg.type === AST_NODE_TYPES.Identifier ||
      arg.type === AST_NODE_TYPES.ObjectPattern ||
      arg.type === AST_NODE_TYPES.ArrayPattern
    ) {
      return arg.typeAnnotation
    }
  }

  return undefined
}

function findFirstTypeLiteral(
  node: unknown,
  visited: WeakSet<object>,
): TSESTree.TSTypeLiteral | null {
  if (!node || typeof node !== 'object') return null
  if (visited.has(node)) return null
  visited.add(node)

  const astNode = node as AstNodeLike
  if (astNode.type === AST_NODE_TYPES.TSTypeLiteral) {
    return node as TSESTree.TSTypeLiteral
  }

  for (const [key, value] of Object.entries(astNode)) {
    if (key === 'parent') continue
    if (!value) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findFirstTypeLiteral(item, visited)
        if (found) return found
      }
      continue
    }

    const found = findFirstTypeLiteral(value, visited)
    if (found) return found
  }

  return null
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow declaring object literal types directly in function parameter signatures.',
      recommended: false,
      url: 'https://github.com/yinxulai/eslint-plugin-peculiar#func-param-inline-object-type',
    },
    schema: [],
    messages: {
      inlineObjectType:
        'Do not declare object literal types directly in parameter signatures. Bad: function help(params: { a: 1; b: 2 }) {}. Good: type HelpParams = { a: 1; b: 2 }; function help(params: HelpParams) {}.',
    },
  },
  create(context: Rule.RuleContext) {
    function check(node: Rule.Node) {
      if (
        node.type !== AST_NODE_TYPES.FunctionDeclaration &&
        node.type !== AST_NODE_TYPES.FunctionExpression &&
        node.type !== AST_NODE_TYPES.ArrowFunctionExpression
      ) {
        return
      }

      const fnNode = node as unknown as FunctionLike
      for (const param of fnNode.params) {
        const typeAnnotation = getTypeAnnotation(param)
        if (!typeAnnotation) continue

        const typeLiteral = findFirstTypeLiteral(
          typeAnnotation.typeAnnotation,
          new WeakSet<object>(),
        )
        if (typeLiteral) {
          context.report({
            node: typeLiteral,
            messageId: 'inlineObjectType',
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
