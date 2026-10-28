import { expect, test } from 'claude-code/testing'
import { pane } from './kit'

const file = (name: string, size: number, mtimeMs: number) => ({ name, kind: 'file' as const, size, mtimeMs, isLink: false })
const dir = (name: string) => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })
const LIST = [file('b.txt', 10, 300), dir('src'), file('a10.md', 500, 100), file('Zeta', 1, 400), dir('Lib'), file('a2.md', 50, 200)]

test('s cycles name -> date -> size -> kind -> name; dirs stay first by name', { options: { uiLanguage: 'es' } }, async ($, on) => {
  on('fs.list', () => ({ value: LIST }))
  // wide enough for the full Spanish toolbar (66 cells)
  const ui = await $.ui.mount(pane({ bodyColumns: 70 }))
  const rows = async () =>
    (await ui.findAll({ type: 'Button' }))
      // list rows are keyed d:<name> / f:<name>; toolbar buttons and ../ are not
      .filter(row => /^[df]:/.test(row.key ?? ''))
      .map(row => row.text.replace(/^([├└]── | )/, ''))
  const sortLabel = async () => (await ui.find({ type: 'Button', key: 'sort' }))?.text

  // natural, case-insensitive: a2 before a10, Zeta after b
  expect(await sortLabel()).toBe(' ⇅n ')
  expect(await rows()).toEqual(['Lib/', 'src/', 'a2.md', 'a10.md', 'b.txt', 'Zeta'])

  await ui.press({ key: 'sort' })
  expect(await sortLabel()).toBe(' ⇅f ')
  expect(await rows()).toEqual(['Lib/', 'src/', 'Zeta', 'b.txt', 'a2.md', 'a10.md'])

  await ui.press({ key: 'sort' })
  expect(await sortLabel()).toBe(' ⇅t ')
  expect(await rows()).toEqual(['Lib/', 'src/', 'a10.md', 'a2.md', 'b.txt', 'Zeta'])

  await ui.press({ key: 'sort' })
  expect(await sortLabel()).toBe(' ⇅x ')
  // no extension first, then md, then txt
  expect(await rows()).toEqual(['Lib/', 'src/', 'Zeta', 'a2.md', 'a10.md', 'b.txt'])

  await ui.press({ key: 'sort' })
  expect(await sortLabel()).toBe(' ⇅n ')
  await ui.unmount()
})

for (const sortDirs of [true, false]) {
  test(`sortDirs ${sortDirs}: by date, dirs ${sortDirs ? 'newest first (time from fs.stat)' : 'stay by name (control)'}; dirs stay first`, { options: { sortDirs } }, async ($, on) => {
    on('fs.list', () => ({ value: [dir('a-old'), dir('b-new'), file('z.md', 1, 50)] }))
    on('fs.stat', (_, e) => ({ value: { kind: 'dir', size: 0, mtimeMs: e.path.endsWith('/b-new') ? 900 : 100, isLink: false } }))
    const ui = await $.ui.mount(pane())
    await ui.press({ key: 'sort' })
    const names = (await ui.findAll({ type: 'Button' })).map(b => b.text.replace(/^([├└]── | )/, '')).filter(t => ['a-old/', 'b-new/', 'z.md'].includes(t))
    expect(names).toEqual(sortDirs ? ['b-new/', 'a-old/', 'z.md'] : ['a-old/', 'b-new/', 'z.md'])
    await ui.unmount()
  })
}
