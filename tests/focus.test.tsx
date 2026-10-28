import { expect, test } from 'claude-code/testing'
import { entry, mockTree, pane } from './kit'

const badge = async (ui: { find: (q: { type: 'Text'; text: RegExp }) => Promise<{ text: string } | undefined> }) =>
  (await ui.find({ type: 'Text', text: /^[●○] / }))?.text

for (const uiLanguage of ['en', 'es'] as const) {
  test(`the path row says who holds the keyboard (${uiLanguage}); control: unfocused reads deact`, { options: { uiLanguage } }, async ($, on) => {
    mockTree(on, { '': [entry('notes.md', 'file')] })
    const focused = await $.ui.mount(pane({ isFocused: true }))
    expect(await badge(focused)).toBe('● act')
    await focused.unmount()

    const away = await $.ui.mount(pane({ isFocused: false }))
    expect(await badge(away)).toBe('○ deact')
    await away.unmount()
  })
}

test('7: ? and 8: ✕ close the toolbar after 6; the path row reads N sel | act', async ($, on) => {
  mockTree(on, { '': [entry('notes.md', 'file')] })
  const ui = await $.ui.mount(pane())
  const buttons = (await ui.findAll({ type: 'Button' })).map(b => b.text)
  // control: help and close sit right after accept, before the first list row
  expect(buttons.slice(buttons.indexOf(' ↵ '), buttons.indexOf(' ↵ ') + 4)).toEqual([' ↵ ', ' ? ', ' ✕ ', ' notes.md'])
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text)
  expect(texts.indexOf('0 sel')).toBeGreaterThan(-1)
  expect(texts.indexOf('0 sel')).toBeLessThan(texts.indexOf('● act'))
  await ui.unmount()
})

for (const [uiLanguage, hint] of [
  ['en', '7 help · 6/p/t accept · enter pick · wasd / ijkl move'],
  ['es', '7 ayuda · 6/p/t aceptar · enter marcar · wasd / ijkl mover'],
] as const) {
  test(`a dim hint closes the list (${uiLanguage}); control: the help view replaces it`, { options: { uiLanguage } }, async ($, on) => {
    mockTree(on, { '': [entry('notes.md', 'file')] })
    const ui = await $.ui.mount(pane())
    expect((await ui.find({ type: 'Text', text: hint }))?.props.dimColor).toBe(true)
    await ui.press({ key: 'help' })
    expect(await ui.find({ type: 'Text', text: hint })).toBeUndefined()
    await ui.unmount()
  })
}

for (const [files, spacer] of [[1, 34], [60, 0]] as const) {
  test(`${files} entries leave a spacer of ${spacer} rows before the hint (the hint is the bottom line; a full list leaves none)`, async ($, on) => {
    // the kit's pane: 56 columns (toolbar on 1 row), 40 body rows;
    // toolbar + divider + path row + entries + divider + hint
    mockTree(on, { '': Array.from({ length: files }, (_, i) => entry(`f${i}.md`, 'file')) })
    const ui = await $.ui.mount(pane())
    // the only Box with rows of its own is the spacer (the nav keys' Box is 0 tall)
    const tall = (await ui.findAll({ type: 'Box' })).map(b => b.props.height).filter(h => typeof h === 'number' && h > 0)
    expect(tall).toEqual(spacer > 0 ? [spacer] : [])
    await ui.unmount()
  })
}

test('a divider sets the hint apart, as one sets the toolbar apart; control: the help view hides both footer rows', async ($, on) => {
  mockTree(on, { '': [entry('notes.md', 'file')] })
  const ui = await $.ui.mount(pane())
  const dividers = async () => (await ui.findAll({ type: 'Text', text: '─'.repeat(56) })).length
  expect(await dividers()).toBe(2)
  await ui.press({ key: 'help' })
  expect(await dividers()).toBe(1)
  await ui.unmount()
})
