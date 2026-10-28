import { expect, test } from 'claude-code/testing'

// the user typing /<command> at the prompt of a 120-column fullscreen terminal
const typed = (command: string) =>
  ({ command, args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } }) as const

test('/at-picker opens the pane; control: another command does not', async ($, on) => {
  const opened: string[] = []
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', (_, e) => (opened.push(e.id), { value: { isPlaced: true } }))
  on('command.run', () => ({ text: 'not ours' }))

  expect((await $.command.run(typed('at-picker'))).text).toBe('at-picker opened.')
  expect(opened).toEqual(['at-picker'])

  expect((await $.command.run(typed('other'))).text).toBe('not ours')
  expect(opened).toEqual(['at-picker'])
})

// 20% left a 142-column terminal a 28-column dock: the toolbar wrapped and the hint was cut
test('/at-picker asks a dock of 30% by default (36 of 120 columns)', async ($, on) => {
  const asked: (number | undefined)[] = []
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', (_, e) => (asked.push(e.columns), { value: { isPlaced: true } }))
  await $.command.run(typed('at-picker'))
  expect(asked).toEqual([36])
})

test('the dockWidthPercent setting sets the dock width', { options: { dockWidthPercent: 20 } }, async ($, on) => {
  const asked: (number | undefined)[] = []
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', (_, e) => (asked.push(e.columns), { value: { isPlaced: true } }))
  await $.command.run(typed('at-picker'))
  expect(asked).toEqual([24])
})

test('/at-picker closes a shown pane; control: a pane not shown opens', async ($, on) => {
  let shown = true
  const calls: string[] = []
  on('ui.panes', () => ({ value: [{ id: 'at-picker', title: 'at-picker', isShown: shown, isFocused: false, isPlaced: shown }] }))
  on('ui.open', () => (calls.push('open'), { value: { isPlaced: true } }))
  on('ui.close', () => (calls.push('close'), { value: undefined }))

  expect((await $.command.run(typed('at-picker'))).text).toBe('at-picker closed.')
  expect(calls).toEqual(['close'])

  shown = false
  expect((await $.command.run(typed('at-picker'))).text).toBe('at-picker opened.')
  expect(calls).toEqual(['close', 'open'])
})
