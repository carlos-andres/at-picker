import type { FsEntry } from 'claude-code'

import type { SortBy } from '../types'

const byName = (a: FsEntry, b: FsEntry) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
const extOf = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}
const ORDER: Record<SortBy, (a: FsEntry, b: FsEntry) => number> = {
  name: byName,
  date: (a, b) => b.mtimeMs - a.mtimeMs || byName(a, b),
  size: (a, b) => b.size - a.size || byName(a, b),
  kind: (a, b) => extOf(a.name).localeCompare(extOf(b.name)) || byName(a, b),
}
// dirs first, by name unless sortDirs: the listing reports a dir 0 size and 0 time
export const sorted = (entries: FsEntry[], by: SortBy, sortDirs: boolean) => [
  ...entries.filter(f => f.kind === 'dir').sort(sortDirs ? ORDER[by] : byName),
  ...entries.filter(f => f.kind !== 'dir').sort(ORDER[by]),
]

export const keyOf = (f: FsEntry) => `${f.kind === 'dir' ? 'd' : 'f'}:${f.name}`
// the ring walks the list alone: the nav keys and the digit Buttons never take it (a click still presses them)
export const isListRow = (element: string) => element === '..' || /^[dfr]:/.test(element)
export const branch = (isLast: boolean) => (isLast ? '└── ' : '├── ')

// Claude Code cuts a bare @mention at whitespace and reads @"..." whole (2.1.308), so quote only paths with a space.
// A quoted mention cannot hold `"` and no escape exists (`\"` and `\ ` both fail to attach)
export const mention = (path: string) => (/\s/.test(path) ? `@"${path}"` : `@${path}`)
export const mentionable = (path: string) => !(/\s/.test(path) && path.includes('"'))

// a Text's truncate-middle does not apply inside a Button (the Button grows to its text), so cut here
// limit: counts one cell per code unit; a wide (CJK, emoji) name overflows by its extra cells
export const clampMiddle = (name: string, room: number) => {
  if (name.length <= room) return name
  if (room <= 1) return '…'.slice(0, Math.max(room, 0))
  const tail = Math.floor((room - 1) / 2)
  return `${name.slice(0, room - 1 - tail)}…${tail > 0 ? name.slice(-tail) : ''}`
}

// one row up or down, stopping at both ends (undefined); off the list, the first row
export const stepTarget = (rows: readonly string[], focused: string | undefined, by: 1 | -1) => {
  const at = rows.indexOf(focused ?? '')
  return at < 0 ? rows[0] : rows[at + by]
}
