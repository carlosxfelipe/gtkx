# Changelog: v0.15.0 → HEAD

## Breaking Changes

### CSS Package
- **`cx()` return type changed**: Now returns `string[]` instead of `string`
  ```tsx
  // Before
  <GtkButton cssClasses={[cx(base, active)]} />

  // After
  <GtkButton cssClasses={cx(base, active)} />
  ```

### Event Controller Callbacks
All event controller callbacks now receive `Gdk.Event | null` as the final parameter:
- `onEnter(x, y)` → `onEnter(x, y, event)`
- `onLeave()` → `onLeave(event)`
- `onMotion(x, y)` → `onMotion(x, y, event)`
- `onPressed(nPress, x, y)` → `onPressed(nPress, x, y, event)`
- `onReleased(nPress, x, y)` → `onReleased(nPress, x, y, event)`
- `onKeyPressed(keyval, keycode, state)` → `onKeyPressed(keyval, keycode, state, event)`
- `onKeyReleased(keyval, keycode, state)` → `onKeyReleased(keyval, keycode, state, event)`
- `onScroll(dx, dy)` → `onScroll(dx, dy, event)`

### Removed Virtual Child Elements
The following virtual child elements have been removed in favor of direct widget props:
- `x.Adjustment` → Use adjustment props directly on adjustable widgets
- `x.ScaleMark` → Use `marks` prop on `<GtkScale>`
- `x.CalendarMark` → Use `markedDays` prop on `<GtkCalendar>`
- `x.LevelBarOffset` → Use `offsets` prop on `<GtkLevelBar>`
- `x.TextBuffer` → Use buffer props directly on `<GtkTextView>`
- `x.SourceBuffer` → Use buffer props directly on `<GtkSourceView>`

---

## New Features

### Animation Support (`x.Animation`)
Declarative animations with Framer Motion-like API using libadwaita's animation primitives:
```tsx
<x.Animation
  initial={{ opacity: 0, scaleX: 0.8 }}
  animate={{ opacity: 1, scaleX: 1 }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
  onAnimationComplete={() => console.log("done")}
>
  <GtkBox>...</GtkBox>
</x.Animation>
```
Supports spring and timed transitions.

### Declarative Text Styling
New nodes for rich text in `<GtkTextView>` and `<GtkSourceView>`:
- **`x.TextTag`** - Text formatting with font, color, spacing, style properties
- **`x.TextAnchor`** - Embed widgets within text flow
- **`x.TextPaintable`** - Embed inline images/icons in text

```tsx
<GtkTextView>
  <x.TextTag foreground="blue" weight={Pango.Weight.BOLD}>
    Styled text content
  </x.TextTag>
  <x.TextAnchor>
    <GtkButton label="Inline button" />
  </x.TextAnchor>
</GtkTextView>
```

### Dialog Widgets
- **`<AdwAlertDialog>`** with `<x.AlertDialogResponse>` children for response buttons
- **`<AdwColorDialogButton>`** - Color picker dialog button
- **`<AdwFontDialogButton>`** - Font picker dialog button

### New Gesture Controllers
All available as props on any widget:

- **`GestureStylusProps`** - Tablet/stylus input with pressure and tilt
  - `onStylusDown`, `onStylusMotion`, `onStylusUp`, `onStylusProximity`
- **`GestureRotateProps`** - Two-finger rotation gestures
  - `onRotateAngleChanged`, `onRotateBegin`, `onRotateEnd`, `gestureRotateRef`
- **`GestureSwipeProps`** - Swipe detection
  - `onSwipe(velocityX, velocityY, event)`
- **`GestureLongPressProps`** - Long press detection
  - `onLongPressPressed`, `onLongPressCancelled`
- **`GestureZoomProps`** - Pinch zoom gestures
  - `onZoomScaleChanged(scale, event)`, `gestureZoomRef`

### Drag Source Enhancements
New props for custom drag icons:
- `dragIcon?: Gdk.Paintable | null`
- `dragIconHotX?: number`
- `dragIconHotY?: number`

### OverlayChild Multiple Children
`<x.OverlayChild>` now supports multiple children in a single overlay slot.

---

## New Widget Props

### Adjustable Widgets (Scale, SpinButton, VolumeButton, Scrollbar)
Direct props replacing the removed `x.Adjustment`:
- `value`, `lower`, `upper`, `stepIncrement`, `pageIncrement`, `pageSize`, `onValueChanged`

### GtkScale
- `marks: ScaleMark[]` - Array of marks with `value`, `position`, `markup`

### GtkCalendar
- `markedDays: number[]` - Array of day numbers (1-31) to highlight

### GtkLevelBar
- `offsets: LevelBarOffset[]` - Array of named offset thresholds

### GtkTextView / GtkSourceView
- `enableUndo`, `onBufferChanged`, `onTextInserted`, `onTextDeleted`
- `onCanUndoChanged`, `onCanRedoChanged`

### GtkSourceView (additional)
- `language`, `styleScheme`, `highlightSyntax`, `highlightMatchingBrackets`
- `implicitTrailingNewline`, `onCursorMoved`, `onHighlightUpdated`

### GtkNotebookPage
- `tabExpand?: boolean`
- `tabFill?: boolean`

### Fixed Child
- `transform?: Gsk.Transform` - 3D transform support

### AboutDialog
- `creditSections` - Custom credit sections with people lists

---

## FFI Package

### New Exports
- `readPointer`, `writePointer` - Low-level pointer manipulation utilities

### New Callback Support
- `ScaleFormatValueFunc` - Custom scale value formatting
- `ShapeRendererFunc` - Pango shape rendering
- `PathIntersectionFunc` - Cairo path intersection

### Cairo Additions
- `cairo.Surface`, `cairo.PdfSurface` and related context methods

---

## Bug Fixes
- Fixed CSS nested rules parser for complex selectors
- Fixed TreeList initial selection behavior
- Fixed HashMaps with different key/value types
- Fixed `setBoxed`/`getBoxed` handling in native layer
- Fixed instance parameter ownership for certain FFI calls
