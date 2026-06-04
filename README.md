# @yinxulai/eslint-plugin-peculiar

> 一个聚焦"函数定义"相关规则的 ESLint 插件：用 TypeScript 编写。
>
> 提供三个规则：
>
> 1. **`func-definition`** — 配置允许哪些种类的函数定义
> 2. **`signature-linebreak`** — 控制函数签名的换行风格
> 3. **`func-max-params`** — 限制函数最大参数数量

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
    "@yinxulai/peculiar/func-definition": [
      "error",
      { "allow": ["arrow", "method"] }
    ],
    "@yinxulai/peculiar/signature-linebreak": [
      "error",
      { "style": "multiple" }
    ],
    "@yinxulai/peculiar/func-max-params": ["error", { "max": 3 }]
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

```js
import peculiar from '@yinxulai/eslint-plugin-peculiar'

export default [
  {
    plugins: { '@yinxulai/peculiar': peculiar },
    rules: {
      '@yinxulai/peculiar/func-max-params': 'error',
    },
  },
]
```

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
// 强制多行,每个参数独占一行
{ "@yinxulai/peculiar/signature-linebreak": ["error", { "style": "multiple" }] }

// 允许单行,但超过 80 字符必须多行
{ "@yinxulai/peculiar/signature-linebreak": ["error", { "style": "consistent", "maxLength": 80 }] }
```

**不报错的场景**：参数 < 2 个（没东西可换行）。

---

### `func-max-params`

限制函数最大参数数量（默认 4）。类的成员方法、箭头函数、函数声明、函数表达式都会检查。

```jsonc
{ "@yinxulai/peculiar/func-max-params": ["error", { "max": 3 }] }
```

---

## 开发

```bash
npm install
npm run build         # tsc → output/ (test 文件不会进 output)
npm test              # vitest 跑全部规则 + 插件结构测试
npm run test:watch    # vitest watch 模式
```

测试栈：[**Vitest**](https://vitest.dev/) + ESLint 8 提供的 `FlatRuleTester`（在 `eslint/use-at-your-own-risk` 入口）。测试用 **TypeScript** 编写，并与对应实现文件**并列**放：

```
source/
  index.ts
  index.test.ts              # 插件结构测试
  rules/
    func-definition.ts
    func-definition.test.ts  # 规则测试
    func-max-params.ts
    func-max-params.test.ts
    signature-linebreak.ts
    signature-linebreak.test.ts
  utils/
    function-helpers.ts
```

`tsc` 通过 `tsconfig.json` 的 `exclude: ["**/*.test.ts"]` 把测试文件挡在 `output/` 外，不会污染发布包。

## 协议

ISC
