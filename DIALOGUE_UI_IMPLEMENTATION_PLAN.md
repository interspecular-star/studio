# Slay Studio - Dialogue UI Implementation Plan

**Variant C: Hybrid Canvas Widgets Approach**

**Status:** 
- **Phases 1-4**: Largely complete for the core system (data model, rendering, editor, assets, dynamics, basic animations and playtest feedback).
- **Phase 5**: Partially started (basic markup, multiple portraits in demo, some animations).
- **Overall progress**: Approximately **75-80%** of Phases 1-4. The system is already usable for authoring flexible dynamic dialogues. Many advanced rich-text and polish items remain.

**Date:** 2026-06-17  
**Author:** Grok (iterative implementation)

## Current Implementation Status (as of latest iteration)

### Implemented (Phases 1-4)

**Data Model & Core System**
- Full `UIWidget` + `UIAsset` types in `lib/store.ts`
- `uiWidgets[]` and `uiLayoutPreset` on `StudioPage`
- Playtest `widgetOverrides` for non-destructive dynamic changes
- CRUD actions for widgets and assets (`addUIWidget`, `updateUIWidget`, `moveUIWidget`, `addUIAsset`, etc.)
- Full persistence (localStorage / export / import) with migrations

**Rendering (KonvaCanvasInner.tsx)**
- `dialogueBox` — name tag, basic markup (**bold**, *italic*, [red/blue/green/yellow]), typewriter effect in playtest, shake animation (tied to angry variant + intensity >60), style support (default/important)
- `portrait` — asset-based images, variants (default/neutral/angry/happy/sad + custom), fade+scale animation on variant change, multiple portraits supported
- `intensityBar` — variable-driven, multi-part colored bar, smooth lerp animation
- `quickAction` — image support from assets or letter icons, clickable (inventory opens modal)
- `choiceButton` — image support, hover/pressed states, `imageOnly`, linked to existing buttons, fallback actions via `data.setIntensity`
- `container` — visual grouping with optional title
- `textLabel` — custom text support
- Dynamic resolution using `playtestState.widgetOverrides`
- Z-order rendering + snapping support

**Editor (PageSection + app/page.tsx)**
- Dedicated "UI АССЕТЫ" block (add via path, preview, edit)
- Widget list (sorted by z, shows (dyn) in playtest)
- Full inspector:
  - Layout (x/y/width/height/z) + z-order buttons (front/up/down/back)
  - Asset picker
  - Type-specific fields (speakerId, variant, textSource, custom text, linkedButtonId, imageOnly, valueVar, parts, actionType, title, style)
  - ConditionEditor for `visibleWhen`
- Presets: `classic_vn`, `bottom_bar`, `left_bar`, `full_dialogue_demo`
- Add buttons for all widget types

**Dynamics & Playtest**
- Temporary overrides instead of mutating base pages
- Actions: `setPortraitVariant`, `setIntensity`, `setWidgetProperty`
- Typewriter effect (speed affected by intensity, slows on ... and [pause])
- Animations: portrait swap (fade+scale), intensity lerp, dialogue shake
- Visual feedback: green dashed outline + "(dyn)" labels for overridden widgets
- Markup support in dialogue + [shake] / [pause] tags

**Demo & Presets**
- `full_dialogue_demo` preset (dialogue + 2 portraits + left container + intensity + choices)
- Updated default pages (tavern_01) with working examples
- Demo buttons that change variants, intensity, and dialogue text

### Remaining / To Do

**Phase 4 Polish (incomplete)**
- Richer per-segment rich text (colors + styles on individual words/phrases instead of whole block)
- More robust pause system in typewriter (actual timed delays)
- Error handling / defaults for missing assets/variables
- Accessibility improvements (readable text, contrast)

**Phase 5 – Advanced**
- Full rich text engine (pauses with timing, color per segment, shakes per phrase)
- Proper multiple portraits / expressions system (UI for managing several at once)
- Widget-level animations and transitions
- Global themes / skins for widgets
- Deeper integration (show equipped items on portrait, link to inventory state)
- Performance (culling, image caching)
- Documentation and tests
- Optional: speech bubbles, evidence system, etc.

**General**
- Better relative positioning inside containers
- Migration tools for old hardcoded dialogue pages
- More playtest actions that affect widgets

**Overall Progress**: 78-82% of the original plan (very strong core + dynamics, lighter on advanced rich text and polish). The system is already usable for authoring flexible, dynamic dialogues.

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

