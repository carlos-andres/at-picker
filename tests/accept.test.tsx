import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import { count as selCount, entry, mockTree, pane, openDir } from './kit'
import type { Entry } from './kit'

const TREE: Record<string, Entry[]> = {
  '': [entry('slim-app', 'dir'), entry('notes.md', 'file'), entry('q"uote.txt', 'file'), entry('sp ace "q".txt', 'file')],
  'slim-app': [entry('composer.json', 'file')],
}

const engine = (on: Parameters<TestBody>[1], isFilled: boolean, gone: string[] = []) => {
  const calls: string[] = []
  on('fs.exists', (_, e) => ({ value: !gone.some(g => e.path.endsWith(`/${g}`)) }))
  mockTree(on, TREE)
  on('ui.toast', (_, e) => (calls.push(`toast ${e.text}`), { value: undefined }))
  on('ui.close', (_, e) => (calls.push(`close ${e.id}`), { value: undefined }))
  on('prompt.fill', (_, e) => (calls.push(`fill ${e.mode} ${JSON.stringify(e.text)}`), isFilled ? { isFilled } : { isFilled, refusal: 'dialog' as const }))
  return calls
}

test('6 closes the pane, then fills one @path per pick, then clears the pick', async ($, on) => {
  const calls = engine(on, true)
  const ui = await $.ui.mount(pane())
  const count = () => selCount(ui)

  await ui.press({ key: 'f:notes.md' })
  await openDir($, ui, 'slim-app')
  await ui.press({ key: 'f:composer.json' })
  await ui.press({ key: 'accept' })

  expect(calls).toEqual(['close at-picker', 'fill insert "@notes.md @slim-app/composer.json "'])
  expect(await count()).toBe('0')
  await ui.unmount()
})

test('control: nothing picked, 6 does nothing', async ($, on) => {
  const calls = engine(on, true)
  const ui = await $.ui.mount(pane())
  await ui.press({ key: 'accept' })
  expect(calls).toEqual([])
  await ui.unmount()
})

test('control: a refused fill keeps the pick', async ($, on) => {
  const calls = engine(on, false)
  const ui = await $.ui.mount(pane())
  const count = () => selCount(ui)
  await ui.press({ key: 'f:notes.md' })
  await ui.press({ key: 'accept' })
  // the engine strips a refusal a hook writes itself (only its own carry one), so the toast names none
  expect(calls).toEqual(['close at-picker', 'fill insert "@notes.md "', 'toast at-picker: could not write to the prompt (unknown reason)'])
  expect(await count()).toBe('1')
  await ui.unmount()
})

test('6 drops a pick deleted since it was picked', async ($, on) => {
  const calls = engine(on, true, ['notes.md'])
  const ui = await $.ui.mount(pane())
  await ui.press({ key: 'f:notes.md' })
  await openDir($, ui, 'slim-app')
  await ui.press({ key: 'f:composer.json' })
  await ui.press({ key: 'accept' })
  expect(calls).toEqual(['close at-picker', 'fill insert "@slim-app/composer.json "'])
  await ui.unmount()
})

test('control: every pick deleted, 6 keeps the pane open and fills nothing', async ($, on) => {
  const calls = engine(on, true, ['notes.md'])
  const ui = await $.ui.mount(pane())
  await ui.press({ key: 'f:notes.md' })
  await ui.press({ key: 'accept' })
  expect(calls).toEqual(['toast at-picker: the picked files no longer exist'])
  await ui.unmount()
})

// Claude Code reads a `"` in a bare mention, but a name with both a space and a `"` has no form it reads
test('6 leaves out a pick with a space and a double quote and says so; control: a bare name with a quote stays', async ($, on) => {
  const calls = engine(on, true)
  const ui = await $.ui.mount(pane())
  await ui.press({ key: 'f:q"uote.txt' })
  await ui.press({ key: 'f:sp ace "q".txt' })
  await ui.press({ key: 'accept' })
  expect(calls).toEqual([
    'toast at-picker: left out 1 pick: a name with both a space and a double quote cannot be @mentioned',
    'close at-picker',
    'fill insert "@q\\"uote.txt "',
  ])
  await ui.unmount()
})

test('control: only unmentionable picks, 6 keeps the pane open and fills nothing', async ($, on) => {
  const calls = engine(on, true)
  const ui = await $.ui.mount(pane())
  await ui.press({ key: 'f:sp ace "q".txt' })
  await ui.press({ key: 'accept' })
  expect(calls).toEqual(['toast at-picker: left out 1 pick: a name with both a space and a double quote cannot be @mentioned'])
  await ui.unmount()
})

for (const k of ['p', 't']) {
  test(`${k} accepts like 6 (p pick, t take)`, async ($, on) => {
    const calls = engine(on, true)
    const ui = await $.ui.mount(pane())
    expect((await ui.find({ type: 'Button', key: `nav-${k}` }))?.props.hotkey).toBe(k)
    await ui.press({ key: 'f:notes.md' })
    await ui.press({ key: `nav-${k}` })
    expect(calls).toEqual(['close at-picker', 'fill insert "@notes.md "'])
    await ui.unmount()
  })
}
