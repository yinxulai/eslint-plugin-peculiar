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
      // ---- function declaration,带 fix ----
      {
        code: 'function foo({ a, b }) {}',
        output: 'function foo(arg0) {const { a, b } = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([a, b]) {}',
        output: 'function foo(arg0) {const [a, b] = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- class method,带 fix ----
      {
        code: 'class A { method({ a, b }) {} }',
        output: 'class A { method(arg0) {const { a, b } = arg0;\n} }',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'class A { method([x, y]) {} }',
        output: 'class A { method(arg0) {const [x, y] = arg0;\n} }',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- object method shorthand,带 fix ----
      {
        code: 'const obj = { method({ a, b }) {} }',
        output: 'const obj = { method(arg0) {const { a, b } = arg0;\n} }',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- TS 类型注解,带 fix ----
      {
        code: 'function foo({ a, b }: { a: number; b: number }) {}',
        output:
          'function foo(arg0: { a: number; b: number }) {const { a, b } = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([a, b]: number[]) {}',
        output: 'function foo(arg0: number[]) {const [a, b] = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 箭头函数表达式体 —— 不带 fix(body 不是 BlockStatement) ----
      {
        code: 'const f = ({ a, b }) => a + b',
        output: null,
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ([a, b]) => a',
        output: null,
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- allowIn 只允许部分上下文 ----
      {
        code: 'function foo({ a }) {}',
        options: [{ allowIn: ['arrow'] }],
        output: 'function foo(arg0) {const { a } = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ({ a }) => a',
        options: [{ allowIn: ['function'] }],
        output: null,
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'class A { method({ a }) {} }',
        options: [{ allowIn: ['function', 'arrow'] }],
        output: 'class A { method(arg0) {const { a } = arg0;\n} }',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 一个函数里多个解构,带 fix ----
      {
        code: 'function foo({ a }, { b }, [c]) {}',
        output:
          'function foo(arg0, arg1, arg2) {const { a } = arg0;\nconst { b } = arg1;\nconst [c] = arg2;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      // ---- 解构 + 普通参数混用,带 fix ----
      {
        code: 'function foo(a, { b }, c, [d]) {}',
        output:
          'function foo(a, arg0, c, arg1) {const { b } = arg0;\nconst [d] = arg1;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 选项校验错误(不走 fix 路径) ----
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
