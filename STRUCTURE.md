# SLAY ADVENTURE — Studio: структура проекта

Монорепо: `C:\SLAY ADVENTURE\studio` — редактор (Next.js 16 App Router).  
Игровой движок (будущее) будет отдельным пакетом.

---

## Верхний уровень

```
studio/
├── app/                      # Next.js App Router
├── components/               # React-компоненты
│   ├── editor/               # Редактор
│   └── ui/                   # Базовые UI-примитивы
├── lib/                      # Бизнес-логика, типы, утилиты
│   ├── store/                # Zustand-стор
│   │   └── slices/           # Слайсы стора
│   └── types/                # TypeScript-типы
└── public/                   # Статика
```

---

## `app/` — слой Next.js

| Файл | Что делает |
|---|---|
| `layout.tsx` | Root-layout: шрифты, глобальные стили, `<html lang>` |
| `page.tsx` | Главная страница — собирает редактор: шапка, левая панель, холст, правая панель. Управляет HUD, режимом playtest, баннером выхода |

---

## `components/editor/` — компоненты редактора

### Шапка и навигация

| Файл | Что делает |
|---|---|
| `layout/EditorHeader.tsx` | Верхняя шапка: имя проекта, Playtest / Сброс / Загрузить, выбор разрешения холста, экспорт |
| `LeftSidebar.tsx` | Левая панель: дерево актов и страниц, создание/удаление/переименование, drag-and-drop между актами |

### Холст

| Файл | Что делает |
|---|---|
| `KonvaCanvas.tsx` | Тонкий враппер над Konva: динамический импорт (SSR-guard), пробрасывает `width/height` |
| `KonvaCanvasInner.tsx` | Ядро рендера холста: Stage → Layer → кнопки → виджеты, Transformer, drag, snap к направляющим, клавиатурные шорткаты (Del, Ctrl+C/V/D/Z/Y) |
| `canvas/ButtonRenderer.tsx` | Рендер одной кнопки на холсте: визуальные состояния, drag, snap, клик в плейтесте |
| `canvas/WidgetContent.tsx` | Рендер всех 8 типов виджетов: dialogueBox, textLabel, portrait, choiceButton, quickAction, intensityBar, container, customImage |
| `CanvasWithRulers.tsx` | Враппер холста с линейками (px-шкала по горизонтали и вертикали) |

### Правая панель

| Файл | Что делает |
|---|---|
| `PageSection.tsx` | Вкладка «Страница»: настройки сцены (тип, спикер, фон, HUD-флаг), список кнопок, инспектор кнопки |
| `WorldPanel.tsx` | Вкладка «Мир»: предметы, переменные, фоны, спикеры, тема диалога, начальный инвентарь |
| `PlaytestStatePanel.tsx` | Правая панель в режиме плейтеста: live-значения переменных, снаряжение |

### Модальные окна

| Файл | Что делает |
|---|---|
| `WidgetLibrary.tsx` | Библиотека виджетов (Ctrl+W / кнопка «+ Виджет»): каталог по категориям, drag на холст |
| `InventoryModal.tsx` | Инвентарь игрока в плейтесте: список предметов, количества, кнопки «Выбросить» / «Использовать» |
| `InventoryMannequin.tsx` | Слоты снаряжения (внутри InventoryModal): визуализация надетых предметов по слотам |
| `ItemCreationModal.tsx` | Модалка создания нового предмета: поля имени, типа, редкости, слота, модификаторов |
| `ItemRewardModal.tsx` | Модалка награды (action `showItemReward`): показывает полученные предметы, кнопка «Забрать» |

### Редакторы логики

| Файл | Что делает |
|---|---|
| `ActionEditor.tsx` | Редактор действия кнопки: type-selector + поля под каждый тип (goToPage, setVariable, giveItem, showItemReward и др.) |
| `ConditionEditor.tsx` | Редактор условия показа/блокировки кнопки: дерево условий (variable, itemQuantity, and/or/not) |

### HUD

| Файл | Что делает |
|---|---|
| `TopResourceBar.tsx` | Полоска ресурсов поверх холста (health, mana, coins и т.д.): видна в редакторе всегда, в плейтесте — по условию сцены. Управляется флагом `showTopResourceBar` на странице |

---

## `components/ui/` — базовые UI-примитивы

