import { expect, test } from 'claude-code/testing'
import { entry, pane } from './kit'

const KEYS = ['toggle-hidden', 'select-all', 'select-none', 'select-clear', 'sort', 'accept', 'help', 'close'] as const

// one line needs: eight "k: " + chip Buttons (a chip pads its icon with a space each side) and 7 gaps: 56 cells,
// the default dock at 281 columns, the same in every language; a narrower dock wraps the row
for (const [icons, drawn] of [
  ['unicode', [' ◉ ', ' ☑ ', ' ☐ ', ' ⌫ ', ' ⇅n ', ' ↵ ', ' ? ', ' ✕ ']],
  ['nerd', ['  ', '  ', '  ', '  ', ' n ', ' ↵ ', ' ? ', ' ✕ ']],
] as const) {
  for (const uiLanguage of ['en', 'es'] as const) {
    test(`toolbar ${icons} chips at 56 columns (${uiLanguage})`, { options: { uiLanguage, icons } }, async ($, on) => {
      on('fs.list', () => ({ value: [] }))
      const ui = await $.ui.mount(pane({ bodyColumns: 56 }))
      const texts = await Promise.all(KEYS.map(async button => (await ui.find({ type: 'Button', key: button }))?.text ?? ''))
      expect(texts).toEqual([...drawn])
      // control: the drawn width, counted the way the engine draws a hotkey Button, fits the pane
      expect(texts.reduce((sum, t) => sum + 3 + t.length, 0) + 7).toBeLessThanOrEqual(56)
      // every option but close is a theme chip, inverse text on the inactive gray; close is on the theme's red
      for (const label of drawn.slice(0, 7)) expect((await ui.find({ type: 'Text', text: label }))?.props).toMatchObject({ color: 'inverseText', backgroundColor: 'inactive' })
      // the chips separate the options: the one | left is on the path row (N sel | act)
      expect((await ui.findAll({ type: 'Text', text: /^\|$/ })).length).toBe(1)
      await ui.unmount()
    })
  }
}

// a narrow dock draws the 8 options as a grid, not a ragged wrap (a 6+2 wrap put chip 6 under Ghostty's secure-input
// lock), and the spacer counts exactly those rows: 40 body rows minus toolbar, divider, path row, 1 file, divider and
// hint. A gap (or rowGap) would add a blank row between the rows and push the hint off a 24-row terminal
for (const [columns, rows, spacer] of [
  [56, [8], 34],
  [42, [4, 4], 33],
  [28, [4, 4], 33],
  [27, [3, 3, 2], 32],
  [24, [3, 3, 2], 32],
] as const) {
  test(`at ${columns} columns the toolbar is rows of ${rows.join('+')} and the spacer ${spacer}; control: no gap or rowGap`, async ($, on) => {
    on('fs.list', () => ({ value: [entry('notes.md', 'file')] }))
    const ui = await $.ui.mount(pane({ bodyColumns: columns }))
    const drawn: number[] = []
    for (let i = 0; ; i++) {
      const row = await ui.find({ type: 'Box', key: `toolbar-${i}` })
      if (!row) break
      expect(row.props).toMatchObject({ flexDirection: 'row', columnGap: 1 })
      expect(row.props.gap).toBeUndefined()
      expect(row.props.rowGap).toBeUndefined()
      // one glyph per chip of the default unicode set
      drawn.push((row.text.match(/[◉☑☐⌫⇅↵?✕]/g) ?? []).length)
    }
    expect(drawn).toEqual([...rows])
    const tall = (await ui.findAll({ type: 'Box' })).map(b => b.props.height).filter(h => typeof h === 'number' && h > 0)
    expect(tall).toEqual([spacer])
    await ui.unmount()
  })
}
