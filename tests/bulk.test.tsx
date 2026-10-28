import { expect, test } from 'claude-code/testing'
import { count as selCount, entry, mockTree, pane, openDir } from './kit'
import type { Entry } from './kit'

const TREE: Record<string, Entry[]> = {
  '': [entry('slim-app', 'dir')],
  'slim-app': [entry('public', 'dir'), entry('composer.json', 'file'), entry('README.md', 'file'), entry('.gitignore', 'file')],
  'slim-app/public': [entry('index.php', 'file'), entry('.htaccess', 'file')],
}

test('a selects this dir, n clears only this dir, c clears everything', async ($, on) => {
  mockTree(on, TREE)
  const ui = await $.ui.mount(pane())
  const count = () => selCount(ui)

  await openDir($, ui, 'slim-app')
  await ui.press({ key: 'select-all' })
  // hidden .gitignore is not shown, so a leaves it out
  expect(await count()).toBe('2')

  await openDir($, ui, 'public')
  await ui.press({ key: 'f:index.php' })
  expect(await count()).toBe('3')

  await ui.press({ key: 'select-none' })
  expect(await count()).toBe('2')

  await ui.press({ key: '..' })
  expect((await ui.find({ type: 'Button', text: /composer\.json/ }))?.text).toBe(' composer.json ●')

  await ui.press({ key: 'select-clear' })
  expect(await count()).toBe('0')
  expect((await ui.find({ type: 'Button', text: /composer\.json/ }))?.text).toBe(' composer.json')
  await ui.unmount()
})
