// filepath: source/rules/func-definition.test.ts
import { describe } from 'vitest'
import { RuleTester } from 'eslint'
import * as tsParser from '@typescript-eslint/parser'
import rule from './func-definition'

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
})

describe('func-definition', () => {
  tester.run('func-definition', rule, {
    valid: [
      // default (no options) - everything allowed
      { code: 'function foo() {}' },
      { code: 'const foo = function () {}' },
      { code: 'const foo = () => 1' },
      { code: 'class A { foo() {} }' },
      { code: 'class A { static bar() {} }' },
      { code: 'class A { #baz() {} }' },
      { code: 'class A { foo = () => 1 }' },
      { code: 'class A { foo = function () {} }' },

      // allow: ['arrow']
      { code: 'const foo = () => 1', options: [{ allow: ['arrow'] }] },
      { code: 'const foo = (a, b) => a + b', options: [{ allow: ['arrow'] }] },
      { code: 'class A { foo = () => 1 }', options: [{ allow: ['arrow'] }] },

      // allow: ['declaration']
      { code: 'function foo() {}', options: [{ allow: ['declaration'] }] },
      { code: 'function bar(a, b, c) {}', options: [{ allow: ['declaration'] }] },

      // allow: ['expression']
      { code: 'const foo = function () {}', options: [{ allow: ['expression'] }] },
      { code: 'const foo = function bar() {}', options: [{ allow: ['expression'] }] },

      // allow: ['method']
      { code: 'class A { foo() {} }', options: [{ allow: ['method'] }] },
      {
        code: 'const obj = { foo() {} }',
        options: [{ allow: ['method'] }],
      },
      {
        code: 'class A { foo = () => 1 }',
        options: [{ allow: ['method', 'arrow'] }],
      },

      // allow: ['declaration', 'method']
      { code: 'function foo() {}', options: [{ allow: ['declaration', 'method'] }] },
      { code: 'class A { foo() {} }', options: [{ allow: ['declaration', 'method'] }] },

      // TSDeclareFunction - 默认放行 + allow: ['declaration']
      { code: 'declare function foo(): void' },
      {
        code: 'declare function bar(): void',
        options: [{ allow: ['declaration'] }],
      },
    ],
    invalid: [
      {
        code: 'function foo() {}',
        options: [{ allow: ['arrow'] }],
        errors: [{ messageId: 'disallowedFunction' }],
      },
      {
        code: 'const foo = () => 1',
        options: [{ allow: ['declaration'] }],
        errors: [{ messageId: 'disallowedFunction' }],
      },
      {
        code: 'class A { foo() {} }',
        options: [{ allow: ['arrow'] }],
        errors: [{ messageId: 'disallowedFunction' }],
      },
      {
        code: 'const foo = function () {}',
        options: [{ allow: ['arrow', 'method'] }],
        errors: [{ messageId: 'disallowedFunction' }],
      },
      {
        code: 'const obj = { foo() {} }',
        options: [{ allow: ['arrow'] }],
        errors: [{ messageId: 'disallowedFunction' }],
      },
      // TSDeclareFunction 不在 allow 列表中
      {
        code: 'declare function foo(): void',
        options: [{ allow: ['arrow'] }],
        errors: [{ messageId: 'disallowedFunction' }],
      },
      // invalid allow option
      {
        code: 'function foo() {}',
        options: [{ allow: [] }],
        errors: [{ messageId: 'invalidAllowOption' }],
      },
      {
        code: 'function foo() {}',
        options: [{ allow: ['nope'] }],
        errors: [{ messageId: 'invalidAllowOption' }],
      },
      // multiple invalid values
      {
        code: 'function foo() {}',
        options: [{ allow: ['nope', 'also-nope'] }],
        errors: [{ messageId: 'invalidAllowOption' }],
      },
      // mixed valid + invalid
      {
        code: 'function foo() {}',
        options: [{ allow: ['arrow', 'oops'] }],
        errors: [{ messageId: 'invalidAllowOption' }],
      },
    ],
  })
})