Shadcn-style компоненты, не содержат бизнес-логики:  
`button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `tabs.tsx`, `textarea.tsx`

---

## `lib/store/` — Zustand-стор

### Точка входа

| Файл | Что делает |
|---|---|
| `index.ts` | Публичный barrel: реэкспортирует `useStudioStore`, `useCurrentPage`, все типы, хелперы из `combat.ts` |
| `store.ts` | Объявляет тип `StudioState` и начальное состояние. Создаёт стор через `create<StudioState>()`, спредя все 6 слайсов |
| `defaults.ts` | Фабрики начальных данных: `createDefaultPage()`, `createDefaultPages()`, `createInitialMeta()`, `createDefaultSpeakers()` |
| `combat.ts` | Чистые функции расчёта боевых характеристик: `getPlaytestStatValue`, `getEquippedItems`, `getTotalDamage`, `getEffectiveCritChance` и др. Не мутируют стор |

### `slices/` — реализации методов стора

| Файл | Что делает |
|---|---|
| `ui.ts` | Сворачивание/разворачивание боковых панелей, модалка библиотеки виджетов, collapse-состояния блоков (переменные, предметы и т.д.) |
| `canvas.ts` | Направляющие (add/remove/move/clear), привязка (snap), `setCanvasSize`, canvas undo/redo (`saveCanvasSnapshot`, `undoCanvas`, `redoCanvas`) |
| `world.ts` | CRUD предметов, переменных, фонов, UI-ассетов, спикеров; тема диалога; начальный инвентарь; пресеты характеристик ГГ (`addDefaultPlayerStats`, `addDefaultResources`, `addCriticalStats`) |
| `pages.ts` | CRUD страниц, кнопок, UI-виджетов, актов, диалоговых реплик; координатный буфер обмена; виджетный буфер обмена (Ctrl+C/V/D); переименование страниц (`renamePage`) |
| `playtest.ts` | Режимы редактор/плейтест (`enterPlaytest`, `exitPlaytest`), сброс/загрузка состояния (`resetPlaytestState`, `loadPlaytestProgress`), снаряжение, инвентарные действия (`dropItem`, `useItem`), `executeAction` — главный диспетчер всех action-типов |
| `persistence.ts` | `saveToLocalStorage`, `loadFromLocalStorage` (с миграциями), `exportProject` (скачать JSON), `importProject`, `createNewProject`, `setProjectName` |

---

## `lib/types/` — TypeScript-типы

| Файл | Что содержит |
|---|---|
| `index.ts` | Реэкспортирует все файлы типов |
| `core.ts` | `LocalizedString`, `Speaker`, `DialogueTheme`, `DIALOGUE_THEME_PRESETS` |
| `pages.ts` | `StudioPage`, `StudioButton`, `Background`, `BackgroundSettings`, `ProjectMeta`, `DialogueLine` |
| `variables.ts` | `Variable`, `Condition` (все типы: `variable`, `itemQuantity`, `and`, `or`, `not`), `ComparisonOperator` |
| `actions.ts` | `ButtonAction` — дискриминированный union всех типов действий кнопки |
| `items.ts` | `Item`, `EquipmentSlot`, `ItemModifier` |
| `widgets.ts` | `UIWidget`, `UIWidgetType`, `UIAsset`, `StudioAct` |

---

## `lib/` — утилиты

| Файл | Что делает |
|---|---|
| `conditions.ts` | `evaluateCondition()` — рекурсивный вычислитель дерева условий по значениям переменных |
| `snapping.ts` | `getSnappedButtonPosition()` — геометрия привязки кнопки к направляющим при drag |
| `richText.ts` | `parseRichText()`, `layoutRichText()` — парсер разметки диалогов (`**bold**`, `[red]...[/red]`, `[size:N]`, `[wave]`, `[shake]`, `[pause]`) и движок верстки для Konva |
| `widgetCatalog.ts` | `WIDGET_CATALOG` — статический реестр всех типов виджетов: `type`, `name`, `description`, `emoji`, `defaultLayout`. Используется библиотекой виджетов |
| `presetsStore.ts` | Отдельный Zustand-стор (с `persist`) для пользовательских пресетов виджетов. Не зависит от основного стора |
| `utils.ts` | `cn()` — утилита слияния tailwind-классов (clsx + tailwind-merge) |

---

## Ключевые потоки данных

```
app/page.tsx
  └─ useStudioStore()          ← единственный источник истины
       ├─ LeftSidebar          — страницы, акты
       ├─ EditorHeader         — мета, режим, разрешение
       ├─ KonvaCanvas          → KonvaCanvasInner
       │    ├─ ButtonRenderer  — кнопки
       │    └─ WidgetContent   — виджеты
       ├─ PageSection          — инспектор страницы
       └─ WorldPanel           — мир (предметы, переменные…)
```

Режим плейтеста: `enterPlaytest()` сворачивает панели, `executeAction()` мутирует `playtestState.variableValues`. Выход через `exitPlaytest()` разворачивает панели обратно.

---

## Соглашения

- Все размеры кнопок и виджетов — **проценты** (`x`, `y`, `width`, `height` в 0–100), не пиксели. Абсолютные px рассчитываются на лету через `width * (value / 100)`.
- Импорты из стора — **только через `@/lib/store`** (barrel), не через `./store` напрямую.
- Слайсы используют `(set: any, get: any)` — типизация проверяется на уровне `create<StudioState>()` в `store.ts`.
- `saveToLocalStorage()` вызывается в конце каждого мутирующего метода. Методы плейтеста (кроме `savePlaytestProgress`) — не сохраняют.

---

> **При добавлении новых функций обязательно обновить этот документ:**
> - Новый компонент → добавить строку в соответствующую таблицу `components/`.
> - Новый метод стора → добавить в таблицу нужного слайса.
> - Новый тип → добавить в таблицу `lib/types/`.
> - Новый утилитарный файл → добавить в таблицу `lib/`.
> - Изменился поток данных или архитектурное решение → обновить секцию «Ключевые потоки данных» или «Соглашения».
