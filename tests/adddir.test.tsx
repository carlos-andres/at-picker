import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import { entry, focusRow, mockTree, pane } from './kit'
import type { Entry } from './kit'

// the engine hands fs.list the absolute path of an added root; the kit's mock matches it by its last part
const TREE: Record<string, Entry[]> = {
  '': [entry('slim-app', 'dir')],
  temps: [entry('index.php', 'file')],
}
const added = ($: Parameters<TestBody>[0]) => $.classic.DirectoryAdded({ directory: '/demo/temps', source: 'slash_command' })
// the tree, and an answer beneath the plugins for the classic event (a session has no settings hook to answer it)
const setup = (on: Parameters<TestBody>[1]) => {
  mockTree(on, TREE)
  on('classic.DirectoryAdded', () => ({}))
}

test('an /add-dir root shows in its own section at the root; control: none before the event', async ($, on) => {
  setup(on)
  const ui = await $.ui.mount(pane())
  expect(await ui.find({ type: 'Button', key: 'r:/demo/temps' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^── added \(\/add-dir\) ─+$/ })).toBeUndefined()

  await added($)
  expect((await ui.find({ type: 'Button', key: 'r:/demo/temps' }))?.text).toBe('└── /demo/temps/')
  expect(await ui.find({ type: 'Text', text: /^── added \(\/add-dir\) ─+$/ })).toBeDefined()
  // one blank row above the heading
  expect((await ui.findAll({ type: 'Box' })).filter(b => b.props.height === 1).length).toBe(1)
  await ui.unmount()
})

test('l opens an added root, a file there fills as an absolute @path, a goes back onto its row', async ($, on) => {
  setup(on)
  const fills: string[] = []
  on('fs.exists', () => ({ value: true }))
  on('ui.close', () => ({ value: undefined }))
  on('prompt.fill', (_, e) => (fills.push(e.text), { isFilled: true }))
  const ui = await $.ui.mount(pane())
  await added($)

  await focusRow($, 'r:/demo/temps')
  await ui.press({ key: 'nav-l' })
  expect(await ui.find({ type: 'Text', text: /^\/demo\/temps · 1/ })).toBeDefined()
  await ui.press({ key: 'f:index.php' })

  // control: going up from the added root lands on the working dir's root, not on /demo
  await ui.press({ key: 'nav-a' })
  expect(await ui.find({ type: 'Text', text: /^\.\/ · 1/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\/demo · / })).toBeUndefined()

  await ui.press({ key: 'accept' })
  expect(fills).toEqual(['@/demo/temps/index.php '])
  await ui.unmount()
})

test('Enter on an added root picks it whole as @/root/', async ($, on) => {
  setup(on)
  const fills: string[] = []
  on('fs.exists', () => ({ value: true }))
  on('ui.close', () => ({ value: undefined }))
  on('prompt.fill', (_, e) => (fills.push(e.text), { isFilled: true }))
  const ui = await $.ui.mount(pane())
  await added($)
  await ui.press({ key: 'r:/demo/temps' })
  expect((await ui.find({ type: 'Button', key: 'r:/demo/temps' }))?.text).toBe('└── /demo/temps/ ●')
  await ui.press({ key: 'accept' })
  expect(fills).toEqual(['@/demo/temps/ '])
  await ui.unmount()
})
