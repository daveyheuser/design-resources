# Design Resources

Shared design tooling for the Snitcher team.

## icon-updater/

Figma plugin + CLI for syncing icons from `@central-icons-react` into the Snitcher Figma component library.

### Updating icons

The icon npm package is installed at `~/central-icons/`. The Figma file is the Snitcher component library (`Z5cfRD6vEDgmdxMA9wpiiK`), page "Icons 🟢". Skip page "Icons 🟢 2".

To sync new icons:

1. `cd ~/central-icons && npm install @central-icons-react/all@latest`
2. Check the new version: `node -e "console.log(require('./node_modules/@central-icons-react/all/package.json').version)"`
3. `node ~/Snitcher/design-resources/icon-updater/generate-json.js --diff <previous-version>` — generates `icon-import.json` with only new icons
4. `npx serve -p 8765 --cors` — serves the JSON for the Figma plugin
5. User runs the plugin in Figma on the Icons page, clicks Load, then Import

The previous synced version is tracked in Claude's memory. After a successful sync, update the memory with the new version number.

### generate-json.js modes

- `--diff <version>` — icons added since a previous npm version (preferred for updates)
- `--since <date>` — icons created after an ISO date
- `--names <list>` — specific comma-separated kebab-case icon names
- no flags — all icons (large output, use sparingly)

### Plugin details

- Manifest: `icon-updater/manifest.json`
- Imports into the **current page** in Figma
- Auto-deduplicates (skips icons that already exist)
- Auto-creates missing category frames
- Applies correct layout: horizontal, 32px spacing, 20px padding per component set
- Each icon gets 30 variants: filled (on/off) × stroke (2/1.5/1) × radius (0/1/2/3) × join (square/round)
