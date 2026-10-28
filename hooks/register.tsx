import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, Register } from 'claude-code'

import type { SortBy } from '../types'

import { helpKeys, ICONS, iconSet, resolveLang, SORT_MARK, TEXT } from './i18n'
import type { Lang } from './i18n'
import { branch, clampMiddle, isListRow, keyOf, mention, mentionable, sorted, stepTarget } from './list'

const PANE = 'at-picker'
// `claude plugin validate` refuses a variable as an atom's source, so each one repeats 'at-picker'
const cwd = atom({ plugin: 'at-picker', key: 'cwd' } as const, '')
// null follows the showHidden setting
const hiddenOverride = atom({ plugin: 'at-picker', key: 'hiddenOverride' } as const, null as boolean | null)
// relative to the working dir, a dir ending in '/'; kept across directory changes
const selected = atom({ plugin: 'at-picker', key: 'selected' } as const, [] as string[])
const sortBy = atom({ plugin: 'at-picker', key: 'sortBy' } as const, 'name' as SortBy)
const SORTS: readonly SortBy[] = ['name', 'date', 'size', 'kind']
const helpOpen = atom({ plugin: 'at-picker', key: 'helpOpen' } as const, false)
// the engine skips ui.focus for the mod's own $.ui.focus moves (re-entry), so focusOn records those
const focused = atom({ plugin: 'at-picker', key: 'focused' } as const, '')
// absolute paths, from the classic DirectoryAdded hook
const addedDirs = atom({ plugin: 'at-picker', key: 'addedDirs' } as const, [] as string[])

// read-only mod: traces go to the engine's debug log (claude --debug), never to a file
let debug = false
const trace = ($: EngineInterface, name: string, data: object) =>
  debug && $.ui.log(`at-picker ${name} ${JSON.stringify(data)}`, { to: 'debug' })
// WASD and IJKL do the same, for either hand; p (pick) and t (take) accept like 6 without leaving the letters
type Nav = 'prev' | 'next' | 'parent' | 'open' | 'accept'
const NAV_KEYS: readonly (readonly [string, Nav])[] = [
  ['w', 'prev'], ['i', 'prev'], ['s', 'next'], ['k', 'next'],
  ['a', 'parent'], ['j', 'parent'], ['d', 'open'], ['l', 'open'],
  ['p', 'accept'], ['t', 'accept'],
]