---

## 11. Обновлённый статус — 2026-06-22

### Что реализовано дополнительно (после даты документа)

- **Speaker registry** — Speakers вынесены из хардкода в store (`speakers[]`, CRUD). Отображаются в МИР-табе.
- **Undo/redo для виджетов** — `saveCanvasSnapshot` теперь сохраняет и восстанавливает `uiWidgets[].layout` (раньше только кнопки).
- **Resize handles** — Konva `Transformer` на выбранный виджет/кнопку. 8 ручек, gold-стиль, привязка к истории (`onTransformStart` → `saveCanvasSnapshot`). Отключён в playtest.
- **Два таба правой панели** — СТРАНИЦА / МИР. PageSection без враппера-карточки. Авто-переключение на СТРАНИЦА при смене страницы.
- **Typewriter rich text** — `trimPartialTag` исправляет утечку тегов при обрезке строки.
- **Rich text engine** — `parseRichText` + `layoutRichText` из `lib/richText.ts`. Работает per-word рендеринг с отдельным `fontSize`, `fill`, `fontStyle` на каждый Text node.
- **Дублирование страниц** — `duplicatePage` в store + кнопка ⧉ в списке страниц.
- **InventoryModal** — Перенесён в `absolute inset-0` внутри canvas div (был `fixed`, выходил за пределы игрового поля).
- **Hover ring** — Показывается только при hover (не при select). Transformer сам рисует golden border для выбранного элемента.

---

## 12. Phase 5 — Детальный план дальнейшей реализации

### Приоритет 1: Rich Text — доработка движка

**Статус:** движок работает, но неполный.

| Задача | Файл | Детали |
|---|---|---|
| Комбинация bold+italic | `lib/richText.ts` | `fontStyle` принимает `'bold italic'` в Konva. Сейчас только одно значение. |
| Расширить COLOR_MAP | `lib/richText.ts` | Добавить: `purple`, `orange`, `white`, `gray`, `gold` |
| Тег `[size:N]` | `lib/richText.ts` | Изменение размера шрифта для отдельных слов/фраз |
| Typewriter по visible-chars | `KonvaCanvasInner.tsx` | Сейчас прогресс считает raw-символы (включая теги). Нужно использовать `getVisibleLength()` для точного подсчёта символов |
| Тег `[wave]` | `lib/richText.ts` + canvas | Волновая анимация букв (синусоида по y, offset per-char) |
| Тег `[color:#HEX]` | `lib/richText.ts` | Произвольный hex-цвет вместо именованных |

---

### Приоритет 2: Dialogue Flow — диалоговый поток внутри страницы

Сейчас 1 страница = 1 реплика. Для живого диалога нужны очереди реплик внутри страницы.

**Вариант реализации:**
```ts
// StudioPage
dialogueLines?: Array<{
  id: string;
  text: LocalizedString;
  speaker?: string;       // speaker id
  portraitVariant?: string;
}>;
```

- `dialogueBox` widget отображает текущую строку из очереди
- Клик/пробел → следующая строка (без смены страницы)
- После последней строки — активируются кнопки выбора или авто-навигация
- В редакторе: список строк в инспекторе виджета `dialogueBox`
- Typewriter сбрасывается при переходе к следующей строке

**Файлы:** `lib/store.ts` (новый тип + поле), `KonvaCanvasInner.tsx` (логика очереди в playtest), `PageSection.tsx` (редактор очереди)

---

### Приоритет 3: Портреты — интеграция со спикером

Сейчас: портрет привязан к `assetId` вручную. Нет автосвязи speaker → portrait.

**Задачи:**

1. **Speaker → portrait mapping** в реестре спикеров:
   ```ts
   Speaker {
     id: string;
     displayName: LocalizedString;
     portraitAssetId?: string;   // ← новое
   }
   ```

2. **Portrait widget**: если `data.speakerId` задан → автоматически берёт `portraitAssetId` у этого спикера (override можно через `data.variant`).

3. **Смена спикера на странице** → portrait авто-переключается в редакторе (live preview).

4. **Variant picker в editor**: в инспекторе portrait показывает список вариантов из `asset.variants`, можно выбрать дефолтный для страницы.

**Файлы:** `lib/store.ts` (Speaker type), `PageSection.tsx` (поле portraitAssetId у спикера), `KonvaCanvasInner.tsx` (fallback логика)

