import funcDefinition from './rules/func-definition'
import signatureLinebreak from './rules/signature-linebreak'
import paramDestructuring from './rules/param-destructuring'

const plugin = {
  meta: {
    name: '@yinxulai/eslint-plugin-peculiar',
    version: '1.0.0',
  },
  rules: {
    'func-definition': funcDefinition,
    'signature-linebreak': signatureLinebreak,
    'param-destructuring': paramDestructuring,
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
 * - `func-definition`     → 都允许（不传 `allow` = 4 种函数定义全开）
 * - `signature-linebreak` → 不允许换行（`{ style: 'single' }`，强制签名单行）
 * - `param-destructuring` → 不允许参数解构（不传 `allowIn` = 全部禁用）
 */
const recommended = {
  plugins: ['@yinxulai/peculiar'],
  rules: {
    '@yinxulai/peculiar/func-definition': ['warn'],
    '@yinxulai/peculiar/signature-linebreak': ['warn', { style: 'single' }],
    '@yinxulai/peculiar/param-destructuring': ['warn'],
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
    '@yinxulai/peculiar/signature-linebreak': ['error', { style: 'single' }],
    '@yinxulai/peculiar/param-destructuring': ['error'],
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
      'peculiar/signature-linebreak': ['warn', { style: 'single' }],
      'peculiar/param-destructuring': ['warn'],
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
      'peculiar/signature-linebreak': ['error', { style: 'single' }],
      'peculiar/param-destructuring': ['error'],
    },
  },
] as const

export = {
  ...plugin,
  configs: {
    recommended,
    strict,
    'flat/recommended': flatRecommended,
    'flat/strict': flatStrict,
  },
} as const
