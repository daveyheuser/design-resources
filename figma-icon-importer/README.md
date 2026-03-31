# Central Icons Figma Importer

Import icons from `@central-icons-react` into Figma — with automatic deduplication, category detection, and all 30 variants per icon.

## Quick start

```bash
# 1. Install/update the icon package
npm install @central-icons-react/all@latest

# 2. Generate the import JSON (pick one)
node generate-json.js --diff 1.1.170          # new icons since v1.1.170
node generate-json.js --since 2025-03-01      # icons created after a date
node generate-json.js --names sparkle,bolt    # specific icons only
node generate-json.js                          # all icons (large file)

# 3. Serve the file
npx serve -p 8765 --cors

# 4. Open Figma → navigate to your Icons page → run the plugin → click Load → Import
```

## generate-json.js options

| Flag | Description | Example |
|---|---|---|
| `--diff <version>` | Icons added since a previous npm version | `--diff 1.1.170` |
| `--since <date>` | Icons created after a date (ISO format) | `--since 2025-03-01` |
| `--names <list>` | Comma-separated kebab-case icon names | `--names sparkle,bolt,agent` |
| _(no flags)_ | Export all icons | |

Output: `icon-import.json` in the current directory.

## JSON format

The plugin expects this structure:

```json
{
  "Category Name": {
    "icon-name": {
      "title": "icon-name, search, keywords",
      "variants": {
        "filled=off, stroke=2, radius=0, join=square": "<path d=\"...\" stroke=\"currentColor\"/>",
        "filled=on, stroke=2, radius=0, join=square": "<path d=\"...\" fill=\"currentColor\"/>",
        "...30 variants total..."
      }
    }
  }
}
```

- **Category name** → matches a frame on the current Figma page (auto-created if missing)
- **title** → becomes the component set name in Figma (comma-separated aliases for search)
- **variants** → 30 combinations of `filled` (on/off), `stroke` (2/1.5/1), `radius` (0/1/2/3), `join` (square/round). Values are inner SVG markup (paths, circles, etc.) — the plugin wraps them in a 24×24 viewBox.

## Installing the plugin

In Figma Desktop: **Plugins → Development → Import plugin from manifest…** → select `manifest.json` from this folder.

## How deduplication works

Before importing, the plugin scans every component set on the current page. If an icon's base name (first word before the comma in the title) already exists, it's skipped. This means you can safely run the plugin multiple times — it only adds what's new.
