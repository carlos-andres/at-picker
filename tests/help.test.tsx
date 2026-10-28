import { expect, test } from 'claude-code/testing'
import { entry, pane } from './kit'

test('7 swaps the file list for the key list, 7 again brings the list back', async ($, on) => {
  on('fs.list', () => ({ value: [entry('composer.json', 'file', { size: 1, mtimeMs: 1 })] }))
  const ui = await $.ui.mount(pane())
  const has = async (text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined
  const file = async () => (await ui.find({ type: 'Button', text: /composer\.json/ })) !== undefined

  expect(await file()).toBe(true)
  expect(await has(/^Keys$/)).toBe(false)

  await ui.press({ key: 'help' })
  expect(await has(/^Keys$/)).toBe(true)
  expect(await has(/move the keyboard to the prompt and back/)).toBe(true)
  expect(await file()).toBe(false)

  await ui.press({ key: 'help' })
  expect(await file()).toBe(true)
  expect(await has(/^Keys$/)).toBe(false)
  await ui.unmount()
})
