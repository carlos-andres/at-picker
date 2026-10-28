import type { SortBy } from '../types'

export type Lang = 'en' | 'es'

// `auto` follows the terminal locale; Claude Code's `language` setting is the reply language, so it is not read
export const resolveLang = (setting: unknown, locale: string | undefined): Lang =>
  setting === 'en' || setting === 'es' ? setting : /^es/i.test(locale ?? '') ? 'es' : 'en'

// one cell per icon: `unicode` uses narrow (EAW N) glyphs any monospace font draws; `nerd` needs a Nerd Font
export type IconSet = 'unicode' | 'nerd'
type Icons = { hidden: string; all: string; none: string; clear: string; sort: string; accept: string }
export const ICONS: Record<IconSet, Icons> = {
  unicode: { hidden: '◉', all: '☑', none: '☐', clear: '⌫', sort: '⇅', accept: '↵' },
  // fa-eye, fa-check_square, fa-square_o, fa-eraser, fa-sort
  nerd: { hidden: '\uf06e', all: '\uf14a', none: '\uf096', clear: '\uf12d', sort: '\uf0dc', accept: '↵' },
}
export const iconSet = (setting: unknown): IconSet => (setting === 'nerd' ? 'nerd' : 'unicode')
export const SORT_MARK: Record<Lang, Record<SortBy, string>> = {
  en: { name: 'n', date: 'd', size: 's', kind: 't' },
  es: { name: 'n', date: 'f', size: 't', kind: 'x' },
}

// the key column of the help view, shared by both languages so a key cannot drift between them
export const helpKeys = (icons: Icons) => [
  '↑  w  i', '↓  s  k', 'd  l', 'a  j', 'enter',
  `1  ${icons.hidden}`, `2  ${icons.all}`, `3  ${icons.none}`, `4  ${icons.clear}`, `5  ${icons.sort}`, `6  p  t  ${icons.accept}`,
  '7  ?', '8  ✕  esc', 'ctrl+x tab', '/at-picker',
]

type Strings = {
  title: string
  description: string
  opened: string
  closed: string
  shownHidden: string
  keysHere: string
  keysPrompt: string
  // most needed first: a narrow pane cuts the end
  hint: string
  added: string
  picked: string
  noRoom: (columns: number | string) => string
  fillFailed: (why: string | undefined) => string
  listFailed: string
  noneExist: string
  unmentionable: (count: number) => string
  helpTitle: string
  // one description per helpKeys entry, same order
  help: readonly string[]
}

// limit: "110 columns" copies the engine's dock floor (fullscreen, >= 110 cols); it moves if the engine's does
export const TEXT: Record<Lang, Strings> = {
  en: {
    title: 'at-picker',
    description: 'Pick files to @mention in the prompt',
    opened: 'at-picker opened.',
    closed: 'at-picker closed.',
    shownHidden: '+hidden',
    keysHere: '● act',
    keysPrompt: '○ deact',
    hint: '7 help · 6/p/t accept · enter pick · wasd / ijkl move',
    added: 'added (/add-dir)',
    picked: 'sel',
    noRoom: columns => `Not enough room: at-picker needs ≥110 columns in fullscreen (now: ${columns}).`,
    fillFailed: why => `at-picker: could not write to the prompt (${why ?? 'unknown reason'})`,
    listFailed: 'Cannot list this folder (deleted or no permission).',
    noneExist: 'at-picker: the picked files no longer exist',
    unmentionable: count =>
      `at-picker: left out ${count} ${count === 1 ? 'pick' : 'picks'}: a name with both a space and a double quote cannot be @mentioned`,
    helpTitle: 'Keys',
    help: [
      'one row up',
      'one row down',
      'open the folder under the cursor',
      'go up to the parent folder',
      'pick or unpick the row (folder: @folder/)',
      'show or hide hidden files',
      'pick every file in this folder',
      'unpick every file in this folder',
      'clear the whole pick, every folder',
      'sort: n name, d date, s size, t type',
      'accept (p pick, t take): write @paths',
      'this help; 7 again goes back',
      'close at-picker',
      'move the keyboard to the prompt and back',
      'open or close at-picker from the prompt',
    ],
  },
  es: {
    title: 'at-picker',
    description: 'Elegir archivos para @mencionar en el prompt',
    opened: 'at-picker abierto.',
    closed: 'at-picker cerrado.',
    shownHidden: '+ocultos',
    keysHere: '● act',
    keysPrompt: '○ deact',
    hint: '7 ayuda · 6/p/t aceptar · enter marcar · wasd / ijkl mover',
    added: 'agregados (/add-dir)',
    picked: 'sel',
    noRoom: columns => `Espacio insuficiente: at-picker necesita ≥110 columnas en fullscreen (ahora: ${columns}).`,
    fillFailed: why => `at-picker: no se pudo escribir en el prompt (${why ?? 'motivo desconocido'})`,
    listFailed: 'No se puede listar esta carpeta (borrada o sin permiso).',
    noneExist: 'at-picker: los archivos seleccionados ya no existen',
    unmentionable: count =>
      `at-picker: ${count === 1 ? 'se omitió 1 selección' : `se omitieron ${count} selecciones`}: un nombre con espacio y comilla doble no se puede @mencionar`,
    helpTitle: 'Teclas',
    help: [
      'subir una fila',
      'bajar una fila',
      'entrar en la carpeta con el foco',
      'subir a la carpeta de arriba',
      'marcar o desmarcar (carpeta: @carpeta/)',
      'mostrar u ocultar archivos ocultos',
      'marcar todos los archivos de esta carpeta',
      'desmarcar los archivos de esta carpeta',
      'limpiar la selección de todas las carpetas',
      'orden: n nombre, f fecha, t tamaño, x tipo',
      'aceptar (p pick, t take): escribir @rutas',
      'esta ayuda; 7 otra vez para volver',
      'cerrar at-picker',
      'pasar el teclado al prompt y volver',
      'abrir o cerrar at-picker desde el prompt',
    ],
  },
}
