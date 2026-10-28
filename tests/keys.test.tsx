import { expect, test } from 'claude-code/testing'
import { clampMiddle, mention, stepTarget } from '../hooks/list'
import { count, entry, focusRow, mockTree, pane } from './kit'
import type { Entry } from './kit'

const TREE: Record<string, Entry[]> = {
  '': [entry('slim-app', 'dir'), entry('notes.md', 'file')],
  'slim-app': [entry('composer.json', 'file')],
}

test('Enter picks a dir as dir/; 6 fills @dir/', async ($, on) => {
  mockTree(on, TREE)
  const fills: string[] = []
  on('fs.exists', (_, e) => ({ value: !e.path.endsWith('/') }))
  on('ui.close', () => ({ value: undefined }))
  on('prompt.fill', (_, e) => (fills.push(e.text), { isFilled: true }))
  const ui = await $.ui.mount(pane())

  await ui.press({ key: 'd:slim-app' })
  expect((await ui.find({ type: 'Button', key: 'd:slim-app' }))?.text).toBe('└── slim-app/ ●')
  expect(await count(ui)).toBe('1')
  // control: Enter on a dir no longer opens it
  expect(await ui.find({ type: 'Button', text: /composer\.json/ })).toBeUndefined()

  await ui.press({ key: 'accept' })
  expect(fills).toEqual(['@slim-app/ '])
  await ui.unmount()
})

for (const [open, parent] of [['nav-d', 'nav-a'], ['nav-l', 'nav-j']] as const) {
  test(`${open} opens the dir under the ring, ${parent} goes up; control: on a file and at the root they do nothing`, async ($, on) => {
    mockTree(on, TREE)
    const ui = await $.ui.mount(pane())
    const shows = async (name: RegExp) => (await ui.find({ type: 'Button', text: name })) !== undefined

    await ui.press({ key: parent })
    expect(await shows(/notes\.md/)).toBe(true)

    await focusRow($, 'f:notes.md')
    await ui.press({ key: open })
    expect(await shows(/notes\.md/)).toBe(true)

    await focusRow($, 'd:slim-app')
    await ui.press({ key: open })
    expect(await shows(/composer\.json/)).toBe(true)

    await ui.press({ key: parent })
    expect(await shows(/notes\.md/)).toBe(true)
    await ui.unmount()
  })
}

test('stepTarget walks one row and stops at both ends; off the list it starts at the first row', () => {
  const rows = ['..', 'd:a-dir', 'f:b.md']
  expect(stepTarget(rows, 'd:a-dir', 1)).toBe('f:b.md')
  expect(stepTarget(rows, 'd:a-dir', -1)).toBe('..')
  // controls: past an end nothing moves; from a toolbar button or nothing, the first row
  expect(stepTarget(rows, 'f:b.md', 1)).toBeUndefined()
  expect(stepTarget(rows, '..', -1)).toBeUndefined()
  expect(stepTarget(rows, 'sort', 1)).toBe('..')
  expect(stepTarget(rows, undefined, -1)).toBe('..')
  expect(stepTarget([], undefined, 1)).toBeUndefined()
})

test('8 closes the pane; control: nothing closes before it is pressed', async ($, on) => {
  mockTree(on, TREE)
  const closed: string[] = []
  on('ui.close', (_, e) => (closed.push(e.id), { value: undefined }))
  const ui = await $.ui.mount(pane())
  expect(closed).toEqual([])
  // the close mark is on the theme's red, like an app's
  expect((await ui.find({ type: 'Text', text: /^ ✕ $/ }))?.props).toMatchObject({ color: 'inverseText', backgroundColor: 'error' })
  await ui.press({ key: 'close' })
  expect(closed).toEqual(['at-picker'])
  await ui.unmount()
})

