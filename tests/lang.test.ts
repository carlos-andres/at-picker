import { expect, test } from 'claude-code/testing'

import { helpKeys, ICONS, resolveLang, TEXT } from '../hooks/i18n'

test('uiLanguage wins; auto follows the terminal locale; English otherwise', () => {
  expect(resolveLang('auto', 'en_US.UTF-8')).toBe('en')
  expect(resolveLang('auto', 'es_CO.UTF-8')).toBe('es')
  expect(resolveLang('auto', undefined)).toBe('en')
  expect(resolveLang(undefined, 'es_ES')).toBe('es')
  expect(resolveLang('es', 'en_US.UTF-8')).toBe('es')
  expect(resolveLang('en', 'es_CO.UTF-8')).toBe('en')
})

test('every help line fits beside the 14-cell key column of the 56-cell default dock (no wrap); control: one per key', () => {
  for (const lang of ['en', 'es'] as const) {
    expect(TEXT[lang].help.length).toBe(helpKeys(ICONS.unicode).length)
    for (const line of TEXT[lang].help) expect(line.length).toBeLessThanOrEqual(56 - 14)
  }
})
