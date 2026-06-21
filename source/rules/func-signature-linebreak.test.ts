import { describe } from 'vitest'
import { RuleTester } from 'eslint'
import * as tsParser from '@typescript-eslint/parser'
import rule from './func-signature-linebreak'

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
})

describe('func-signature-linebreak', () => {
  describe('style: single', () => {
    tester.run('func-signature-linebreak/style-single', rule, {
      valid: [
        { code: 'function foo(a, b) {}', options: [{ style: 'single' }] },
        { code: 'const f = (a, b) => a + b', options: [{ style: 'single' }] },
        { code: 'function foo(a) {}', options: [{ style: 'single' }] },
      ],
      invalid: [
        {
          code: 'function foo(\n  a,\n  b\n) {}',
          options: [{ style: 'single' }],
          errors: [{ messageId: 'expectedSingleLine' }],
        },
        {
          code: 'const f = (\n  a,\n  b\n) => a + b',
          options: [{ style: 'single' }],
          errors: [{ messageId: 'expectedSingleLine' }],
        },
      ],
    })
  })

  describe('style: multiple', () => {
    tester.run('func-signature-linebreak/style-multiple', rule, {
      valid: [
        { code: 'function foo(\n  a,\n  b\n) {}', options: [{ style: 'multiple' }] },
        { code: 'function foo(\n  a,\n  b,\n  c\n) {}', options: [{ style: 'multiple' }] },
        { code: 'class A { method(\n  a,\n  b\n) {} }', options: [{ style: 'multiple' }] },
        { code: 'function foo(a) {}', options: [{ style: 'multiple' }] },
      ],
      invalid: [
        {
          code: 'function foo(a, b) {}',
          options: [{ style: 'multiple' }],
          errors: [{ messageId: 'expectedMultipleLines' }],
        },
        {
          code: 'const f = (a, b) => a + b',
          options: [{ style: 'multiple' }],
          errors: [{ messageId: 'expectedMultipleLines' }],
        },
        {
          code: 'function foo(\n  a, b\n) {}',
          options: [{ style: 'multiple' }],
          errors: [{ messageId: 'paramShouldBeOnOwnLine' }],
        },
        {
          code: 'class A { method(a, b) {} }',
          options: [{ style: 'multiple' }],
          errors: [{ messageId: 'expectedMultipleLines' }],
        },
      ],
    })
  })

  describe('style: consistent and defaults', () => {
    tester.run('func-signature-linebreak/style-consistent', rule, {
      valid: [
        { code: 'function foo(a, b) {}', options: [{ style: 'consistent' }] },
        { code: 'function foo(\n  a,\n  b\n) {}', options: [{ style: 'consistent' }] },
        { code: 'function foo(a, b) {}' },
        { code: 'function foo(\n  a,\n  b\n) {}' },
      ],
      invalid: [
        {
          code: 'function foo(\n  a, b\n) {}',
          options: [{ style: 'consistent' }],
          errors: [{ messageId: 'expectedConsistent' }],
        },
        {
          code: 'function foo(\n  a, b\n) {}',
          errors: [{ messageId: 'expectedConsistent' }],
        },
      ],
    })
  })

  describe('maxLength behavior', () => {
    tester.run('func-signature-linebreak/max-length', rule, {
      valid: [
        { code: 'function foo(a, b) {}', options: [{ maxLength: 50 }] },
        { code: 'function foo(a) {}', options: [{ maxLength: 1 }] },
        { code: 'function foo(\n  longArg1,\n  longArg2\n) {}', options: [{ maxLength: 10 }] },
      ],
      invalid: [
        {
          code: 'function foo(long1, long2, long3) {}',
          options: [{ maxLength: 10 }],
          errors: [{ messageId: 'signatureTooLong' }],
        },
        {
          code: 'function foo(longArgOne, longArgTwo) {}',
          options: [{ style: 'single', maxLength: 5 }],
          errors: [{ messageId: 'signatureTooLong' }],
        },
      ],
    })
  })

  describe('nested call edge cases', () => {
    tester.run('func-signature-linebreak/nested-calls', rule, {
      valid: [
        {
          code:
            'const handler = {\n' +
            '  do: () => {\n' +
            "    return server.post('/p', async request => {\n" +
            '      return { ok: true }\n' +
            '    })\n' +
            '  },\n' +
            '}',
          options: [{ style: 'single' }],
        },
        {
          code: "server.post('/p', function (\n  a,\n  b\n) {})",
          options: [{ style: 'multiple' }],
        },
      ],
      invalid: [
        {
          code: "server.post('/p', function (a, b) {})",
          options: [{ style: 'multiple' }],
          errors: [{ messageId: 'expectedMultipleLines' }],
        },
        {
          code: "server.post('/p', (a, b) => a + b)",
          options: [{ style: 'multiple' }],
          errors: [{ messageId: 'expectedMultipleLines' }],
        },
        {
          code: "server.post('/p', function (\n  a, b\n) {})",
          options: [{ style: 'consistent' }],
          errors: [{ messageId: 'expectedConsistent' }],
        },
      ],
    })
  })
})
