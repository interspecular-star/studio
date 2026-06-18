# Slay Studio - Dialogue UI Implementation Plan

**Variant C: Hybrid Canvas Widgets Approach**

**Status:** In Progress (Phases 1-3 largely implemented: data, basic+advanced widgets, editor, assets, dynamics stubs, render with images/variants/bars/actions)  
**Date:** Current  
**Author:** Grok (based on discussion)

## 1. Overview and Goals

### Current Limitations
- Dialogue text block and speaker pill are hardcoded in `KonvaCanvasInner.tsx` (fixed positions, sizes, no images).
- Buttons are text-only with limited styling (no custom images like `button.png`).
- No support for dynamic UI elements: avatars/portraits, bottom bars with states, left-side quick actions (inventory, map, skills).
- No way to position dialogue elements freely like buttons (x/y/width/height in %).
- Limited visual customization and dynamic behavior based on game state (intensity, choices, speaker variants).

### User Vision
- Flexible layout during dialogues:
  - Bottom bar (3 parts, changes by situation/intensity, fixed height).
  - Right: Character avatar (transparent PNG with alpha, changes by situation).
  - Center: Dialogue text block (well-positioned, configurable).
  - Left: Quick access (game_buttons, inventory, map, skills, etc.).
- Support custom button images/skins.
- Ability to move/resize dialogue elements.
- Dynamic changes based on conditions/variables.
- Convenient for authors (WYSIWYG in editor) and developers (data-driven, reusable).

### Goals
- Implement a hybrid system: keep canvas flexibility for positioning while providing structured widgets for common dialogue UI.
- Make dialogue UI editable per-page with global defaults/skins.
- Support images for buttons, portraits, bars.
- Enable dynamic updates via existing condition/action system.
- Prioritize usability: drag-and-drop in canvas, asset registry, live preview.
- Maintain backward compatibility where possible (current hardcoded can be migrated to widgets).
- Scalable for future: animations, rich text, multiple portraits, etc.

**Recommended Approach:** Hybrid (Variant C) - Draggable UI widgets on canvas + dedicated systems for skins, assets, and containers.

## 2. High-Level Architecture

### Core Principles
- **Widgets on Canvas:** Treat dialogue elements as first-class draggable entities like buttons (use/extend `StudioButton` or new `UIWidget` type).
- **Layered Rendering:** Use Konva Groups/Layers for z-order and composition (Background > Portraits > Text Box > Choices > Quick Actions > Top HUD).
- **Asset-Driven:** Separate registry for UI assets (skins, portraits) similar to Items.
- **Data-Driven + Conditions:** All elements support `visibleWhen`, dynamic properties via variables/actions.
- **Editor Integration:** Extend `PageSection` or add new "Dialogue UI" section; live updates in canvas.
- **Runtime/Playtest:** Reuse playtestState for dynamic values (e.g., intensity var affects bar).

### Key Components
1. **UI Widget System** (in `lib/store.ts`)
2. **Asset/Skin Registry**
3. **Enhanced Rendering** (in `components/editor/KonvaCanvasInner.tsx`)
4. **Editor Tools** (PageSection, new Backgrounds-like block for UI)
5. **Dynamic Logic** (extend conditions.ts, actions in executeAction)
6. **Migration & Defaults**

## 3. Data Model Changes

### New/Extended Types in store.ts

```ts
export type UIWidgetType = 
  | 'dialogueBox' 
  | 'portrait' 
  | 'choiceButton' 
  | 'quickAction' 
  | 'intensityBar' 
  | 'textLabel' 
  | 'container';  // for grouping left bar etc.

export interface UIWidget {
  id: string;
  type: UIWidgetType;
  // Positioning (like buttons, in %)
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    z?: number;  // for layering
  };
  // Visuals
  assetId?: string;  // reference to UIAsset
  style?: string;    // 'default' | 'important' | custom skin id
  text?: LocalizedString;  // for labels
  // Dynamic
  visibleWhen?: Condition;
  // Specific data
  data?: {
    // For portrait
    speakerId?: string;
    variant?: string;  // 'neutral' | 'angry' etc., or expression from var
    // For dialogueBox
    speakerName?: string;  // link to currentPage.speaker or override
    textSource?: 'page' | 'custom';  // usually page.text
    // For choiceButton
    linkedButtonId?: string;  // ties to existing StudioButton
    imageOnly?: boolean;
    // For intensityBar
    valueVar?: string;  // variable id for intensity 0-100
    parts?: number;  // 3 parts
    colors?: string[];  // per part or gradient
    // For quickAction
    actionType?: 'inventory' | 'map' | 'skills' | 'custom';
    // etc.
  };
  conditions?: Condition[];  // additional
}

export type UIAsset = {
  id: string;
  name: LocalizedString;
  type: 'buttonSkin' | 'portrait' | 'bar' | 'icon';
  url: string;  // path to PNG, e.g. /bg/button.png or public path
  // 9-slice or simple
  nineSlice?: { top: number; right: number; bottom: number; left: number };
  defaultWidth?: number;
  defaultHeight?: number;
  variants?: Record<string, string>;  // e.g. { hover: 'button_hover.png' }
};

export interface StudioPage {
  // existing...
  uiWidgets?: UIWidget[];  // new: dialogue elements as widgets
  uiLayoutPreset?: 'classic_vn' | 'bottom_bar' | 'freeform' | 'custom';
  // For quick left bar
  quickActions?: Array<{ id: string; actionType: string; position?: any; assetId?: string }>;
}
```

