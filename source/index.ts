import funcDefinition from './rules/func-definition'
import signatureLinebreak from './rules/signature-linebreak'
import funcMaxParams from './rules/func-max-params'

const plugin = {
  meta: {
    name: '@yinxulai/eslint-plugin-peculiar',
    version: '1.0.0',
  },
  rules: {
    'func-definition': funcDefinition,
    'signature-linebreak': signatureLinebreak,
    'func-max-params': funcMaxParams,
  },
  configs: {
    /**
     * 默认推荐配置
     */
    recommended: {
      plugins: ['@yinxulai/peculiar'],
      rules: {
        '@yinxulai/peculiar/func-definition': [
          'warn',
          { allow: ['declaration', 'expression', 'arrow', 'method'] },
        ],
        '@yinxulai/peculiar/signature-linebreak': [
          'warn',
          { style: 'consistent' },
        ],
        '@yinxulai/peculiar/func-max-params': ['warn', { max: 4 }],
      },
    },
    /**
     * 严格模式:全部按 error 报
     */
    strict: {
      plugins: ['@yinxulai/peculiar'],
      rules: {
        '@yinxulai/peculiar/func-definition': [
          'error',
          { allow: ['declaration', 'expression', 'arrow', 'method'] },
        ],
        '@yinxulai/peculiar/signature-linebreak': [
          'error',
          { style: 'multiple', maxLength: 80 },
        ],
        '@yinxulai/peculiar/func-max-params': ['error', { max: 3 }],
      },
    },
  },
} as const

export = plugin
