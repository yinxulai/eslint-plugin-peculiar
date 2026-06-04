import funcDefinition from './rules/func-definition'
import funcSignatureLinebreak from './rules/func-signature-linebreak'
import funcParamDestructuring from './rules/func-param-destructuring'
// 直接从 package.json 读取元信息 ——
// `package.json` 与 `output/` 在发包后平级,运行时 `require('../package.json')` 能找到
import pkg from '../package.json'

/**
 * 4 个 config(recommended / strict / flat/recommended / flat/strict)共用的规则选项。
 * 提到顶层避免 4 份字面量散落各处。
 */
const FORCE_SINGLE_LINE = { style: 'single' } as const
const ALLOW_ARROW_DESTRUCTURING = { allowIn: ['arrow'] } as const

const NAMESPACE_OLD = '@yinxulai/peculiar' as const
const NAMESPACE_FLAT = 'peculiar' as const

type Severity = 'warn' | 'error'

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
 * 旧式 eslintrc 配置(ESLint < 9)。
 *
 * 三条规则的取向：
 * - `func-definition`            → 都允许(不传 `allow` = 4 种函数定义全开)
 * - `func-signature-linebreak`   → 不允许换行(`{ style: 'single' }`,强制签名单行)
 * - `func-param-destructuring`   → 仅允许箭头函数解构(`{ allowIn: ['arrow'] }`,
 *                                   function / method 上的解构仍被禁止)
 *
 * @param severity `warn` / `error` —— `recommended` / `strict` 区别仅在此
 */
function eslintrcConfig(severity: Severity) {
  return {
    plugins: [NAMESPACE_OLD],
    rules: {
      [`${NAMESPACE_OLD}/func-definition`]: [severity],
      [`${NAMESPACE_OLD}/func-signature-linebreak`]: [
        severity,
        FORCE_SINGLE_LINE,
      ],
      [`${NAMESPACE_OLD}/func-param-destructuring`]: [
        severity,
        ALLOW_ARROW_DESTRUCTURING,
      ],
    },
  } as const
}

/**
 * Flat config(ESLint 9+)。返回值是数组,便于后续扩展为多块配置
 * (base + parser + languageOptions 等)。
 *
 * @param severity `warn` / `error` —— `flat/recommended` / `flat/strict` 区别仅在此
 */
function flatConfig(severity: Severity) {
  return [
    {
      plugins: { [NAMESPACE_FLAT]: plugin },
      rules: {
        [`${NAMESPACE_FLAT}/func-definition`]: [severity],
        [`${NAMESPACE_FLAT}/func-signature-linebreak`]: [
          severity,
          FORCE_SINGLE_LINE,
        ],
        [`${NAMESPACE_FLAT}/func-param-destructuring`]: [
          severity,
          ALLOW_ARROW_DESTRUCTURING,
        ],
      },
    },
  ] as const
}

export = {
  ...plugin,
  configs: {
    recommended: eslintrcConfig('warn'),
    strict: eslintrcConfig('error'),
    'flat/recommended': flatConfig('warn'),
    'flat/strict': flatConfig('error'),
  },
} as const
