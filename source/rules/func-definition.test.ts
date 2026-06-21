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
  describe('default behavior', () => {
    tester.run('func-definition/default', rule, {
      valid: [
        { code: 'function foo() {}' },
        { code: 'const foo = function () {}' },
        { code: 'const foo = () => 1' },
        { code: 'class A { foo() {} }' },
        { code: 'const obj = { foo() {} }' },
        { code: 'class A { static bar() {} }' },
        { code: 'class A { #baz() {} }' },
        { code: 'const obj = { ["foo"]() {} }' },
        { code: 'declare function foo(): void' },
      ],
      invalid: [],
    })
  })

  describe('allow option classification', () => {
    tester.run('func-definition/allow-option', rule, {
      valid: [
        { code: 'const foo = () => 1', options: [{ allow: ['arrow'] }] },
        { code: 'class A { foo = () => 1 }', options: [{ allow: ['arrow'] }] },
        { code: 'function foo() {}', options: [{ allow: ['declaration'] }] },
        { code: 'declare function foo(): void', options: [{ allow: ['declaration'] }] },
        { code: 'const foo = function () {}', options: [{ allow: ['expression'] }] },
        { code: 'const obj = { foo: function () {} }', options: [{ allow: ['expression'] }] },
        { code: 'class A { foo() {} }', options: [{ allow: ['method'] }] },
        { code: 'const obj = { foo() {} }', options: [{ allow: ['method'] }] },
        { code: 'class A { foo() {} bar = () => 1 }', options: [{ allow: ['method', 'arrow'] }] },
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
        {
          code: 'declare function foo(): void',
          options: [{ allow: ['arrow'] }],
          errors: [{ messageId: 'disallowedFunction' }],
        },
        {
          code: 'const obj = { foo: function () {} }',
          options: [{ allow: ['method'] }],
          errors: [{ messageId: 'disallowedFunction' }],
        },
      ],
    })
  })

  describe('nested and mixed contexts', () => {
    tester.run('func-definition/nested-context', rule, {
      valid: [
        {
          code: 'class A { method() { const inner = () => 1; return inner } }',
          options: [{ allow: ['method', 'arrow'] }],
        },
        {
          code: 'class A { method() { function inner() {} return inner } }',
          options: [{ allow: ['method', 'declaration'] }],
        },
      ],
      invalid: [
        {
          code: 'class A { method() { const inner = function () {} } }',
          options: [{ allow: ['method'] }],
          errors: [{ messageId: 'disallowedFunction' }],
        },
        {
          code: 'class A { method() { const inner = () => 1 } }',
          options: [{ allow: ['method'] }],
          errors: [{ messageId: 'disallowedFunction' }],
        },
      ],
    })
  })

  describe('invalid options', () => {
    tester.run('func-definition/invalid-options', rule, {
      valid: [],
      invalid: [
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
        {
          code: 'function foo() {}',
          options: [{ allow: ['nope', 'also-nope'] }],
          errors: [{ messageId: 'invalidAllowOption' }],
        },
        {
          code: 'function foo() {}',
          options: [{ allow: ['arrow', 'oops'] }],
          errors: [{ messageId: 'invalidAllowOption' }],
        },
      ],
    })
  })
})
