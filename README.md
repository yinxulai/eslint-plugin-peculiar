# @yinxulai/eslint-plugin-peculiar

> 一个聚焦"函数定义"相关规则的 ESLint 插件：用 TypeScript 编写。
>
> 提供三个规则：
>
> 1. **`func-definition`** — 配置允许哪些种类的函数定义
> 2. **`signature-linebreak`** — 控制函数签名的换行风格
> 3. **`param-destructuring`** — 禁止在函数参数中使用解构模式

---

## 安装

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
    "@yinxulai/peculiar/signature-linebreak": ["warn", { "style": "single" }],
    "@yinxulai/peculiar/param-destructuring": "warn"
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
      'peculiar/signature-linebreak': ['warn', { style: 'single' }],
      'peculiar/param-destructuring': 'warn',
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
| `signature-linebreak` | 不允许换行（`{ style: 'single' }`，强制签名单行） |
| `param-destructuring` | 仅允许箭头函数解构（`{ allowIn: ['arrow'] }`，function / method 仍禁用） |

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

---

### `signature-linebreak`

控制函数签名的换行风格。

| style | 行为 |
| --- | --- |
| `single`     | 签名必须一行 |
| `multiple`   | 签名必须多行，**每个参数独占一行** |
| `consistent` | 签名要么全在一行，要么多行且每个参数独占一行（默认） |

附加选项 `maxLength`：单行签名字符数超过该值时，必须改为多行（每个参数独占一行）。

```jsonc
// 强制单行(不允许换行)
{ "@yinxulai/peculiar/signature-linebreak": ["error", { "style": "single" }] }

// 强制多行,每个参数独占一行
{ "@yinxulai/peculiar/signature-linebreak": ["error", { "style": "multiple" }] }

// 允许单行,但超过 80 字符必须多行
{ "@yinxulai/peculiar/signature-linebreak": ["error", { "style": "consistent", "maxLength": 80 }] }
```

**不报错的场景**：参数 < 2 个（没东西可换行）。

---

### `param-destructuring`

禁止在函数参数中使用解构模式（`ObjectPattern` / `ArrayPattern`），包括 TypeScript 类型注解的情况。

`allowIn` 选项（数组，元素可选 `function` / `arrow` / `method`）：

| kind | 含义 | 示例 |
| --- | --- | --- |
| `function` | 顶层函数声明/表达式 | `function foo() {}` / `const foo = function () {}` |
| `arrow`    | 箭头函数 | `const foo = () => {}` |
| `method`   | 类/对象方法 | `class A { foo() {} }` / `const o = { foo() {} }` |

**默认**：全部不允许（不传该选项 = 全部禁用，与 `func-definition` 一致）。

```jsonc
// 仅允许箭头函数解构
{ "@yinxulai/peculiar/param-destructuring": ["error", { "allowIn": ["arrow"] }] }
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

---

## 开发

```bash
npm install
npm run build         # tsc → output/ (test 文件不会进 output)
npm test              # vitest 跑全部规则 + 插件结构测试
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
    param-destructuring.ts
    param-destructuring.test.ts
    signature-linebreak.ts
    signature-linebreak.test.ts
  utils/
    function-helpers.ts
```

`tsc` 通过 `tsconfig.json` 的 `exclude: ["**/*.test.ts"]` 把测试文件挡在 `output/` 外，不会污染发布包。

## 协议

ISC
