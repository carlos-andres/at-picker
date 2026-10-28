import { expect, test } from 'claude-code/testing'
import { entry, mockTree, pane, openDir } from './kit'
import type { Entry } from './kit'

const TREE: Record<string, Entry[]> = {
  '': [entry('slim-app', 'dir'), entry('notes.md', 'file')],
  'slim-app': [entry('public', 'dir'), entry('composer.json', 'file')],
  'slim-app/public': [entry('index.php', 'file')],
}

test('enter a dir, go deeper, come back with ..', async ($, on) => {
  mockTree(on, TREE)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount(pane({ surface }))
    expect(await ui.find({ type: 'Button', key: '..' })).toBeUndefined()

    await openDir($, ui, 'slim-app')
    expect((await ui.find({ type: 'Button', text: /composer\.json/ }))?.text).toBe(' composer.json')

    await openDir($, ui, 'public')
    expect((await ui.find({ type: 'Button', text: /index\.php/ }))?.text).toBe(' index.php')

    await ui.press({ key: '..' })
    await ui.press({ key: '..' })
    expect((await ui.find({ type: 'Button', text: /notes\.md/ }))?.text).toBe(' notes.md')
    // focus placement is checked by hand in a terminal: ui.focus never reaches a test hook here
    await ui.unmount()
  }
})
