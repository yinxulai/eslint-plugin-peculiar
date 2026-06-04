// filepath: source/rules/param-destructuring.test.ts
import { describe } from 'vitest'
import { RuleTester } from 'eslint'
import * as tsParser from '@typescript-eslint/parser'
import rule from './param-destructuring'

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
})

describe('param-destructuring', () => {
  tester.run('param-destructuring', rule, {
    valid: [
      // 没有解构
      { code: 'function foo(a, b) {}' },
      { code: 'function foo(a, b = 1, ...rest) {}' },
      { code: 'const f = (a, b) => a + b' },
      { code: 'class A { method(a, b) {} }' },
      { code: 'const obj = { method(a, b) {} }' },
      { code: 'const obj = { foo: function (a, b) {} }' },

      // allowIn 允许的上下文
      { code: 'function foo({ a, b }) {}', options: [{ allowIn: ['function'] }] },
      { code: 'const f = ({ a, b }) => a', options: [{ allowIn: ['arrow'] }] },
      { code: 'class A { method({ a, b }) {} }', options: [{ allowIn: ['method'] }] },
      { code: 'const obj = { method({ a, b }) {} }', options: [{ allowIn: ['method'] }] },
      // allowIn 列出全部
      {
        code: 'function foo({ a }) {}; const f = ({ b }) => b; class C { m({ c }) {} }',
        options: [{ allowIn: ['function', 'arrow', 'method'] }],
      },
      // TS 类型注解在 allowIn 允许时也不报错
      {
        code: 'function foo({ a, b }: { a: number; b: number }) {}',
        options: [{ allowIn: ['function'] }],
      },
    ],
    invalid: [
      // 默认:全禁
      {
        code: 'function foo({ a, b }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ({ a, b }) => a + b',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'class A { method({ a, b }) {} }',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const obj = { method({ a, b }) {} }',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // 数组解构
      {
        code: 'function foo([a, b]) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ([a, b]) => a',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'class A { method([x, y]) {} }',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // TS 类型注解
      {
        code: 'function foo({ a, b }: { a: number; b: number }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([a, b]: number[]) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // allowIn 只允许部分上下文
      {
        code: 'function foo({ a }) {}',
        options: [{ allowIn: ['arrow'] }],
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ({ a }) => a',
        options: [{ allowIn: ['function'] }],
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'class A { method({ a }) {} }',
        options: [{ allowIn: ['function', 'arrow'] }],
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // 一个函数里多个解构
      {
        code: 'function foo({ a }, { b }, [c]) {}',
        errors: [
          { messageId: 'paramDestructuring' },
          { messageId: 'paramDestructuring' },
          { messageId: 'paramDestructuring' },
        ],
      },
      // 解构 + 普通参数混用
      {
        code: 'function foo(a, { b }, c, [d]) {}',
        errors: [
          { messageId: 'paramDestructuring' },
          { messageId: 'paramDestructuring' },
        ],
      },

      // 选项校验错误
      {
        code: 'function foo() {}',
        options: [{ allowIn: [] }],
        errors: [{ messageId: 'invalidAllowInOption' }],
      },
      {
        code: 'function foo() {}',
        options: [{ allowIn: ['unknown'] as never }],
        errors: [{ messageId: 'invalidAllowInOption' }],
      },
    ],
  })
})
