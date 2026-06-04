// filepath: source/rules/func-max-params.test.ts
import { describe } from 'vitest'
import { RuleTester } from 'eslint'
import * as tsParser from '@typescript-eslint/parser'
import rule from './func-max-params'

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
})

describe('func-max-params', () => {
  tester.run('func-max-params', rule, {
    valid: [
      // default max=4
      { code: 'function foo() {}' },
      { code: 'function foo(a) {}' },
      { code: 'function foo(a, b) {}' },
      { code: 'function foo(a, b, c) {}' },
      { code: 'function foo(a, b, c, d) {}' },
      { code: 'const f = (a, b, c, d) => 1' },

      // custom max
      { code: 'function foo(a, b, c) {}', options: [{ max: 3 }] },
      { code: 'const f = (a, b) => a + b', options: [{ max: 2 }] },
      { code: 'function foo() {}', options: [{ max: 0 }] },

      // method definition
      { code: 'class A { foo(a, b) {} }' },
      { code: 'class A { foo(a, b, c, d, e) {} }', options: [{ max: 5 }] },

      // function expression
      { code: 'const f = function (a, b) {}' },
    ],
    invalid: [
      {
        code: 'function foo(a, b, c, d) {}',
        options: [{ max: 3 }],
        errors: [{ messageId: 'tooManyParams' }],
      },
      {
        code: 'const f = (a, b, c, d, e) => 1',
        options: [{ max: 4 }],
        errors: [{ messageId: 'tooManyParams' }],
      },
      {
        code: 'function foo(a, b, c, d, e) {}' /* default max=4 */,
        errors: [{ messageId: 'tooManyParams' }],
      },
      {
        code: 'class A { foo(a, b, c, d) {} }',
        options: [{ max: 2 }],
        errors: [{ messageId: 'tooManyParams' }],
      },
    ],
  })
})
