// filepath: source/index.test.ts
import { describe, it, expect } from 'vitest'
import plugin from './index'

describe('plugin shape', () => {
  it('exports the three expected rules', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual([
      'func-definition',
      'func-param-destructuring',
      'func-signature-linebreak',
    ])
  })

  it('each rule has meta and create', () => {
    for (const [name, rule] of Object.entries(plugin.rules)) {
      // plugin.rules 是 heterogeneous, Object.entries 的 value 推断为 unknown
      // 在 strict 模式下,unknown 不能直接访问属性,这里用局部断言收敛类型
      const r = rule as unknown as {
        meta: { type: string; docs: unknown }
        create: unknown
      }
      expect(r.meta, `${name} should have meta`).toBeDefined()
      expect(r.meta.type, `${name} should have meta.type`).toBeTruthy()
      expect(r.meta.docs, `${name} should have meta.docs`).toBeDefined()
      expect(typeof r.create, `${name} should have create()`).toBe('function')
    }
  })

  describe('legacy eslintrc configs', () => {
    it('exports recommended and strict', () => {
      expect(plugin.configs.recommended).toBeDefined()
      expect(plugin.configs.strict).toBeDefined()
    })

    it('legacy configs use string-array plugins and @yinxulai/peculiar namespace', () => {
      for (const cfg of [plugin.configs.recommended, plugin.configs.strict]) {
        expect(Array.isArray(cfg.plugins)).toBe(true)
        expect(cfg.plugins).toEqual(['@yinxulai/peculiar'])
        for (const key of Object.keys(cfg.rules)) {
          expect(
            key.startsWith('@yinxulai/peculiar/'),
            `legacy rule key ${key} should start with @yinxulai/peculiar/`
          ).toBe(true)
        }
      }
    })

    it('strict uses error severity on every rule', () => {
      for (const [key, value] of Object.entries(plugin.configs.strict.rules)) {
        // value 的类型是 readonly [string, ...unknown[]], 只取第一个元素即可
        expect(value[0], `rule ${key} should be 'error'`).toBe('error')
      }
    })
  })

  describe('flat config presets', () => {
    it('exports flat/recommended and flat/strict', () => {
      expect(plugin.configs['flat/recommended']).toBeDefined()
      expect(plugin.configs['flat/strict']).toBeDefined()
    })

    it('flat presets are arrays (so they can be spread into eslint.config.js)', () => {
      expect(Array.isArray(plugin.configs['flat/recommended'])).toBe(true)
      expect(Array.isArray(plugin.configs['flat/strict'])).toBe(true)
    })

    it('flat preset blocks use object plugins (not string arrays) and peculiar namespace', () => {
      const block = plugin.configs['flat/recommended'][0]!
      expect(typeof block.plugins).toBe('object')
      expect(Array.isArray(block.plugins)).toBe(false)
      expect(Object.keys(block.plugins)).toEqual(['peculiar'])
      // 自引用:注册的 plugin.rules 必须和 plugin.rules 是同一份 rule 表
      // (这样 ESLint 才能从 peculiar/xxx 解析到对应 rule)
      expect(block.plugins.peculiar.rules).toBe(plugin.rules)
    })

    it('flat preset rule keys use peculiar/ prefix', () => {
      for (const config of [
        plugin.configs['flat/recommended'],
        plugin.configs['flat/strict'],
      ]) {
        for (const block of config) {
          for (const key of Object.keys(block.rules)) {
            expect(
              key.startsWith('peculiar/'),
              `flat rule key ${key} should start with peculiar/`
            ).toBe(true)
          }
        }
      }
    })

    it('flat/recommended registers all three rules', () => {
      const block = plugin.configs['flat/recommended'][0]!
      expect(Object.keys(block.rules).sort()).toEqual([
        'peculiar/func-definition',
        'peculiar/func-param-destructuring',
        'peculiar/func-signature-linebreak',
      ])
    })

    it('flat/strict uses error severity on every rule', () => {
      const block = plugin.configs['flat/strict'][0]!
      for (const [key, value] of Object.entries(block.rules)) {
        expect(value[0], `rule ${key} should be 'error'`).toBe('error')
      }
    })
  })
})
