export type SortBy = 'name' | 'date' | 'size' | 'kind'

declare module 'claude-code' {
  interface PluginState {
    'at-picker': { cwd: string; hiddenOverride: boolean | null; selected: string[]; sortBy: SortBy; helpOpen: boolean; focused: string; addedDirs: string[] }
  }
}
