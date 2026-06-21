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
      { code: 'function foo(a, b) {}' },
      { code: 'const f = (a, b) => a + b' },
      { code: 'function foo(a = 1, b = 2, ...rest) {}' },
      { code: 'function foo(this: Ctx, a: number, b?: string) {} type Ctx = { id: string }' },
      { code: 'function foo(a?: number, b?: string) {}' },
      { code: 'function foo(coords: readonly [number, number]) {}' },
      { code: 'function foo(options: Readonly<{ a: number; b: number }>) {}' },
      { code: 'function foo(config: { a: number; b?: string }) {}' },
      { code: 'function foo<const T>(value: T) { return value }' },
      { code: 'class A { method(a, b) {} }' },
      { code: 'const obj = { method(a, b) {} }' },
      { code: 'function foo({ a, b }) {}', options: [{ allowIn: ['function'] }] },
      { code: 'const f = ({ a, b }) => a', options: [{ allowIn: ['arrow'] }] },
      { code: 'class A { method({ a, b }) {} }', options: [{ allowIn: ['method'] }] },
      {
        code: 'function foo({ a: { b }, c: [d, e], ...rest }: Params) {} type Params = { a: { b: number }; c: number[] }',
        options: [{ allowIn: ['function'] }],
      },
      {
        code: 'const f = ({ a: { b = 1 }, c: [d, ...rest] }: Params) => b + d',
        options: [{ allowIn: ['arrow'] }],
      },
      {
        code: 'class A { method([a, [b, c], ...rest]: number[]) {} }',
        options: [{ allowIn: ['method'] }],
      },
      {
        code: 'function foo({ a }) {}; const f = ({ b }) => b; class C { m({ c }) {} }',
        options: [{ allowIn: ['function', 'arrow', 'method'] }],
      },
    ],
    invalid: [
      {
        code: 'function foo({ a, b }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([a, b]) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a: { b, c: [d] } }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([a, [b, { c }], ...rest]) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a = 1, b: { c = 2 } = {} }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a: renamedA, b: { c: renamedC } }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ ...rest }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([head, ...tail]) {}',
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
      {
        code: 'const obj = { method([a, { b: [c] }]) {} }',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a, b }: { a: number; b: number }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a: { b }, c: [d] }: { a: { b: number }; c: number[] }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ({ a, b }) => a + b',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ({ a: { b }, c: [d, ...rest] }) => b + d',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ([a, [b, { c }]]) => a + b + c',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo(a, { b: { c } }, [d, [e]]) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a } = { a: 1 }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([a, b] = [1, 2]) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a, b }: { a: number; b: number } = { a: 1, b: 2 } as const) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo([a, b]: readonly [number, number]) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo(this: Ctx, { a }: { a: number }) {} type Ctx = { id: string }',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a }?: { a: number }) {}',
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a }) {}',
        options: [{ allowIn: ['arrow'] }],
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'function foo({ a: { b }, c: [d] }) {}',
        options: [{ allowIn: ['method'] }],
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'class A { method({ a }) {} }',
        options: [{ allowIn: ['function', 'arrow'] }],
        errors: [{ messageId: 'paramDestructuring' }],
      },
      {
        code: 'const f = ({ a: { b }, c: [d] }) => b + d',
        options: [{ allowIn: ['function', 'method'] }],
        errors: [{ messageId: 'paramDestructuring' }],
      },
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
