// filepath: source/rules/func-param-destructuring.test.ts
import { describe } from 'vitest'
import { RuleTester } from 'eslint'
import * as tsParser from '@typescript-eslint/parser'
import rule from './func-param-destructuring'

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
})

describe('func-param-destructuring', () => {
  tester.run('func-param-destructuring', rule, {
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

      // ---- 箭头函数 block 体(可 fix,与表达式体对比) ----
      {
        code: 'const f = ({ a, b }) => { return a + b }',
        output: 'const f = (arg0) => {const { a, b } = arg0;\n return a + b }',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- `this` 形参:报错但不带 fix(TS 表示成 name === 'this' 的 Identifier)----
      {
        code: 'function foo(this, { a, b }) {}',
        output: null,
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo(this: SomeCtx, { a, b }: Props) {}',
        output: null,
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 解构形参带默认值:报错但不带 fix(避免把默认值从 Pattern 上剥到 Identifier)----
      {
        code: 'function foo({ a, b } = {}) {}',
        output: null,
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([a, b] = [1, 2]) {}',
        output: null,
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo(a, { b } = { b: 1 }) {}',
        output: null,
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 非空函数体也能 fix(const 插入到 `{` 之后)----
      {
        code: 'function foo({ a, b }) { return a + b }',
        output: 'function foo(arg0) {const { a, b } = arg0;\n return a + b }',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- rest 参数:fix 时按 range 切片保留 ----
      {
        code: 'function foo({ a }, ...rest) {}',
        output: 'function foo(arg0, ...rest) {const { a } = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo(a, { b }, ...rest) {}',
        output: 'function foo(a, arg0, ...rest) {const { b } = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- FunctionExpression(赋值右侧的 function)也走 fix ----
      {
        code: 'const f = function ({ a, b }) { return a + b }',
        output: 'const f = function (arg0) {const { a, b } = arg0;\n return a + b }',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 嵌套解构（nested destructuring）----
      {
        code: 'function foo({ a: { b } }) {}',
        output: 'function foo(arg0) {const { a: { b } } = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 带重命名的对象解构 ----
      {
        code: 'function foo({ a: newA, b: newB }) {}',
        output: 'function foo(arg0) {const { a: newA, b: newB } = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 数组解构带rest ----
      {
        code: 'function foo([a, ...rest]) {}',
        output: 'function foo(arg0) {const [a, ...rest] = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 对象解构带rest ----
      {
        code: 'function foo({ a, ...rest }) {}',
        output: 'function foo(arg0) {const { a, ...rest } = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 空数组解构 ----
      {
        code: 'function foo([]) {}',
        output: 'function foo(arg0) {const [] = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 空对象解构 ----
      {
        code: 'function foo({}) {}',
        output: 'function foo(arg0) {const {} = arg0;\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },

      // ---- 已有多行格式的函数体 ----
      {
        code: 'function foo({ a, b }) {\n  const c = 1\n  return a + b + c\n}',
        output: 'function foo(arg0) {  const { a, b } = arg0;\n\n  const c = 1\n  return a + b + c\n}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
    ],
  })
})