- Keep existing `buttons` for core actions.
- `choiceButton` widgets link to buttons for behavior, add visuals.
- Add global `uiAssets: UIAsset[]` in store (like items/backgrounds).

### Store Updates
- Add to `StudioState`:
  ```ts
  uiAssets: UIAsset[];
  // actions: addUIAsset, updateUIAsset, deleteUIAsset, etc.
  ```
- Extend `addPage`, `createDefaultPage` to include sample widgets.
- In `executeAction`: support new action types like `setWidgetProperty`, `setPortraitVariant`, `setIntensity`.
- Update `resetPlaytestState`, persistence (save/load/export).

### Migration
- For existing pages: auto-create default widgets (current hardcoded positions) on load.
- Provide "Migrate old dialogue to widgets" button in editor.

## 4. Asset System

- Dedicated management block in sidebar: "UI АССЕТЫ" (similar to "ФОНЫ" or Items).
  - List, add (upload or path to public/xxx.png), edit (preview, 9-slice params, variants).
- Support transparent PNGs with alpha.
- Integration with existing public folder (user specifies subpaths like /bg/, /ui/, /chara/).
- Preview in editor (small Konva or img).
- For buttons: skins reusable across pages.

## 5. Editor UI Changes

### In PageSection (or new "ДИАЛОГ UI" collapsible)
- Toggle between presets (applies default widget layouts).
- List of widgets for current page (draggable list + canvas drag).
- Property inspector when widget selected:
  - Position/size (sliders or direct like buttons).
  - Asset picker (from uiAssets).
  - Conditions (reuse ConditionEditor).
  - Specific: for portrait - speaker link + variants; for bar - value var + parts.
- Live preview: canvas updates immediately when changing.
- Add button: "Добавить виджет" (dialogueBox, portrait, choice, etc.).
- For left bar: drag-to-group quick actions.

### Canvas Interaction (extend current)
- In editor mode: widgets are draggable/resizable like buttons (reuse Konva drag logic).
- Visual feedback: outlines, snap to other widgets or grid.
- Z-order controls (bring to front).
- Selection highlights.

### Other
- Add to top bar: "Dialogue Preview" toggle (show/hide widgets in editor).
- Integration with existing "Нет диалога / Игровой режим" (hide dialogue widgets).

## 6. Rendering Changes (KonvaCanvasInner.tsx)

- Refactor hardcoded speaker pill + dialogue box into widget rendering.
- Loop over `currentPage.uiWidgets` (sorted by z or type):
  - `dialogueBox`: Render Group with Rect (bg from skin), Text (currentPage.text.ru with wrap, styles from skin), optional name tag.
  - `portrait`: Image (from asset + variant) at layout position, scale etc.
  - `choiceButton`: Image (asset) + Text overlay; link click to button action.
  - `intensityBar`: Rect(s) or sprite based on value (from playtestState var), divided into parts.
  - `quickAction`: Small icons/buttons on left.
- Support for button images: draw image first, then text on top.
- Dynamic: resolve variant/asset at render time using playtestState + evaluateCondition.
- Layering: use multiple Layers or Groups (e.g. dialogLayer, uiLayer).
- Performance: only render visible widgets (per conditions).
- In playtest: interactive (click choices executes action).
- Add support for hover states, simple animations (Konva transitions for intensity changes).

### Text Enhancements
- Rich text support (basic markup: **bold**, *italic*, colors via <span> or custom parser).
- Typewriter effect (optional, controlled by var?).
- Speaker name integration.

## 7. Dynamic Behavior and Conditions

- Reuse/extend existing system:
  - Every widget has `visibleWhen`.
  - New actions: 
    - `changeWidgetVariant(widgetId, variant)`
    - `setIntensity(value or delta)`
    - `swapPortrait(speakerId, variant)`
    - `updateButtonImage(buttonId, assetId)`
  - Conditions can check vars for "накал" (e.g. tension > 70 → intense bar color).
- Example: During choice, show/hide intensity bar or change avatar expression.
- For buttons: attach image in editor, or dynamically via action.
- State persistence: changes in playtestState (e.g. currentPortraitVariants: Record<string, string>).

## 8. Phased Implementation Plan

### Phase 0: Preparation (1-2 days)
- Create this document (done).
- Review current code: KonvaCanvasInner (dialogue rendering), store (page/buttons), PageSection, conditions.
- Add basic types and empty arrays to store (uiWidgets, uiAssets).
- Update persistence (add to save/load/export).

