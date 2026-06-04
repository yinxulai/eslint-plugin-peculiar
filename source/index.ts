import funcDefinition from './rules/func-definition'
import funcSignatureLinebreak from './rules/func-signature-linebreak'
import funcParamDestructuring from './rules/func-param-destructuring'
// 直接从 package.json 读取元信息 ——
// `package.json` 与 `output/` 在发包后平级,运行时 `require('../package.json')` 能找到
import pkg from '../package.json'

/**
 * 推荐预设里的 `func-signature-linebreak` 选项 —— 强制签名单行。
 * 4 个 config(recommended / strict / flat/recommended / flat/strict)共用,
 * 抽出来避免重复字面量。
 */
const FORCE_SINGLE_LINE = { style: 'single' } as const

/**
 * 推荐预设里的 `func-param-destructuring` 选项 —— 仅允许箭头函数解构。
 * function / method 上的解构仍被禁止;4 个 config 共用。
 */
const ALLOW_ARROW_DESTRUCTURING = { allowIn: ['arrow'] } as const

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },
  rules: {
    'func-definition': funcDefinition,
    'func-signature-linebreak': funcSignatureLinebreak,
    'func-param-destructuring': funcParamDestructuring,
  },
} as const

/**
 * 默认推荐配置。
 *
 * 旧式 eslintrc 风格（兼容 ESLint < 9），通过
 * `extends: 'plugin:@yinxulai/peculiar/recommended'` 使用。
 * `plugins` 是字符串数组，rule 命名空间为 `@yinxulai/peculiar`。
 *
 * 三条规则的取向：
 * - `func-definition`            → 都允许（不传 `allow` = 4 种函数定义全开）
 * - `func-signature-linebreak`   → 不允许换行（`{ style: 'single' }`，强制签名单行）
 * - `func-param-destructuring`   → 仅允许箭头函数解构（`{ allowIn: ['arrow'] }`，
 *                                   function / method 上的解构仍被禁止）
 */
const recommended = {
  plugins: ['@yinxulai/peculiar'],
  rules: {
    '@yinxulai/peculiar/func-definition': ['warn'],
    '@yinxulai/peculiar/func-signature-linebreak': ['warn', FORCE_SINGLE_LINE],
    '@yinxulai/peculiar/func-param-destructuring': ['warn', ALLOW_ARROW_DESTRUCTURING],
  },
} as const

/**
 * 严格模式：全部按 error 报。
 *
 * 旧式 eslintrc 风格（兼容 ESLint < 9），通过
 * `extends: 'plugin:@yinxulai/peculiar/strict'` 使用。
 * rule 取向与 `recommended` 完全一致，仅严重度升级为 `error`。
 */
const strict = {
  plugins: ['@yinxulai/peculiar'],
  rules: {
    '@yinxulai/peculiar/func-definition': ['error'],
    '@yinxulai/peculiar/func-signature-linebreak': ['error', FORCE_SINGLE_LINE],
    '@yinxulai/peculiar/func-param-destructuring': ['error', ALLOW_ARROW_DESTRUCTURING],
  },
} as const

/**
 * Flat config 推荐预设（ESLint 9+）。
 *
 * 命名空间短化为 `peculiar`（与 `plugins.peculiar` 的 key 一致），
 * 预设值是数组，便于后续扩展为多块配置（如 base + parser + languageOptions）。
 *
 * 用法：
 * ```js
 * import peculiar from '@yinxulai/eslint-plugin-peculiar'
 * export default [
 *   ...peculiar.configs['flat/recommended'],
 * ]
 * ```
 */
const flatRecommended = [
  {
    plugins: { peculiar: plugin },
    rules: {
      'peculiar/func-definition': ['warn'],
      'peculiar/func-signature-linebreak': ['warn', FORCE_SINGLE_LINE],
      'peculiar/func-param-destructuring': ['warn', ALLOW_ARROW_DESTRUCTURING],
    },
  },
] as const

/**
 * Flat config 严格预设（ESLint 9+）。与 `flat/recommended` 同配置，仅 `error` 严重度。
 */
const flatStrict = [
  {
    plugins: { peculiar: plugin },
    rules: {
      'peculiar/func-definition': ['error'],
      'peculiar/func-signature-linebreak': ['error', FORCE_SINGLE_LINE],
      'peculiar/func-param-destructuring': ['error', ALLOW_ARROW_DESTRUCTURING],
    },
  },
] as const

export = {
  ...plugin,
  configs: {
    strict,
    recommended,
    'flat/strict': flatStrict,
    'flat/recommended': flatRecommended,
  },
} as const
