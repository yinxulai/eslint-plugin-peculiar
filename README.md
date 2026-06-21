# @yinxulai/eslint-plugin-peculiar

> 一个聚焦"函数定义"相关规则的 ESLint 插件：用 TypeScript 编写。
>
> 提供四个规则：
>
> 1. **`func-definition`** — 配置允许哪些种类的函数定义
> 2. **`func-signature-linebreak`** — 控制函数签名的换行风格
> 3. **`func-param-destructuring`** — 禁止在函数参数中使用解构模式
> 4. **`func-param-inline-object-type`** — 禁止在函数参数签名中直接写对象字面量类型

---

## 安装

要求 **ESLint ≥ 8.40**(用到了 `context.sourceCode` 等较新的 API)。

```bash
npm install --save-dev @yinxulai/eslint-plugin-peculiar eslint
```

## 使用

### 旧式配置 (`.eslintrc`)

```jsonc
{
  "plugins": ["@yinxulai/peculiar"],
  "rules": {
    "@yinxulai/peculiar/func-definition": "warn",
    "@yinxulai/peculiar/func-signature-linebreak": ["warn", { "style": "single" }],
    "@yinxulai/peculiar/func-param-destructuring": "warn",
    "@yinxulai/peculiar/func-param-inline-object-type": "warn"
  }
}
```

或使用预设：

```jsonc
{
  "extends": ["plugin:@yinxulai/peculiar/recommended"]
  // 或 "plugin:@yinxulai/peculiar/strict"
}
```

### Flat 配置 (`eslint.config.js`)

使用预设（推荐，命名空间短化为 `peculiar`）：

```js
import peculiar from '@yinxulai/eslint-plugin-peculiar'

export default [
  ...peculiar.configs['flat/recommended'],
  // 或者: ...peculiar.configs['flat/strict']
]
```

或手动注册插件并按需配置（命名空间必须和 `plugins` 的 key 一致）：

```js
import peculiar from '@yinxulai/eslint-plugin-peculiar'

export default [
  {
    plugins: { peculiar },
    rules: {
      'peculiar/func-definition': 'warn',
      'peculiar/func-signature-linebreak': ['warn', { style: 'single' }],
      'peculiar/func-param-destructuring': 'warn',
      'peculiar/func-param-inline-object-type': 'warn',
    },
  },
]
```

---

## 预设

`recommended` / `flat/recommended` 与 `strict` / `flat/strict` 的 rule 配置完全一致，**仅严重度不同**（`warn` vs `error`）：

| 规则 | 行为 |
| --- | --- |
| `func-definition` | 都允许（不传 `allow` = 4 种函数定义全开） |
| `func-signature-linebreak` | 不允许换行（`{ style: 'single' }`，强制签名单行） |
| `func-param-destructuring` | 仅允许箭头函数解构（`{ allowIn: ['arrow'] }`，function / method 仍禁用） |
| `func-param-inline-object-type` | 禁止在参数类型注解中直接写对象字面量类型（如 `params: { a: 1 }`） |

> `func-definition` 与 `func-param-destructuring` 的"默认方向"是**相反**的：
> - `func-definition` 不传 `allow` = 4 种函数定义都允许
> - `func-param-destructuring` 不传 `allowIn` = 全部禁止
>
> 原因：前者的目标是"白名单"(开箱即用),后者的目标是"黑名单"(更严的代码规范)。

---

## 覆盖范围

所有规则都基于 **ESLint/ESTree 的函数节点** 触发，Visitor 访问以下节点类型：

| 节点类型 | 覆盖说明 |
| --- | --- |
| `FunctionDeclaration`     | 顶层 `function foo() {}` 声明 |
| `FunctionExpression`      | `const f = function () {}` 表达式，及 class/object 方法**内部**的函数 |
| `ArrowFunctionExpression` | `const f = () => {}` 箭头函数 |
| `TSDeclareFunction`       | `declare function foo(): void` TS 声明(仅 `func-definition` 视为 `declaration`) |

**类与对象方法**:`class A { foo() {} }` 里的 `foo` 是 `FunctionExpression`,其 `.parent` 是 `MethodDefinition`,会被归类为 `method`。`const o = { foo() {} }` 里的 `foo` 同理(`.parent` 是 `Property`,且 `method === true`)。

**嵌套函数**:Visitor 会**递归**访问嵌套函数,但分类时只看**直接父节点**(`isInsideMethod`)。

---

## 规则

### `func-definition`

配置允许的函数定义种类。

`allow` 选项（数组，元素可选 `declaration` / `expression` / `arrow` / `method`）：

| kind | 含义 | 示例 |
| --- | --- | --- |
| `declaration` | 函数声明 | `function foo() {}` |
| `expression`  | 函数表达式 | `const foo = function () {}` |
| `arrow`       | 箭头函数 | `const foo = () => {}` |
| `method`      | 类/对象方法 | `class A { foo() {} }` |

**默认**：全部允许。

```jsonc
// 禁用函数声明和函数表达式,只允许箭头和方法
{ "@yinxulai/peculiar/func-definition": ["error", { "allow": ["arrow", "method"] }] }
```

