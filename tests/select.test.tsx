import { expect, test } from 'claude-code/testing'
import { count as selCount, entry, mockTree, pane, openDir } from './kit'
import type { Entry } from './kit'

const TREE: Record<string, Entry[]> = {
  '': [entry('slim-app', 'dir'), entry('notes.md', 'file')],
  'slim-app': [entry('composer.json', 'file')],
}

test('Enter toggles a file; the selection survives directory changes', async ($, on) => {
  // the engine hands fs.* hooks an absolute path under the working dir
  mockTree(on, TREE)
  const ui = await $.ui.mount(pane())
  const row = async (name: RegExp) => (await ui.find({ type: 'Button', text: name }))?.text
  const count = () => selCount(ui)

  expect(await row(/notes\.md/)).toBe(' notes.md')
  await ui.press({ key: 'f:notes.md' })
  expect(await row(/notes\.md/)).toBe(' notes.md ●')
  expect(await count()).toBe('1')

  await openDir($, ui, 'slim-app')
  await ui.press({ key: 'f:composer.json' })
  expect(await row(/composer\.json/)).toBe(' composer.json ●')
  expect(await count()).toBe('2')

  await ui.press({ key: '..' })
  expect(await row(/notes\.md/)).toBe(' notes.md ●')

  await ui.press({ key: 'f:notes.md' })
  expect(await row(/notes\.md/)).toBe(' notes.md')
  expect(await count()).toBe('1')
  await ui.unmount()
})
