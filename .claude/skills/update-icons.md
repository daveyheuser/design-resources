---
name: update-icons
description: Update the central-icons npm package and generate the Figma import JSON so the user can sync new icons into Figma
user_invocable: true
---

# Update Icons

Update `@central-icons-react` and prepare new icons for Figma import.

## Steps

1. Read the CLAUDE.md at the repo root for full context.

2. Find the previous synced version from Claude's memory (check for a memory about "Figma icon import workflow" or "icon-updater"). If not found, ask the user.

3. Update the npm package:
   ```bash
   cd ~/central-icons && npm install @central-icons-react/all@latest
   ```

4. Get the new version:
   ```bash
   node -e "console.log(require('./node_modules/@central-icons-react/all/package.json').version)"
   ```

5. If the version hasn't changed, tell the user there's nothing new and stop.

6. Generate the diff JSON:
   ```bash
   node ~/Snitcher/design-resources/icon-updater/generate-json.js --diff <previous-version>
   ```
   Run this from `~/central-icons/` so it can find the npm package.

7. Start the file server:
   ```bash
   cd ~/central-icons && npx serve -p 8765 --cors
   ```
   Run this in the background.

8. Tell the user:
   - How many new icons were found and in which categories
   - To open their Figma file, navigate to the Icons page
   - To run the "Central Icons Importer" plugin (Plugins → Development → Central Icons Importer)
   - Click "Load icon data", then "Import icons"
   - The plugin auto-deduplicates, so it's safe to run even if some icons already exist

9. After the user confirms the import worked, update Claude's memory with the new version number.
