# at-picker Privacy Policy

Last updated: October 28, 2026

at-picker is a Claude Code plugin that opens a file picker pane and writes the files you pick into your prompt as
`@path` mentions. It runs entirely on your computer, inside Claude Code.

## What at-picker reads

- **Directory listings** of your working directory and of the directories you added with `/add-dir`, only while the
  pane is open, to draw the file tree.
- **The `HOME`, `LC_ALL`, `LC_MESSAGES` and `LANG` environment variables**, to show paths as `~/...` and to pick
  English or Spanish for the pane.
- **`permissions.additionalDirectories`** from your Claude Code settings, to list the directories `/add-dir`
  remembered.
- **The plugin's own settings** (icons, language, pane size, sorting, hidden files, debug), which you set with
  `claude plugin configure at-picker`.

at-picker never reads the contents of your files.

## What at-picker writes

- **The `@path` mentions you accept**, into the Claude Code prompt. Nothing is sent until you review the prompt and
  send it yourself. What happens after you send it is governed by Claude Code and Anthropic's own terms.
- **Nothing else.** at-picker writes no files and keeps no data after the session ends.

## What at-picker sends

Nothing. at-picker makes no network requests, has no analytics or telemetry, and does not share, sell or transfer
any data to anyone.

## Debug logging

If you turn on the `debug` setting, at-picker writes pane sizes, its own settings and the paths it handles to
Claude Code's local debug log (`claude --debug`). That log stays on your computer. The setting is off by default.

## Changes

Changes to this policy are committed to this repository, so its history shows every version.

## Contact

Open an issue at https://github.com/carlos-andres/at-picker/issues.
