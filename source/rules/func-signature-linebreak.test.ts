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

      // ---- 嵌套箭头函数(无外层括号)在外层 call 内:fix 不应误伤外层 ----
      // 1 参无括号箭头 `async request => {...}` 嵌在 `server.post('...', ...)` 内。
      // v1.0.2 的 `getOpenCloseParen` 找 `request` 之前的 `(` 时拿到外层 `.post(` 的
      // 括号,把两者之间所有内容(包括函数体)压成一行,破坏代码。
      // 修复后:1 参(以及 0 参)都不应触发签名检查,无论 style 是什么。
      {
        code:
          'const handler = {\n' +
          '  do: () => {\n' +
          "    return server.post('/p', async request => {\n" +
          '      return { ok: true }\n' +
          '    })\n' +
          '  },\n' +
          '}',
        options: [{ style: 'multiple' }],
      },
      {
        // 同上,但用 recommended preset 的 `style: 'single'` —— 这才是 v1.0.2 触发 bug 的现场
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
      // 0 参无括号箭头 + 外层 call:同样不应误伤
      {
        code: "server.post('/p', () => {\n  return 1\n})",
        options: [{ style: 'multiple' }],
      },
      {
        code: "server.post('/p', () => {\n  return 1\n})",
        options: [{ style: 'single' }],
      },

      // ---- 2 参 + outer call:`(` 紧贴 first/last,理论上不会跨外层;
      // 显式 fixture 防止 in-node 防御退化 ----
      // 2 参 + outer call + style: 'multiple' + 正确 multiline own-line
      { code: "server.post('/p', function (\n  a,\n  b\n) {})", options: [{ style: 'multiple' }] },
      // 2 参 + outer call + style: 'single' + 单行
      { code: "server.post('/p', function (a, b) {})", options: [{ style: 'single' }] },
      // arrow 2 参 + outer call + style: 'multiple' + 正确
      { code: "server.post('/p', (\n  a,\n  b\n) => a + b)", options: [{ style: 'multiple' }] },
      // 深度 nested (2 层 call + function)
      { code: "server.post('/p', server.foo(function (\n  a,\n  b\n) {}))", options: [{ style: 'multiple' }] },
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

      // ---- 2 参 + outer call:4 个 fix 方向都应在嵌套场景下正确 ----
      // (in-node 范围限制理论上让 2 参路径安全 —— `(` 紧贴 first;
      //  显式 fixture 防回归,覆盖全部 fix 方向 + 多种 node 形式)

      // expectedMultipleLines:2 参 + outer call + style: 'multiple' + 单行
      {
        code: "server.post('/p', function (a, b) {})",
        output: "server.post('/p', function (\n  a,\n  b\n) {})",
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
      // expectedSingleLine:2 参 + outer call + style: 'single' + 多行
      // (注意:fix 范围 = `function (...)` 内部,不是外层 `.post(...)` 之间)
      {
        code: "server.post('/p', function (\n  a,\n  b\n) {})",
        output: "server.post('/p', function (a, b) {})",
        options: [{ style: 'single' }],
        errors: [{ messageId: 'expectedSingleLine' }],
      },
      // paramShouldBeOnOwnLine:2 参 + outer call + style: 'multiple' + 多行但参数未分行
      {
        code: "server.post('/p', function (\n  a, b\n) {})",
        output: "server.post('/p', function (\n  a,\n  b\n) {})",
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'paramShouldBeOnOwnLine' }],
      },
      // expectedConsistent:2 参 + outer call + style: 'consistent' + 多行但参数未分行
      {
        code: "server.post('/p', function (\n  a, b\n) {})",
        output: "server.post('/p', function (\n  a,\n  b\n) {})",
        options: [{ style: 'consistent' }],
        errors: [{ messageId: 'expectedConsistent' }],
      },
      // signatureTooLong:2 参 + outer call + maxLength + 单行
      {
        code: "server.post('/p', function (longArg1, longArg2) {})",
        output: "server.post('/p', function (\n  longArg1,\n  longArg2\n) {})",
        options: [{ maxLength: 10 }],
        errors: [{ messageId: 'signatureTooLong' }],
      },
      // arrow 2 参 + outer call + style: 'multiple' + 单行
      {
        code: "server.post('/p', (a, b) => a + b)",
        output: "server.post('/p', (\n  a,\n  b\n) => a + b)",
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
      // TS 类型注解 + outer call + style: 'multiple' + 单行
      {
        code: "server.post('/p', function (a: number, b: string) {})",
        output: "server.post('/p', function (\n  a: number,\n  b: string\n) {})",
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
      // 3 参 + outer call + style: 'multiple' + 单行
      {
        code: "server.post('/p', function (a, b, c) {})",
        output: "server.post('/p', function (\n  a,\n  b,\n  c\n) {})",
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
      // 深度 nested:server.post → server.foo → function
      {
        code: "server.post('/p', server.foo(function (a, b) {}))",
        output: "server.post('/p', server.foo(function (\n  a,\n  b\n) {}))",
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
      // unsafe:2 参 + outer call + 参数之间有注释 + style: 'multiple'
      // (验证 unsafe 护栏在嵌套场景下也工作)
      {
        code: "server.post('/p', function (a, /* x */ b) {})",
        output: null,
        options: [{ style: 'multiple' }],
        errors: [{ messageId: 'expectedMultipleLines' }],
      },
    ],
  })
})