export const register: Register = (on, options) => {
  // the engine fills in the manifest defaults before register runs
  const dockPercent = Number(options.dockWidthPercent)
  const inlineRows = Number(options.inlineRows)
  const inlineMode = options.inlineMode === 'message' ? 'message' : 'panel'
  debug = options.debug === true
  const showHiddenSetting = options.showHidden === true
  const sortDirs = options.sortDirs === true
  const icons = ICONS[iconSet(options.icons)]
  // the setting alone until session.start reads the locale (tests start no session)
  let lang: Lang = resolveLang(options.uiLanguage, undefined)
  let home = ''
  // `/add-dir` option 2 entries
  let rememberedDirs: string[] = []

  on('session.start', async ($, e, next) => {
    const locale = (await $.env.get('LC_ALL')) || (await $.env.get('LC_MESSAGES')) || (await $.env.get('LANG'))
    lang = resolveLang(options.uiLanguage, locale)
    home = (await $.env.get('HOME')) ?? ''
    // limit: takes absolute and ~ entries; a relative one (resolved against the settings file) is skipped
    const permissions = (await $.settings.read({ key: 'permissions' }).catch(() => undefined)) as { additionalDirectories?: unknown } | undefined
    const listed = Array.isArray(permissions?.additionalDirectories) ? permissions.additionalDirectories : []
    rememberedDirs = listed
      .filter((d): d is string => typeof d === 'string')
      .map(d => (d.startsWith('~/') && home ? `${home}${d.slice(1)}` : d))
      .filter(d => d.startsWith('/'))
    await $.command.register({ name: 'at-picker', description: TEXT[lang].description })

    return next(e)
  })

  on('classic.DirectoryAdded', async ($, e, next) => {
    await update($, addedDirs, dirs => (dirs.includes(e.directory) ? dirs : [...dirs, e.directory]))
    trace($, 'directory-added', { directory: e.directory, source: e.source })
    return next(e)
  })

  on('command.run', { command: 'at-picker' }, async ($, e) => {
    // a toggle, because the engine's ✕ can sit under a terminal's own badge
    if ((await $.ui.panes()).some(p => p.id === PANE && p.isShown)) {
      await $.ui.close({ id: PANE })
      return { text: TEXT[lang].closed }
    }
    // the engine clamps the dock to [24, 45%] and ignores `columns` inline, `rows` docked
    const columns = Math.max(24, Math.floor((e.presentation.columns * dockPercent) / 100))
    const opened = await $.ui.open({ id: PANE, title: TEXT[lang].title, focus: true, closeOnEscape: true, columns, rows: inlineRows })
    if (debug) {
      trace($, 'command', { presentation: e.presentation, options, asked: { columns, rows: inlineRows }, opened, panes: await $.ui.panes() })
    }

    return { text: TEXT[lang].opened }
  })

  on('ui.focus', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.element !== undefined && !isListRow(e.element)) return { deny: 'off the ring' }
    const result = await next(e)
    if (!result.deny) await update($, focused, () => e.element ?? '')
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const t = TEXT[lang]
    const dir = await read($, cwd)
    const picked = await read($, selected)
    const showHidden = (await read($, hiddenOverride)) ?? showHiddenSetting
    const order = await read($, sortBy)
    const showHelp = await read($, helpOpen)
    const ringAt = await read($, focused)
    const pathOf = (name: string) => (dir ? `${dir}/${name}` : name)
    // remembered in settings or added by /add-dir this session
    const roots = [...new Set([...rememberedDirs, ...(await read($, addedDirs))].map(r => r.replace(/(.)\/$/, '$1')))]
    const tilde = (path: string) => (home && (path === home || path.startsWith(`${home}/`)) ? `~${path.slice(home.length)}` : path)
    const cut = dir.lastIndexOf('/')
    const parent = dir.slice(0, Math.max(cut, 0))
    const leaf = dir.slice(cut + 1)

    const toggle = (path: string) =>
      void update($, selected, list => (list.includes(path) ? list.filter(p => p !== path) : [...list, path]))
    // reads the pick when pressed, not the drawn one; closes first: the prompt refuses a fill while the pane holds the keys
    const accept = async () => {
      const picks = await read($, selected)
      const still = await Promise.all(picks.map(p => $.fs.exists(p.replace(/\/$/, '')).catch(() => false)))
      const existing = picks.filter((_, i) => still[i])
      const live = existing.filter(mentionable)
      if (live.length < existing.length) $.ui.toast(t.unmentionable(existing.length - live.length))
      if (live.length === 0) {
        if (existing.length === 0 && picks.length > 0) $.ui.toast(t.noneExist)
        return
      }
      await $.ui.close({ id: PANE })
      const filled = await $.prompt.fill({ text: `${live.map(mention).join(' ')} `, mode: 'insert' })
      trace($, 'accept', { picks, live, filled })
      if (filled.isFilled) await update($, selected, () => [])
      else $.ui.toast(t.fillFailed(filled.refusal))
    }
    // best effort: a site not holding the keys denies it
    const focusOn = async (key: string) => {
      const moved = await $.ui.focus({ requestId: PANE, key }).catch(() => undefined)
      if (moved && !moved.deny) await update($, focused, () => key)
    }
    // like nnn: entering a dir lands on '..', going up lands on the dir we left
    const go = async (to: string, focusKey: string) => {
      await update($, cwd, () => to)
      await focusOn(focusKey)
    }

    // inverse text on the inactive gray reads as a control and keeps a small glyph legible
    const chip = (label: string) => (
      <Text color="inverseText" backgroundColor="inactive">
        {` ${label} `}
      </Text>
    )

    if (e.props.placement === 'inline' && inlineMode === 'message') {
      return <Text color="warning">{t.noRoom(e.viewport?.columns ?? '?')}</Text>
    }

    // a dir deleted or unreadable since we entered it shows why and keeps ../ instead of blanking the pane
    let failure: string | undefined
    const listing = await $.fs.list(dir || undefined).catch((err: unknown) => {
      failure = String(err)
      return [] as FsEntry[]
    })
    const statOf = (f: FsEntry) => $.fs.stat(pathOf(f.name)).catch(() => undefined)
    // a symlink is `other`: follow it so a linked dir opens and a linked file picks; drop a broken one.
    // limit: one stat per dir per draw when dirs sort by date (the listing gives a dir no time); cache if slow
    const datedDirs = sortDirs && order === 'date'
    const followed = await Promise.all(
      listing.map(async f => {
        if (f.kind === 'dir' && datedDirs) {
          const at = await statOf(f)
          return at ? { ...f, mtimeMs: at.mtimeMs } : f
        }
        if (f.kind !== 'other') return f
        const to = await statOf(f)
        return to && to.kind !== 'other' ? { ...f, kind: to.kind, size: to.size, mtimeMs: to.mtimeMs } : undefined
      }),
    )
    trace($, 'render', { surface: e.surface, viewport: e.viewport, props: e.props, failure })
    const entries = sorted(
      followed.filter((f): f is FsEntry => f !== undefined && (showHidden || !f.name.startsWith('.'))),
      order,
      sortDirs,
    )
    // what 2 and 3 act on
    const here = entries.filter(f => f.kind === 'file').map(f => pathOf(f.name))
    // the top of an added root goes back to the root list, onto that root's row
    const up = () => (dir === '' ? undefined : roots.includes(dir) ? go('', `r:${dir}`) : go(parent, `d:${leaf}`))
    const rootRows = dir === '' ? roots : []
    // dirs come first, so this index closes the tree
    const lastDir = entries.filter(f => f.kind === 'dir').length - 1
    const rows = [
      ...(dir === '' ? [] : ['..']),
      ...entries.map(keyOf),
      ...rootRows.map(r => `r:${r}`),
    ]
    const step = async (by: 1 | -1) => {
      const to = stepTarget(rows, (await read($, focused)) || undefined, by)
      return to === undefined ? undefined : focusOn(to)
    }
    // a file row, or a key left from another dir, does nothing
    const openFocused = async () => {
      const focusedKey = await read($, focused)
      if (focusedKey === '..') return up()
      if (focusedKey.startsWith('r:') && rootRows.includes(focusedKey.slice(2))) return go(focusedKey.slice(2), '..')
      const name = focusedKey.startsWith('d:') ? focusedKey.slice(2) : undefined
      if (name !== undefined && entries.some(f => f.kind === 'dir' && f.name === name)) return go(pathOf(name), '..')
    }
    const NAV: Record<Nav, () => unknown> = { prev: () => step(-1), next: () => step(1), parent: up, open: openFocused, accept }

    // 8 chips need 56 cells on one line, 28 in rows of 4, 21 in rows of 3 (the dock's floor is 24)
    const perRow = e.props.bodyColumns >= 56 ? 8 : e.props.bodyColumns >= 28 ? 4 : 3
    const toolbarRows = Math.ceil(8 / perRow)
    // the engine lays the tree out at its own height (flexGrow does not stretch it): a spacer of the free rows
    // pushes the hint to the pane's bottom
    const usedRows =
      toolbarRows +
      2 + // the rule and the path row
      (failure ? 1 : 0) +
      (dir === '' ? 0 : 1) + // ../
      entries.length +
      (rootRows.length ? rootRows.length + 2 : 0) + // the blank row, the heading and the roots
      2 // the bottom rule and the hint
    const freeRows = Math.max(0, e.props.scroll.bodyRows - usedRows)
    const rule = <Text dimColor>{'─'.repeat(e.props.bodyColumns)}</Text>
    // theme keys only: a raw color reads black on a Dark theme's dock in a light terminal.
    // The engine inverts the ring's row, so it draws in the plain text color (no blue or green block)
    const row = (key: string, pick: string, label: string, connector: string | undefined, autoFocus?: true) => {
      const isRing = e.props.isFocused && ringAt === key
      const isPicked = picked.includes(pick)
      return (
        <Button key={key} plain autoFocus={autoFocus} onPress={() => toggle(pick)}>
          {connector === undefined ? ' ' : <Text color="subtle">{connector}</Text>}
          <Text
            color={isRing ? 'text' : isPicked ? 'success' : connector !== undefined ? 'suggestion' : 'text'}
            bold={!isRing && isPicked ? true : undefined}
          >
            {clampMiddle(label, e.props.bodyColumns - (connector ?? ' ').length - (isPicked ? 2 : 0))}
            {isPicked ? ' ●' : ''}
          </Text>
        </Button>
      )
    }
    const TOOLS: [key: string, hotkey: string, label: string, onPress: () => void][] = [
      ['toggle-hidden', '1', icons.hidden, () => void update($, hiddenOverride, v => !(v ?? showHiddenSetting))],
      ['select-all', '2', icons.all, () => void update($, selected, list => [...new Set([...list, ...here])])],
      ['select-none', '3', icons.none, () => void update($, selected, list => list.filter(p => !here.includes(p)))],
      ['select-clear', '4', icons.clear, () => void update($, selected, () => [])],
      ['sort', '5', `${icons.sort}${SORT_MARK[lang][order]}`, () => void update($, sortBy, by => SORTS[(SORTS.indexOf(by) + 1) % SORTS.length]!)],
      ['accept', '6', icons.accept, () => void accept()],
      // `?` cannot be a hotkey (one digit or one lowercase letter only)
      ['help', '7', '?', () => void update($, helpOpen, open => !open)],
    ]
    const tools = [
      ...TOOLS.map(([key, hotkey, label, onPress]) => (
        <Button key={key} hotkey={hotkey} plain onPress={onPress}>
          {chip(label)}
        </Button>
      )),
      <Button key="close" hotkey="8" plain onPress={() => void $.ui.close({ id: PANE })}>
        <Text color="inverseText" backgroundColor="error" bold>
          {' ✕ '}
        </Text>
      </Button>,
    ]
    // a grid, not a ragged wrap: a narrow dock's first row ends short of the corner where a terminal may draw a badge
    const toolRows = Array.from({ length: toolbarRows }, (_, i) => tools.slice(i * perRow, (i + 1) * perRow))
    return (
      <Box flexDirection="column">
        {/* the nav keys act without a visible control, as filetree does; the 7 help view lists them */}
        <Box height={0} overflow="hidden">
          {NAV_KEYS.map(([k, action]) => (
            <Button key={`nav-${k}`} hotkey={k} plain onPress={() => void NAV[action]()}>
              {k}
            </Button>
          ))}
        </Box>
        <Box key="toolbar" flexDirection="column">
          {toolRows.map((tools, i) => (
            <Box key={`toolbar-${i}`} flexDirection="row" columnGap={1}>
              {tools}
            </Box>
          ))}
        </Box>
        {rule}
        <Box flexDirection="row" justifyContent="space-between">
          <Text dimColor wrap="truncate-start">
            {dir.startsWith('/') ? tilde(dir) : `./${dir}`} · {entries.length}
            {showHidden ? ` · ${t.shownHidden}` : ''}
          </Text>
          <Box flexDirection="row" gap={1}>
            <Text dimColor>
              {picked.length} {t.picked}
            </Text>
            <Text dimColor>|</Text>
            {e.props.isFocused ? <Text color="success">{t.keysHere}</Text> : <Text dimColor>{t.keysPrompt}</Text>}
          </Box>
        </Box>
        {/* the full error goes to the trace */}
        {failure && !showHelp && <Text color="error" wrap="truncate-end">{t.listFailed}</Text>}
        {showHelp ? (
          <Box flexDirection="column">
            <Text bold>{t.helpTitle}</Text>
            {helpKeys(icons).map((keys, i) => (
              <Box key={keys} flexDirection="row">
                <Box width={14} flexShrink={0}>
                  <Text color="suggestion">{keys}</Text>
                </Box>
                <Text color="text">{t.help[i]}</Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Box flexDirection="column">
            {dir !== '' && (
              <Button key=".." plain autoFocus onPress={() => void up()}>
                <Text color="text">../</Text>
              </Button>
            )}
            {/* the first list row takes the focus with the keyboard, so Enter acts on the list */}
            {entries.map((f, i) => {
              const autoFocus = dir === '' && i === 0 ? true : undefined
              return f.kind === 'dir'
                ? row(keyOf(f), `${pathOf(f.name)}/`, `${f.name}/`, branch(i === lastDir), autoFocus)
                : row(keyOf(f), pathOf(f.name), f.name, undefined, autoFocus)
            })}
            <Box height={rootRows.length > 0 ? 1 : 0} />
            {rootRows.length > 0 && <Text dimColor>{`── ${t.added} `.padEnd(e.props.bodyColumns, '─')}</Text>}
            {rootRows.map((root, i) => row(`r:${root}`, `${root}/`, `${tilde(root)}/`, branch(i === rootRows.length - 1)))}
          </Box>
        )}
        {!showHelp && (
          <>
            <Box height={freeRows} />
            {rule}
            <Text dimColor wrap="truncate-end">
              {t.hint}
            </Text>
          </>
        )}
      </Box>
    )
  })
}
