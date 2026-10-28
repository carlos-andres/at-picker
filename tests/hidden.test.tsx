import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import { entry, pane } from './kit'

const mocks = (on: Parameters<TestBody>[1]) => {
  on('fs.list', () => ({ value: [entry('.github', 'dir'), entry('src', 'dir'), entry('.gitignore', 'file'), entry('composer.json', 'file')] }))
}

const shows = async (ui: { find: (q: { type: 'Text' | 'Button'; text: RegExp }) => Promise<unknown> }, name: RegExp, type: 'Text' | 'Button') =>
  (await ui.find({ type, text: name })) !== undefined

test('dotfiles hidden by default; h shows them; h again hides them', { options: { showHidden: false } }, async ($, on) => {
  mocks(on)
  const ui = await $.ui.mount(pane())
  expect(await shows(ui, /\.gitignore$/, 'Button')).toBe(false)
  expect(await shows(ui, /\.github\/$/, 'Button')).toBe(false)
  expect(await shows(ui, /composer\.json$/, 'Button')).toBe(true)

  await ui.press({ key: 'toggle-hidden' })
  expect(await shows(ui, /\.gitignore$/, 'Button')).toBe(true)
  expect(await shows(ui, /\.github\/$/, 'Button')).toBe(true)

  await ui.press({ key: 'toggle-hidden' })
  expect(await shows(ui, /\.gitignore$/, 'Button')).toBe(false)
  await ui.unmount()
})

test('control: showHidden setting on lists dotfiles from the start', { options: { showHidden: true } }, async ($, on) => {
  mocks(on)
  const ui = await $.ui.mount(pane())
  expect(await shows(ui, /\.gitignore$/, 'Button')).toBe(true)
  expect(await shows(ui, /\.github\/$/, 'Button')).toBe(true)
  await ui.unmount()
})
