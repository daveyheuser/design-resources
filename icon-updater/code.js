// Central Icons Importer - Figma Plugin
// Universal plugin for importing icons from @central-icons-react into any Figma file.
// Automatically discovers category frames on the current page, deduplicates,
// and applies correct layout to all imported component sets.

figma.showUI(__html__, { width: 500, height: 600 });

// --- Frame & dedup helpers ---

function discoverCategoryFrames(page) {
  const frames = {};
  for (const child of page.children) {
    if (child.type === "FRAME") {
      frames[child.name] = child.id;
    }
  }
  return frames;
}

function getExistingIconNames(page) {
  const existing = new Set();
  for (const frame of page.children) {
    if (frame.type !== "FRAME") continue;
    for (const child of frame.children) {
      if (child.type === "COMPONENT_SET") {
        existing.add(child.name.split(",")[0].trim());
      }
    }
  }
  return existing;
}

// --- Icon creation ---

const LAYOUT = { mode: "HORIZONTAL", spacing: 32, padding: 20 };

function applyComponentSetLayout(componentSet) {
  componentSet.layoutMode = LAYOUT.mode;
  componentSet.primaryAxisSizingMode = "AUTO";
  componentSet.counterAxisSizingMode = "AUTO";
  componentSet.itemSpacing = LAYOUT.spacing;
  componentSet.paddingTop = LAYOUT.padding;
  componentSet.paddingRight = LAYOUT.padding;
  componentSet.paddingBottom = LAYOUT.padding;
  componentSet.paddingLeft = LAYOUT.padding;
}

function createIconComponentSet(parentFrame, title, variants) {
  const components = [];

  for (const [variantName, svgPaths] of Object.entries(variants)) {
    const fullSvg =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      svgPaths +
      "</svg>";
    const svgNode = figma.createNodeFromSvg(fullSvg);
    const comp = figma.createComponent();
    comp.name = variantName;
    comp.resize(24, 24);
    while (svgNode.children.length > 0) {
      comp.appendChild(svgNode.children[0]);
    }
    svgNode.remove();
    components.push(comp);
  }

  const componentSet = figma.combineAsVariants(components, parentFrame);
  componentSet.name = title;
  applyComponentSetLayout(componentSet);
  return componentSet;
}

// --- Message handling ---

figma.ui.onmessage = async (msg) => {
  if (msg.type === "start") {
    await handleImport(msg.data);
  }
};

async function handleImport(data) {
  const page = figma.currentPage;

  // Discover existing category frames
  const categoryFrames = discoverCategoryFrames(page);

  // Build set of existing icon names for deduplication
  const existingNames = getExistingIconNames(page);

  let totalInData = 0;
  let skippedDupes = 0;
  let imported = 0;
  let createdFrames = 0;
  let errors = 0;

  for (const icons of Object.values(data)) {
    totalInData += Object.keys(icons).length;
  }

  figma.ui.postMessage({
    type: "progress",
    done: 0,
    total: totalInData,
    text: `Page: "${page.name}" — ${existingNames.size} existing icons. Importing ${totalInData}...`,
  });

  for (const [category, icons] of Object.entries(data)) {
    let frameId = categoryFrames[category];

    // Auto-create category frame if it doesn't exist
    if (!frameId) {
      const existingFrame = page.children.find(
        (c) => c.type === "FRAME" && c.children && c.children.some((cc) => cc.type === "COMPONENT_SET")
      );
      const newFrame = figma.createFrame();
      newFrame.name = category;
      if (existingFrame) {
        newFrame.layoutMode = existingFrame.layoutMode || "VERTICAL";
        newFrame.layoutWrap = existingFrame.layoutWrap || "NO_WRAP";
        newFrame.primaryAxisAlignItems = existingFrame.primaryAxisAlignItems || "MIN";
        newFrame.counterAxisAlignItems = existingFrame.counterAxisAlignItems || "MIN";
        newFrame.paddingTop = existingFrame.paddingTop || 80;
        newFrame.paddingRight = existingFrame.paddingRight || 80;
        newFrame.paddingBottom = existingFrame.paddingBottom || 80;
        newFrame.paddingLeft = existingFrame.paddingLeft || 80;
        newFrame.itemSpacing = existingFrame.itemSpacing || 40;
        newFrame.primaryAxisSizingMode = existingFrame.primaryAxisSizingMode || "AUTO";
        newFrame.counterAxisSizingMode = existingFrame.counterAxisSizingMode || "FIXED";
        newFrame.fills = existingFrame.fills;
      } else {
        newFrame.layoutMode = "VERTICAL";
        newFrame.primaryAxisSizingMode = "AUTO";
        newFrame.counterAxisSizingMode = "FIXED";
        newFrame.itemSpacing = 40;
        newFrame.paddingTop = 80;
        newFrame.paddingRight = 80;
        newFrame.paddingBottom = 80;
        newFrame.paddingLeft = 80;
      }
      page.appendChild(newFrame);
      frameId = newFrame.id;
      categoryFrames[category] = frameId;
      createdFrames++;

      figma.ui.postMessage({
        type: "progress",
        done: imported + skippedDupes,
        total: totalInData,
        text: `Created new category frame: "${category}"`,
      });
    }

    const frame = figma.getNodeById(frameId);
    if (!frame) continue;

    for (const [iconName, iconData] of Object.entries(icons)) {
      const baseName = iconData.title.split(",")[0].trim();

      if (existingNames.has(baseName)) {
        skippedDupes++;
        figma.ui.postMessage({
          type: "progress",
          done: imported + skippedDupes + errors,
          total: totalInData,
          text: `SKIP (exists): ${baseName}`,
        });
        continue;
      }

      try {
        createIconComponentSet(frame, iconData.title, iconData.variants);
        existingNames.add(baseName);
        imported++;
        figma.ui.postMessage({
          type: "progress",
          done: imported + skippedDupes + errors,
          total: totalInData,
          text: `[${category}] ${iconName} (${imported} new, ${skippedDupes} skipped)`,
        });
      } catch (e) {
        errors++;
        figma.ui.postMessage({
          type: "progress",
          done: imported + skippedDupes + errors,
          total: totalInData,
          text: `ERROR: ${iconName} - ${e.message}`,
        });
      }

      if ((imported + skippedDupes + errors) % 5 === 0) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  }

  const summary = [
    `Imported: ${imported}`,
    `Skipped (dupes): ${skippedDupes}`,
    createdFrames > 0 ? `New frames: ${createdFrames}` : null,
    errors > 0 ? `Errors: ${errors}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  figma.ui.postMessage({ type: "done", summary });
  figma.notify(`Done! ${summary}`);
}
