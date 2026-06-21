import { describe } from 'vitest'
import { RuleTester } from 'eslint'
import * as tsParser from '@typescript-eslint/parser'
import rule from './func-param-inline-object-type'

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
})

describe('func-param-inline-object-type', () => {
  tester.run('func-param-inline-object-type', rule, {
    valid: [
      { code: 'type Params = { a: 1; b: 2 }; function help(params: Params) {}' },
      { code: 'interface Params { a: 1; b: 2 } function help(params: Params) {}' },
      { code: 'const f = (params: string) => params' },
      { code: 'function help(params: Record<string, unknown>) {}' },
      { code: 'class A { help(params: Params) {} } type Params = { a: 1; b: 2 }' },
      { code: 'function help({ a, b }: Params) {} type Params = { a: number; b: number }' },
      { code: 'function help(params: Foo | Bar) {} type Foo = string; type Bar = number' },
      { code: 'function help(params: Readonly<HelpParams>) {} type HelpParams = { a: number; b: number }' },
      { code: 'function help(params: Promise<HelpParams[]>) {} type HelpParams = { a: number }' },
      { code: 'function help(...params: HelpParams[]) {} type HelpParams = { a: number }' },
      { code: 'function help(params: [HelpA, HelpB]) {} type HelpA = { a: number }; type HelpB = { b: number }' },
      { code: 'const help = (params: (a: number) => HelpParams) => params(1); type HelpParams = { a: number }' },
      { code: 'function help(params: Partial<HelpParams> & Readonly<HelpParams>) {} type HelpParams = { a: number }' },
    ],
    invalid: [
      {
        code: 'function help(params: { a: 1; b: 2 }) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'const help = (params: { a: 1; b: 2 }) => params.a',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'class A { help(params: { a: 1; b: 2 }) {} }',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'const obj = { help(params: { a: 1; b: 2 }) {} }',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help({ a }: { a: number }) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: { a: number } = { a: 1 }) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: { a: number } | HelpParams) {} type HelpParams = { b: number }',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: HelpA & { b: number }) {} type HelpA = { a: number }',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: Readonly<{ a: number; b: number }>) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: Array<{ a: number }>) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: ({ a: number })) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: { [key: string]: number }) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: { nested: { a: number } }) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(params: (a: number) => { a: number }) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help(...params: { a: number }[]) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'function help({ a }: Readonly<{ a: number }>) {}',
        errors: [{ messageId: 'inlineObjectType' }],
      },
      {
        code: 'const help = ({ a }: { a: number } | { b: number }) => a',
        errors: [{ messageId: 'inlineObjectType' }],
      },
    ],
  })
})
