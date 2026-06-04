// filepath: source/rules/signature-linebreak.test.ts
import { describe } from 'vitest'
import { RuleTester } from 'eslint'
import * as tsParser from '@typescript-eslint/parser'
import rule from './signature-linebreak'

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
})

describe('signature-linebreak', () => {
  tester.run('signature-linebreak', rule, {
    valid: [
      // fewer than 2 params => never reports
      { code: 'function foo() {}', options: [{ style: 'multiple' }] },
      { code: 'function foo(a) {}', options: [{ style: 'multiple' }] },
      { code: 'const f = (a) => a', options: [{ style: 'multiple' }] },
      { code: 'function foo() {}', options: [{ style: 'single' }] },
      { code: 'function foo(a) {}', options: [{ style: 'single' }] },

      // style: 'single'
      { code: 'function foo(a, b) {}', options: [{ style: 'single' }] },
      { code: 'function foo(a, b, c) {}', options: [{ style: 'single' }] },
      { code: 'const f = (a, b) => a + b', options: [{ style: 'single' }] },

      // style: 'multiple'
      { code: 'function foo(\n  a,\n  b\n) {}', options: [{ style: 'multiple' }] },
      { code: 'function foo(\n  a,\n  b,\n  c\n) {}', options: [{ style: 'multiple' }] },
      { code: 'const f = (\n  a,\n  b\n) => a + b', options: [{ style: 'multiple' }] },

      // style: 'consistent' (matches whatever the source is)
      { code: 'function foo(a, b) {}', options: [{ style: 'consistent' }] },
      { code: 'function foo(\n  a,\n  b\n) {}', options: [{ style: 'consistent' }] },

      // maxLength
      { code: 'function foo(a, b) {}', options: [{ maxLength: 50 }] },
      {
        code: 'function foo(long1, long2, long3) {}',
        options: [{ maxLength: 100 }],
      },
    ],
    invalid: [
      // style: 'multiple' but single-line
      {
        code: 'function foo(a, b) {}',
        output: 'function foo(\n  a,\n  b\n) {}',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
      {
        code: 'const f = (a, b) => a + b',
        output: 'const f = (\n  a,\n  b\n) => a + b',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },

      // style: 'single' but multi-line
      {
        code: 'function foo(\n  a,\n  b\n) {}',
        output: 'function foo(a, b) {}',
        options: [{ style: 'single' }],
        errors: [{ messageId: 'expectedSingleLine' }],
      },

      // style: 'multiple' but not every param on own line
      {
        code: 'function foo(\n  a, b\n) {}',
        output: 'function foo(\n  a,\n  b\n) {}',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'paramShouldBeOnOwnLine' }],
      },

      // style: 'consistent' but not consistent
      {
        code: 'function foo(\n  a, b\n) {}',
        output: 'function foo(\n  a,\n  b\n) {}',
        options: [{ style: 'consistent' }],
        errors: [{ messageId: 'expectedConsistent' }],
      },

      // maxLength
      {
        code: 'function foo(long1, long2, long3) {}',
        output: 'function foo(\n  long1,\n  long2,\n  long3\n) {}',
        options: [{ maxLength: 10 }],
        errors: [{ messageId: 'signatureTooLong' }],
      },
    ],
  })
})