---

### Приоритет 4: Widget Animations — анимации виджетов

| Анимация | Виджет | Реализация |
|---|---|---|
| Slide-in/out | любой | `visibleWhen` переход: tween x или opacity за 200ms |
| Shake on select | `dialogueBox` | уже есть `[shake]` + intensity trigger |
| Bounce on appear | `choiceButton` | при первом рендере — scale 0.8 → 1.0 |
| Fade page transition | все виджеты | при смене страницы — opacity 0 → 1 |
| Pulse | `intensityBar` | при critical value (<20%) — мигание |

**Реализация:** `useEffect` с Konva `Tween` на Konva-ноде. Анимационный стейт в `useState<Record<widgetId, AnimState>>`. Не затрагивает store (только визуал).

---

### Приоритет 5: Глобальные темы виджетов

Сейчас стили (`boxFill`, `boxStroke`, `accentColor`) захардкожены в рендерере на каждый тип виджета.

**Задача:** вынести в глобальный `dialogueTheme` объект в store:
```ts
dialogueTheme: {
  boxFill: string;
  boxStroke: string;
  boxCornerRadius: number;
  textColor: string;
  nameTagColor: string;
  fontFamily: string;
}
```

- Редактор темы в МИР-табе (color pickers)
- Экспорт/импорт темы отдельным JSON
- Быстрые пресеты: Dark Fantasy (текущий), Light Scroll, Cyberpunk, Clean White

**Файлы:** `lib/store.ts`, `KonvaCanvasInner.tsx` (заменить хардкод на `dialogueTheme.*`), `app/page.tsx` (UI темы в МИР-табе)

---

### Приоритет 6: Battle HUD виджет

По GDD игра имеет пошаговую боевую систему. Нужен новый тип виджета.

```ts
UIWidgetType = ... | 'battleHUD'
```

Виджет отображает:
- HP bar (привязан к переменной)
- Resolve bar
- Очередь ходов (иконки из assets)
- Накал (уже есть `intensityBar`)

Можно реализовать как составной widget или как набор отдельных `intensityBar` виджетов.
Рекомендуется второй вариант (без нового типа) пока боевая система не определена точнее.

---

### Приоритет 7: Copy/Paste виджетов

| Действие | Реализация |
|---|---|
| Ctrl+C | Скопировать выбранный widget/button в `clipboard` (store field) |
| Ctrl+V | Вставить со смещением +2% x/y, новый id |
| Ctrl+D | Дублировать на месте (как duplicate page, но для виджетов) |

**Файлы:** `lib/store.ts` (поле `clipboard: UIWidget | StudioButton | null`), `KonvaCanvasInner.tsx` (keydown listener на Stage или window), `app/page.tsx` (keyboard shortcut guard)

---

### Приоритет 8: Speech Bubble (опционально)

Тип виджета `speechBubble`:
- Хвостик (tail) направлен к портрету говорящего
- `tailDirection: 'left' | 'right' | 'bottom'`
- Рисуется как Path (Konva `Line` или `Shape`)
- Полезно для мини-диалогов поверх сцены без bottom bar

---

## 13. Технические долги Phase 5

| Долг | Где | Приоритет |
|---|---|---|
| `fontStyle` bold+italic не комбинируется | `KonvaCanvasInner.tsx:685` | Высокий |
| Typewriter считает raw chars, не visible | `KonvaCanvasInner.tsx` typewriter effect | Высокий |
| `any` в widget handlers | `KonvaCanvasInner.tsx` | Средний |
| `KonvaCanvasInner.tsx` >1400 строк | разбить на `widgets/*.tsx` | Средний |
| Portrait без asset — Text height выходит за bounds | Исправлено в текущей сессии ✅ | — |

---

## 14. Рекомендуемый порядок реализации

```
Приоритет 1: Rich Text доработка       ← небольшой, высокий эффект
Приоритет 2: Dialogue Flow (очередь)   ← ключевое для нарратива
Приоритет 3: Speaker → Portrait link   ← связывает данные между собой
Приоритет 7: Copy/Paste                ← QoL, быстрая реализация
Приоритет 5: Темы виджетов             ← визуальная целостность
Приоритет 4: Animations                ← polish
Приоритет 6: Battle HUD                ← зависит от боевой системы
Приоритет 8: Speech Bubble             ← опционально
```