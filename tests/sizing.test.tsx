import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import { pane } from './kit'

const mocks = (on: Parameters<TestBody>[1]) => {
  on('fs.list', () => ({ value: [{ name: 'composer.json', kind: 'file', size: 1, mtimeMs: 1, isLink: false }] }))
}

test('inline + message mode shows only the notice', { options: { inlineMode: 'message' } }, async ($, on) => {
  mocks(on)
  const ui = await $.ui.mount(pane({ placement: 'inline' }))
  expect(await ui.find({ type: 'Text', text: /Not enough room/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', text: /composer\.json/ })).toBeUndefined()
  await ui.unmount()
})

test('control: inline + panel mode lists files, no notice', { options: { inlineMode: 'panel' } }, async ($, on) => {
  mocks(on)
  const ui = await $.ui.mount(pane({ placement: 'inline' }))
  expect(await ui.find({ type: 'Text', text: /Not enough room/ })).toBeUndefined()
  expect(await ui.find({ type: 'Button', text: /composer\.json/ })).toBeDefined()
  await ui.unmount()
})

test('control: docked never shows the notice, even in message mode', { options: { inlineMode: 'message' } }, async ($, on) => {
  mocks(on)
  const ui = await $.ui.mount(pane({ placement: 'dock' }))
  expect(await ui.find({ type: 'Text', text: /Not enough room/ })).toBeUndefined()
  await ui.unmount()
})

test('debug off logs nothing', { options: { debug: false } }, async ($, on) => {
  const logs: string[] = []
  on('fs.list', () => ({ value: [] }))
  on('ui.log', (_, e) => (logs.push(e.text), { value: undefined }))
  const ui = await $.ui.mount(pane({ placement: 'dock' }))
  expect(logs).toEqual([])
  await ui.unmount()
})

test('control: debug on traces the render to the debug log, with no header in the pane', { options: { debug: true } }, async ($, on) => {
  const logs: string[] = []
  on('fs.list', () => ({ value: [] }))
  on('ui.log', (_, e) => (logs.push(`${e.to}:${e.text.slice(0, 16)}`), { value: undefined }))
  const ui = await $.ui.mount(pane({ placement: 'dock' }))
  expect(await ui.find({ type: 'Text', text: /^term / })).toBeUndefined()
  expect(logs).toContain('debug:at-picker render')
  await ui.unmount()
})
