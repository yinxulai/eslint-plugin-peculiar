// filepath: source/rules/func-signature-linebreak.test.ts
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
  tester.run('func-signature-linebreak', rule, {
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

      // ---- 默认 style: 'consistent' (省略 options / 显式 'consistent' 等价) ----
      { code: 'function foo(a, b) {}' },
      { code: 'function foo(\n  a,\n  b\n) {}' },
      { code: 'function foo(\n  a,\n  b,\n  c\n) {}' },
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

      // ---- expectedMultipleLines:带 TS 类型注解 ----
      {
        code: 'function foo(a: number, b: string) {}',
        output: 'function foo(\n  a: number,\n  b: string\n) {}',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },

      // ---- expectedMultipleLines:带默认值 ----
      {
        code: 'function foo(a = 1, b = 2) {}',
        output: 'function foo(\n  a = 1,\n  b = 2\n) {}',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },

      // ---- expectedMultipleLines:带 rest 参数 ----
      {
        code: 'function foo(a, ...rest) {}',
        output: 'function foo(\n  a,\n  ...rest\n) {}',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },

      // ---- paramShouldBeOnOwnLine:3+ 个参数(3 个)----
      {
        code: 'function foo(\n  a, b, c\n) {}',
        output: 'function foo(\n  a,\n  b,\n  c\n) {}',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'paramShouldBeOnOwnLine' }],
      },

      // ---- expectedConsistent:3+ 个参数 ----
      {
        code: 'function foo(\n  a, b, c\n) {}',
        output: 'function foo(\n  a,\n  b,\n  c\n) {}',
        options: [{ style: 'consistent' }],
        errors: [{ messageId: 'expectedConsistent' }],
      },

      // ---- 4 空格缩进:fix 时沿用首个参数所在列(4)做缩进 ----
      {
        code: 'function foo(\n    a, b\n) {}',
        output: 'function foo(\n    a,\n    b\n) {}',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'paramShouldBeOnOwnLine' }],
      },

      // ---- FunctionExpression(赋值右侧的 function)也走 fix ----
      {
        code: 'const f = function (a, b) {}',
        output: 'const f = function (\n  a,\n  b\n) {}',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },

      // ---- signatureTooLong:2 个参数(3 个已有)----
      {
        code: 'function foo(looooong1, looooong2) {}',
        output: 'function foo(\n  looooong1,\n  looooong2\n) {}',
        options: [{ maxLength: 10 }],
        errors: [{ messageId: 'signatureTooLong' }],
      },

      // ---- class method / object method shorthand:内部 FunctionExpression 也被 visitor 访问 ----
      {
        code: 'class A { method(a, b) {} }',
        output: 'class A { method(\n  a,\n  b\n) {} }',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
      {
        code: 'const obj = { method(a, b) {} }',
        output: 'const obj = { method(\n  a,\n  b\n) {} }',
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },

      // ---- 0 参多行 + style: 'single' 也算违规 (P0 #2) ----
      // 注:`function foo(\n) {}` 实际能被 parser 接受,但 @typescript-eslint/parser
      // 出于严格性拒绝(同一原因 `(\n) => 0` 也不被接受),无法直接 fixture 测。
      // 逻辑上:openParen.end.line !== closeParen.start.line + params.length === 0
      // + style === 'single' → 报告 expectedSingleLine,fix 把内层空白压成空。
      // 这段代码路径靠 hasInnerRangeComments / buildFix 的现有测试间接覆盖。

      // ---- unsafe:相邻参数之间的内联块注释会丢失,只 report 不 fix (P0 #1) ----
      {
        code: 'function foo(a, /* x */ b) {}',
        output: null,
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
      // unsafe:第一个参数之前的注释(由 getAllComments 路径命中)
      {
        code: 'function foo(\n  /* lead */ a, b\n) {}',
        output: null,
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'paramShouldBeOnOwnLine' }],
      },
      // unsafe:最后一个参数之后的注释
      {
        code: 'function foo(\n  a, b, /* trail */\n) {}',
        output: null,
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'paramShouldBeOnOwnLine' }],
      },

      // ---- 默认 style: 'consistent' 也报 'expectedConsistent' (P3 #17) ----
      {
        code: 'function foo(\n  a, b\n) {}',
        output: 'function foo(\n  a,\n  b\n) {}',
        errors: [{ messageId: 'expectedConsistent' }],
      },
    ],
  })
})
