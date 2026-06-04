// filepath: source/index.test.ts
import { describe, it, expect } from 'vitest'
import plugin from './index'

describe('plugin shape', () => {
  it('exports the three expected rules', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual([
      'func-definition',
      'func-max-params',
      'signature-linebreak',
    ])
  })

  it('each rule has meta and create', () => {
    for (const [name, rule] of Object.entries(plugin.rules)) {
      expect(rule.meta, `${name} should have meta`).toBeDefined()
      expect(rule.meta.type, `${name} should have meta.type`).toBeTruthy()
      expect(rule.meta.docs, `${name} should have meta.docs`).toBeDefined()
      expect(typeof rule.create, `${name} should have create()`).toBe('function')
    }
  })

  it('exports recommended and strict configs', () => {
    expect(plugin.configs.recommended).toBeDefined()
    expect(plugin.configs.strict).toBeDefined()
    expect(typeof plugin.configs.recommended.plugins).toBe('object')
    expect(typeof plugin.configs.recommended.rules).toBe('object')
  })
})
