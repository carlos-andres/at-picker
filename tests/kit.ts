import type { TestBody } from 'claude-code/testing'

type On = Parameters<TestBody>[1]
type Kind = 'file' | 'dir' | 'other'
export type Entry = { name: string; kind: Kind; size: number; mtimeMs: number; isLink: boolean }

// the at-picker Pane as the engine hands it to ui.render
export const pane = ({
  bodyColumns = 56,
  placement = 'dock',
  surface = 'terminal',
  isFocused = true,
}: { bodyColumns?: number; placement?: 'dock' | 'inline'; surface?: 'terminal' | 'desktop'; isFocused?: boolean } = {}) => ({
  plugin: 'at-picker',
  component: 'Pane' as const,
  requestId: 'at-picker',
  surface,
  props: { title: 'at-picker', isFocused, bodyColumns, placement, scroll: { offset: 0, bodyRows: 40 }, view: {} },
})

export const entry = (name: string, kind: Kind, more: Partial<Omit<Entry, 'name' | 'kind'>> = {}): Entry => ({
  name,
  kind,
  size: 0,
  mtimeMs: 0,
  isLink: false,
  ...more,
})

// the engine hands fs.* hooks an absolute path under the working dir: list the deepest key it ends with
export const mockTree = (on: On, tree: Record<string, Entry[]>) => {
  const keyOf = (path: string) =>
    Object.keys(tree)
      .filter(k => k !== '' && path.endsWith(`/${k}`))
      .sort((x, y) => y.length - x.length)[0] ?? ''
  on('fs.list', (_, e) => ({ value: tree[keyOf(e.path)] ?? [] }))
  answerFocus(on)
}

// nothing beneath the plugins answers a ring move in a test; register before the first $ call
export const answerFocus = (on: On) => on('ui.focus', () => ({}))

// the "N sel" count on the path row
export const count = async (ui: { find: (q: { type: 'Text'; text: RegExp }) => Promise<{ text: string } | undefined> }) =>
  (await ui.find({ type: 'Text', text: / sel$/ }))?.text.match(/(\d+) sel$/)?.[1]

// the user moves the pane's ring onto a row, as the engine raises it; the test answers the move itself
export const focusRow = ($: Parameters<TestBody>[0], key: string) =>
  $.ui.focus({ component: 'Pane', requestId: 'at-picker', plugin: 'at-picker', element: key, origin: { kind: 'person' } })

// l (or d) on a dir row: what Enter did before Enter picked dirs
export const openDir = async ($: Parameters<TestBody>[0], ui: { press: (t: { key: string }) => Promise<unknown> }, name: string) => {
  await focusRow($, `d:${name}`)
  await ui.press({ key: 'nav-l' })
}