test('hotkeys: wasd + ijkl navigate, p t accept, 1-8 run the panel; the ring never stops on a nav key or a panel button', async ($, on) => {
  mockTree(on, TREE)
  const ui = await $.ui.mount(pane())
  const hotkey = async (key: string) => (await ui.find({ type: 'Button', key }))?.props.hotkey
  for (const k of ['w', 'a', 's', 'd', 'i', 'j', 'k', 'l', 'p', 't']) {
    expect(await hotkey(`nav-${k}`)).toBe(k)
    expect((await focusRow($, `nav-${k}`)).deny).toBeDefined()
  }
  const panel = ['toggle-hidden', 'select-all', 'select-none', 'select-clear', 'sort', 'accept', 'help', 'close']
  expect(await Promise.all(panel.map(hotkey))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  for (const button of panel) expect((await focusRow($, button)).deny).toBeDefined()
  // control: a list row takes the ring
  expect((await focusRow($, 'd:slim-app')).deny).toBeUndefined()
  await ui.unmount()
})

for (const [uiLanguage, texts] of [
  ['en', ['open or close at-picker from the prompt', 'open the folder under the cursor', 'go up to the parent folder', 'one row up', 'one row down', 'show or hide hidden files', 'sort: n name, d date, s size, t type', 'move the keyboard to the prompt and back']],
  ['es', ['abrir o cerrar at-picker desde el prompt', 'entrar en la carpeta con el foco', 'subir a la carpeta de arriba', 'subir una fila', 'bajar una fila', 'mostrar u ocultar archivos ocultos', 'orden: n nombre, f fecha, t tamaño, x tipo', 'pasar el teclado al prompt y volver']],
] as const) {
  test(`the help view lists the nav keys and each digit with its icon (${uiLanguage})`, { options: { uiLanguage } }, async ($, on) => {
    mockTree(on, TREE)
    const ui = await $.ui.mount(pane())
    await ui.press({ key: 'help' })
    for (const cell of ['↑  w  i', '↓  s  k', 'd  l', 'a  j', '1  ◉', '4  ⌫', '5  ⇅', '6  p  t  ↵', '7  ?', '8  ✕  esc', 'ctrl+x tab', '/at-picker']) {
      expect((await ui.find({ type: 'Text', text: new RegExp(`^${cell.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`) }))?.text).toBe(cell)
    }
    for (const text of texts) expect((await ui.find({ type: 'Text', text }))?.text).toBe(text)
    await ui.unmount()
  })
}

test('mention quotes only a path with whitespace, as Claude Code attaches it', () => {
  expect(mention('slim-app/a b.txt')).toBe('@"slim-app/a b.txt"')
  expect(mention('slim-app/app/')).toBe('@slim-app/app/')
  // control: a path with no space stays bare, the form every other mention uses
  expect(mention('notes.md')).toBe('@notes.md')
})

// theme keys only: a raw color, or none, read black on the dark dock of a Dark theme in a light terminal
test('a pick is success bold with a trailing ●, a dir suggestion, the connectors subtle; control: a plain file is the text color', async ($, on) => {
  mockTree(on, TREE)
  const ui = await $.ui.mount(pane())
  const text = async (t: RegExp) => (await ui.find({ type: 'Text', text: t }))?.props
  expect((await text(/^slim-app\/$/))?.color).toBe('suggestion')
  expect(await text(/^notes\.md$/)).toEqual({ color: 'text' })
  expect((await text(/^└── $/))?.color).toBe('subtle')

  await ui.press({ key: 'd:slim-app' })
  expect(await text(/^slim-app\/ ●$/)).toMatchObject({ color: 'success', bold: true })
  await ui.unmount()
})

test('the row under the ring is drawn in the plain text color, so every row highlights alike; control: off the ring it keeps its color', async ($, on) => {
  mockTree(on, TREE)
  const ui = await $.ui.mount(pane())
  const color = async () => (await ui.find({ type: 'Text', text: /^slim-app\/$/ }))?.props.color
  expect(await color()).toBe('suggestion')
  await focusRow($, 'd:slim-app')
  expect(await color()).toBe('text')
  expect((await ui.find({ type: 'Button', key: 'd:slim-app' }))?.text).toBe('└── slim-app/')
  await focusRow($, 'f:notes.md')
  expect(await color()).toBe('suggestion')
  await ui.unmount()
})

test('clampMiddle keeps a name that fits and cuts a long one in the middle to exactly the room', () => {
  const long = 'a-very-long-component-name-for-the-truncation-check-of-at-picker.config.tsx'
  expect(clampMiddle('notes.md', 55)).toBe('notes.md')
  expect(clampMiddle(long, 20)).toBe('a-very-lon…onfig.tsx')
  expect(clampMiddle(long, 20)).toHaveLength(20)
  // controls: the extension survives; a tiny room still fits
  expect(clampMiddle(long, 20).endsWith('.tsx')).toBe(true)
  expect(clampMiddle(long, 1)).toBe('…')
  expect(clampMiddle(long, 0)).toBe('')
})

test('a long file row fits the pane: indent + clamped name is the pane width', async ($, on) => {
  const long = 'a-very-long-component-name-for-the-truncation-check-of-at-picker.config.tsx'
  mockTree(on, { '': [entry(long, 'file')] })
  const ui = await $.ui.mount(pane())
  const row = (await ui.find({ type: 'Button', key: `f:${long}` }))?.text ?? ''
  expect(row).toHaveLength(56)
  expect(row).toContain('…')
  await ui.unmount()
})