### Phase 1: Data Model & Basic Rendering (3-5 days)
- Implement UIWidget and UIAsset types + CRUD in store.
- Migrate existing dialogue to default widgets on page load.
- Basic render: dialogueBox widget (positionable text box), simple portrait.
- Support basic button images (add `image` to StudioButton or new choice widgets).
- Default layout for "classic" preset.
- Test: create widgets, see on canvas (static).

**Deliverable:** Editable positions for dialogue box + basic image buttons.

### Phase 2: Editor Support & Asset Registry (4-6 days)
- Add "UI АССЕТЫ" block (list, add via path or future upload, preview).
- Extend PageSection: "Диалог UI" section with widget list, add/remove, property panels.
- Drag/resize for widgets in canvas (reuse/extend button drag code, snapping).
- Presets: apply default widget sets.
- Live updates: canvas re-renders on changes.
- Basic conditions on widgets.

**Deliverable:** WYSIWYG editing of dialogue layout + asset management.

### Phase 3: Advanced Widgets & Layouts (5-7 days)
- Implement full widgets:
  - Portrait with variants (tied to speaker).
  - IntensityBar (3 parts, variable-driven).
  - QuickAction container + icons.
- Choice buttons: image support, hover states, layouts (bar, list).
- Container/group for left bar (position group, children relative).
- Text enhancements: name tag, basic markup.
- Z-order and layering in editor.

**Deliverable:** User's described layout (bar + avatar + text + left buttons) fully editable.

### Phase 4: Dynamics & Polish (4-6 days)
- Extend actions/conditions for runtime changes (set variant, intensity, swap assets).
- Dynamic resolution in render (playtestState driven).
- Animations (simple Konva tweens for bar changes, avatar swaps).
- Playtest feedback: intensity visible, choices with images.
- Error handling, defaults, accessibility (readable text).
- Export/UI consistency.

**Deliverable:** Fully dynamic dialogue UI that changes with game state.

### Phase 5: Advanced & Future (ongoing)
- Rich text (pauses, colors, shakes).
- Multiple portraits / expressions system.
- Animations per widget.
- Themes/skins global.
- Integration with inventory/defense (e.g. show equipped in portrait?).
- Performance: culling, caching images.
- Documentation, tests.
- Optional: speech bubbles, 3D-like for future.

**Timeline Estimate:** 3-5 weeks for core (Phases 1-4), depending on testing.

## 9. Risks, Considerations & Open Questions

### Risks
- Performance: many widgets + images on canvas (mitigate with conditions, culling).
- Complexity for authors: too many options (mitigate with presets + guided UI).
- Backward compat: old pages (provide migration).
- Asset paths: user manages public/ subfolders (support flexible URLs).
- State sync: playtest vs editor (use store consistently).

### Considerations
- **User Convenience:** Visual editing primary. Tooltips, defaults, undo (leverage canvasHistory?).
- **Dev Convenience:** Reusable components. Separate UI logic from game logic.
- **Performance in Playtest:** Lightweight rendering.
- **Mobile/Responsive:** % positions help; test different canvas sizes.
- **Accessibility:** High contrast options, keyboard nav for choices.
- Integrate with existing (Top Resource Bar, sceneType, no-dialog mode).

### Open Questions (to discuss with user)
1. Exact layout for bottom bar (3 parts: what do they represent? e.g. left: speaker info, center: text?, right: ?). Fixed size always?
2. Button images: full replacement (image only, text tooltip) or image + text overlay? Support for different states (normal/hover/selected) via multiple assets or tints?
3. Dialogue buttons placement: always in bottom bar, or can be floating? How many max? Auto-layout or manual positions?
4. Avatar changes: how triggered? By speaker only, or by variables (e.g. "mood" var)? Multiple simultaneous portraits?
5. Intensity bar: exact visuals (color change, fill %, icons)? Tied to which vars by default?
6. Left quick buttons: fixed icons or customizable? Drag order? Show/hide per page?
7. Text block: support for rich text immediately (colors, bold)? Auto-wrap rules?
8. Should quick actions be always visible or only in game mode / certain sceneTypes?
9. Future: animations? Sound cues per choice? Evidence system like Phoenix Wright?
10. Naming: "Widgets", "Dialogue Elements", "UI Blocks"?

## 10. Next Steps After Approval

1. Review and approve/refine this plan.
2. Prioritize phases or specific features.
3. Start Phase 1 implementation (data models first).
4. Regular commits, testing in editor/playtest.
5. Update docs (this file + README if needed).

---

**Notes:** 
- This builds on existing systems (conditions, buttons, store, Konva, PageSection extraction pattern).
- Focus on "удобно для пользователей и разработки" as requested.
- If a more elegant variant emerges (e.g. full Godot-like Control system or external lib), revisit.

This document will be updated as implementation progresses.