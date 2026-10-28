import { expect, test } from 'claude-code/testing'
import { answerFocus, openDir, pane } from './kit'

const row = (name: string, kind: 'file' | 'dir' | 'other', isLink = false) => ({ name, kind, size: 0, mtimeMs: 0, isLink })

test('a dir that cannot be listed shows the error and keeps ../', async ($, on) => {
  answerFocus(on)
  on('fs.list', (_, e) => {
    if (e.path.endsWith('/gone')) throw new Error('ENOENT: no such directory')
    return { value: [row('gone', 'dir')] }
  })
  const ui = await $.ui.mount(pane())
  await openDir($, ui, 'gone')
  expect(await ui.find({ type: 'Text', text: /^Cannot list this folder/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: '..' })).toBeDefined()
  await ui.unmount()
})

test('control: a readable dir shows no error', async ($, on) => {
  on('fs.list', () => ({ value: [row('a.txt', 'file')] }))
  const ui = await $.ui.mount(pane())
  expect(await ui.find({ type: 'Text', text: /Cannot list this folder/ })).toBeUndefined()
  await ui.unmount()
})

test('symlinks follow their target: a linked dir opens, a linked file picks, a broken link is dropped', async ($, on) => {
  on('fs.list', () => ({ value: [row('to-dir', 'other', true), row('to-file', 'other', true), row('broken', 'other', true)] }))
  on('fs.stat', (_, e) => {
    if (e.path.endsWith('/to-dir')) return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: true } }
    if (e.path.endsWith('/to-file')) return { value: { kind: 'file', size: 5, mtimeMs: 1, isLink: true } }
    return { value: { kind: 'other', size: 0, mtimeMs: 0, isLink: true } }
  })
  const ui = await $.ui.mount(pane())
  expect(await ui.find({ type: 'Button', key: 'd:to-dir' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'f:to-file' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'f:broken' })).toBeUndefined()
  expect(await ui.find({ type: 'Button', key: 'd:broken' })).toBeUndefined()
  await ui.unmount()
})

test('read-only: a whole session (navigate, hidden, sort, pick, all, accept) never writes a file', { options: { debug: true } }, async ($, on) => {
  const writes: string[] = []
  on('fs.write', (_, e) => (writes.push(e.path), { value: undefined }))
  on('fs.list', (_, e) => ({ value: e.path.endsWith('/src') ? [row('b.ts', 'file')] : [row('src', 'dir'), row('a.ts', 'file')] }))
  on('fs.exists', () => ({ value: true }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.close', () => ({ value: undefined }))
  on('prompt.fill', () => ({ isFilled: true }))
  answerFocus(on)
  const ui = await $.ui.mount(pane())
  for (const key of ['f:a.ts', 'toggle-hidden', 'sort', 'd:src']) await ui.press({ key })
  await openDir($, ui, 'src')
  for (const key of ['select-all', '..', 'accept']) await ui.press({ key })
  expect(writes).toEqual([])
  await ui.unmount()
})