> 数组为空 = 全部禁用。
> 数组含未知值(非 `declaration` / `expression` / `arrow` / `method`)会作为配置错误上报 `invalidAllowOption`,而不是 schema 报错。

---

### `func-signature-linebreak`

控制函数签名的换行风格。

| style | 行为 |
| --- | --- |
| `single`     | 签名必须一行 |
| `multiple`   | 签名必须多行，**每个参数独占一行** |
| `consistent` | 签名要么全在一行，要么多行且每个参数独占一行（默认） |

附加选项 `maxLength`：单行签名字符数超过该值时，必须改为多行（每个参数独占一行）。**计算的是 `(` 与 `)` 之间(不含括号本身)的字符数,含注释。** 显式写了 `style: 'single'` + `maxLength` 时,过长依然会触发 `signatureTooLong` 并自动修复为多行。

```jsonc
// 强制单行(不允许换行)
{ "@yinxulai/peculiar/func-signature-linebreak": ["error", { "style": "single" }] }

// 强制多行,每个参数独占一行
{ "@yinxulai/peculiar/func-signature-linebreak": ["error", { "style": "multiple" }] }

// 允许单行,但超过 80 字符必须多行
{ "@yinxulai/peculiar/func-signature-linebreak": ["error", { "style": "consistent", "maxLength": 80 }] }
```

**不报错的场景**：参数 < 2 个（没东西可换行）。

本规则不提供自动修复,仅通过错误或 warning 提示你手动调整签名格式。

---

### `func-param-destructuring`

禁止在函数参数中使用解构模式（`ObjectPattern` / `ArrayPattern`），包括 TypeScript 类型注解的情况。

`allowIn` 选项（数组，元素可选 `function` / `arrow` / `method`）：

| kind | 含义 | 示例 |
| --- | --- | --- |
| `function` | 顶层函数声明/表达式 | `function foo() {}` / `const foo = function () {}` |
| `arrow`    | 箭头函数 | `const foo = () => {}` |
| `method`   | 类/对象方法 | `class A { foo() {} }` / `const o = { foo() {} }` |

**默认**：全部不允许（不传该选项 = 全部禁用，与 `func-definition` 默认方向相反）。

```jsonc
// 仅允许箭头函数解构
{ "@yinxulai/peculiar/func-param-destructuring": ["error", { "allowIn": ["arrow"] }] }
```

**示例**：

```ts
// ❌ 报错
function Test({ a, b, c }: Props) {}
const handler = ({ event }) => doSomething(event)
class A { method([x, y]) {} }

// ✅ 不报错（重写为显式参数）
function Test(props: Props) { const { a, b, c } = props }
const handler = (event) => doSomething(event)
class A { method(coord) {} }
```

> - 同时检查 `ObjectPattern` 和 `ArrayPattern`：`function f([a, b]) {}` 也会被禁止。
> - TypeScript 类型注解不影响检查：`function f({ a }: { a: string }) {}` 仍然报错（param 节点本身就是 `ObjectPattern`）。
> - 解构出来的属性是否被使用不在本规则范围，使用官方的 [`no-unused-vars`](https://eslint.org/docs/latest/rules/no-unused-vars)。
> - 用途之一是绕过 [`max-params`](https://eslint.org/docs/latest/rules/max-params) 计数 —— `function f({a, b, c, d, e})` 在官方 `max-params` 里只算 1 个参数，启用本规则可强制显式书写。

本规则不提供自动修复,仅通过错误或 warning 提示你手动改写为显式参数。

---

### `func-param-inline-object-type`

禁止在函数参数签名中直接写对象字面量类型。

```ts
// ❌ 报错
function help(params: { a: 1; b: 2 }) {}
class A { help(params: { a: number; b: number }) {} }

// ✅ 建议写法
type HelpParams = { a: 1; b: 2 }
function help(params: HelpParams) {}
```

本规则适用于普通函数、箭头函数、类方法、对象方法，也适用于解构参数上的类型注解（例如 `function f({ a }: { a: number }) {}`）。

本规则不提供自动修复,仅通过错误或 warning 引导你提取 `type`/`interface` 后再引用。

---

## 开发

```bash
npm install
npm run build         # tsc → output/ (test 文件不会进 output)
npm test              # pretest (tsc --noEmit) + vitest 跑全部规则 + 插件结构测试
npm run coverage      # 附带 v8 覆盖率报告
```

测试栈：[**Vitest**](https://vitest.dev/) + ESLint 9 提供的 `RuleTester`（从 `eslint` 直接 import）。测试用 **TypeScript** 编写，并与对应实现文件**并列**放：

```
source/
  index.ts
  index.test.ts                # 插件结构测试
  rules/
    func-definition.ts
    func-definition.test.ts    # 规则测试
    func-param-destructuring.ts
    func-param-destructuring.test.ts
    func-signature-linebreak.ts
    func-signature-linebreak.test.ts
  utils/
    function-helpers.ts
```

`tsc` 通过 `tsconfig.json` 的 `exclude: ["**/*.test.ts"]` 把测试文件挡在 `output/` 外，不会污染发布包。`npm test` 走 `pretest` hook 跑 `tsc --noEmit`,确保发布前类型已干净。

## 协议

ISC
