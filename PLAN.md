# Comprehensive Test Plan: `call` Function Type Permutations

## Overview

Reorganize the `@gtkx/native` package's `call.test.ts` into a dedicated `call/` folder with separate test files for each argument/return type. This enables comprehensive coverage of all type permutations supported by the FFI layer.

## Current State

The existing `call.test.ts` has basic coverage:
- **Primitives**: boolean, one integer size (32-bit signed), one float size (64-bit)
- **Strings**: owned only, empty, unicode
- **GObjects**: owned and borrowed
- **Arrays**: string arrays only
- **Refs**: integer refs only
- **Callbacks**: closure trampoline only

## Supported Types (from Rust implementation)

```typescript
type Type =
    | IntegerType      // { type: "int"; size: 8|16|32|64; unsigned?: boolean }
    | FloatType        // { type: "float"; size: 32|64 }
    | BooleanType      // { type: "boolean" }
    | StringType       // { type: "string"; borrowed?: boolean }
    | GObjectType      // { type: "gobject"; borrowed?: boolean }
    | BoxedType        // { type: "boxed"; borrowed?: boolean; innerType: string; lib?: string }
    | ArrayType        // { type: "array"; itemType: Type; listType?: "glist"|"gslist"; borrowed?: boolean }
    | RefType          // { type: "ref"; innerType: Type }
    | CallbackType     // { type: "callback"; trampoline?: ...; argTypes?; returnType?; sourceType?; resultType? }
    | NullType         // { type: "null" }
    | UndefinedType;   // { type: "undefined" }
```

---

## New Test Structure

```
packages/native/tests/
├── call/
│   ├── integer.test.ts      # All 8 integer permutations
│   ├── float.test.ts        # Both float sizes
│   ├── boolean.test.ts      # Boolean type
│   ├── string.test.ts       # Owned/borrowed strings
│   ├── gobject.test.ts      # Owned/borrowed GObjects
│   ├── boxed.test.ts        # Boxed types (owned/borrowed)
│   ├── array.test.ts        # Arrays with different item types and list types
│   ├── ref.test.ts          # Out-parameters with different inner types
│   ├── callback.test.ts     # All 6 callback trampolines
│   ├── null.test.ts         # Null pointer type
│   ├── undefined.test.ts    # Void return type
│   └── error-handling.test.ts  # Error cases (invalid symbol, etc.)
├── create-ref.test.ts
├── batch-call.test.ts
├── start.test.ts
├── read-write.test.ts
├── alloc.test.ts
├── get-object-id.test.ts
├── test-setup.ts
├── vitest-setup.ts
└── global-setup.ts
```

---

## Test File Specifications

### 1. `call/integer.test.ts`

Tests all 8 integer type permutations (4 sizes × 2 signs).

**Permutations:**

| Size | Signed | Type Descriptor | Test Functions |
|------|--------|-----------------|----------------|
| 8 | ✓ | `{ type: "int", size: 8 }` | Use GLib byte-level APIs |
| 8 | ✗ | `{ type: "int", size: 8, unsigned: true }` | Use GLib byte-level APIs |
| 16 | ✓ | `{ type: "int", size: 16 }` | |
| 16 | ✗ | `{ type: "int", size: 16, unsigned: true }` | |
| 32 | ✓ | `{ type: "int", size: 32 }` | `gtk_label_set_max_width_chars` |
| 32 | ✗ | `{ type: "int", size: 32, unsigned: true }` | Flags/enums (GApplicationFlags) |
| 64 | ✓ | `{ type: "int", size: 64 }` | Signal handler IDs |
| 64 | ✗ | `{ type: "int", size: 64, unsigned: true }` | `g_signal_connect_data` return |

**Test Cases:**

```typescript
describe("call - integer types", () => {
    // 8-bit integers
    describe("8-bit", () => {
        it("passes and returns signed 8-bit integers", () => {});
        it("passes and returns unsigned 8-bit integers", () => {});
        it("handles minimum signed 8-bit value (-128)", () => {});
        it("handles maximum signed 8-bit value (127)", () => {});
        it("handles maximum unsigned 8-bit value (255)", () => {});
    });

    // 16-bit integers
    describe("16-bit", () => {
        it("passes and returns signed 16-bit integers", () => {});
        it("passes and returns unsigned 16-bit integers", () => {});
        it("handles minimum signed 16-bit value (-32768)", () => {});
        it("handles maximum signed 16-bit value (32767)", () => {});
        it("handles maximum unsigned 16-bit value (65535)", () => {});
    });

    // 32-bit integers
    describe("32-bit", () => {
        it("passes and returns signed 32-bit integers", () => {});
        it("passes and returns unsigned 32-bit integers", () => {});
        it("handles negative values", () => {});
        it("handles zero", () => {});
        it("handles large positive values", () => {});
    });

    // 64-bit integers
    describe("64-bit", () => {
        it("passes and returns signed 64-bit integers", () => {});
        it("passes and returns unsigned 64-bit integers", () => {});
        it("handles values beyond 32-bit range", () => {});
    });

    describe("edge cases", () => {
        it("handles integer as argument and return type simultaneously", () => {});
        it("handles multiple integer arguments of different sizes", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_label_set_max_width_chars` / `gtk_label_get_max_width_chars` (32-bit signed)
- `gtk_grid_attach` (32-bit signed for column/row/width/height)
- `g_signal_connect_data` return value (64-bit unsigned)
- `g_application_run` return value (32-bit signed exit code)
- `gtk_box_new` orientation parameter (enum, 32-bit)

---

### 2. `call/float.test.ts`

Tests both float type permutations.

**Permutations:**

| Size | Type Descriptor | Test Functions |
|------|-----------------|----------------|
| 32 | `{ type: "float", size: 32 }` | `gtk_range_set_value` (internally uses gdouble but tests precision) |
| 64 | `{ type: "float", size: 64 }` | `gtk_widget_set_opacity`, `gtk_range_set_value` |

**Test Cases:**

```typescript
describe("call - float types", () => {
    describe("32-bit float", () => {
        it("passes and returns 32-bit float values", () => {});
        it("handles small fractional values", () => {});
        it("handles large values", () => {});
        it("handles negative values", () => {});
    });

    describe("64-bit float (double)", () => {
        it("passes and returns 64-bit float values", () => {});
        it("handles values with high precision", () => {});
        it("handles very small values (near zero)", () => {});
        it("handles very large values", () => {});
    });

    describe("edge cases", () => {
        it("handles zero", () => {});
        it("handles negative zero", () => {});
        it("preserves precision for 64-bit floats", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_widget_set_opacity` / `gtk_widget_get_opacity` (64-bit)
- `gtk_range_set_value` / `gtk_range_get_value` (64-bit)
- `gtk_adjustment_new` (multiple 64-bit params)
- `gtk_progress_bar_set_fraction` / `gtk_progress_bar_get_fraction` (64-bit)

---

### 3. `call/boolean.test.ts`

Tests boolean type (GLib gboolean, internally u8).

**Test Cases:**

```typescript
describe("call - boolean type", () => {
    it("passes true and returns true", () => {});
    it("passes false and returns false", () => {});
    it("toggles boolean state correctly", () => {});
    it("handles boolean as argument and return simultaneously", () => {});

    describe("edge cases", () => {
        it("treats any truthy JS value as true", () => {});
        it("treats any falsy JS value as false", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_label_set_selectable` / `gtk_label_get_selectable`
- `gtk_widget_set_visible` / `gtk_widget_get_visible`
- `gtk_button_set_has_frame` / `gtk_button_get_has_frame`
- `gtk_widget_set_sensitive` / `gtk_widget_get_sensitive`

---

### 4. `call/string.test.ts`

Tests owned and borrowed string types.

**Permutations:**

| Ownership | Type Descriptor | When to Use |
|-----------|-----------------|-------------|
| Owned | `{ type: "string" }` | Caller allocates, GTK copies |
| Borrowed | `{ type: "string", borrowed: true }` | GTK returns internal pointer |

**Test Cases:**

```typescript
describe("call - string types", () => {
    describe("owned strings", () => {
        it("passes owned string as argument", () => {});
        it("returns newly allocated string", () => {});
        it("handles empty strings", () => {});
        it("handles unicode strings", () => {});
        it("handles strings with special characters", () => {});
        it("handles very long strings", () => {});
    });

    describe("borrowed strings", () => {
        it("returns borrowed string from GTK", () => {});
        it("borrowed string remains valid during object lifetime", () => {});
    });

    describe("memory leaks", () => {
        it("does not leak owned strings passed as arguments", () => {});
        it("does not leak returned owned strings", () => {});
        it("does not leak when setting many strings in loop", () => {});
        it("properly frees string when JS string is garbage collected", () => {});
        it("does not double-free borrowed strings", () => {});
    });

    describe("edge cases", () => {
        it("handles null bytes in middle of string", () => {});
        it("handles emoji and complex unicode", () => {});
        it("handles RTL text", () => {});
        it("handles mixed encodings", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_label_new` (owned input)
- `gtk_label_set_text` / `gtk_label_get_text` (owned/borrowed)
- `gtk_button_set_label` / `gtk_button_get_label`
- `gtk_entry_set_text` / `gtk_entry_get_text`
- `gtk_window_set_title` / `gtk_window_get_title`
- `g_strdup` / `g_free` (for verifying string ownership)

---

### 5. `call/gobject.test.ts`

Tests owned and borrowed GObject reference types.

**Permutations:**

| Ownership | Type Descriptor | Memory Behavior |
|-----------|-----------------|-----------------|
| Owned | `{ type: "gobject" }` | Caller receives reference, must unref |
| Borrowed | `{ type: "gobject", borrowed: true }` | GTK owns, valid during call |

**Test Cases:**

```typescript
describe("call - gobject types", () => {
    describe("owned gobjects", () => {
        it("creates and returns owned GObject", () => {});
        it("passes owned GObject as argument", () => {});
        it("transfers ownership to GTK (floating ref sink)", () => {});
    });

    describe("borrowed gobjects", () => {
        it("returns borrowed GObject (parent relationship)", () => {});
        it("borrowed GObject remains valid with parent", () => {});
        it("passes GObject as borrowed argument", () => {});
    });

    describe("widget hierarchy", () => {
        it("creates parent-child relationships", () => {});
        it("retrieves children from containers", () => {});
        it("retrieves parent from child", () => {});
    });

    describe("refcount management", () => {
        it("increments refcount when receiving owned GObject", () => {});
        it("does not increment refcount for borrowed GObject", () => {});
        it("sinks floating refs on initial ownership", () => {});
        it("maintains correct refcount after multiple passes", () => {});
        it("refcount decrements when JS object is garbage collected", () => {});
    });

    describe("memory leaks", () => {
        it("does not leak when creating many GObjects in loop", () => {});
        it("does not leak when passing GObject to container", () => {});
        it("does not leak when removing GObject from container", () => {});
        it("properly releases GObject when parent is destroyed", () => {});
    });

    describe("edge cases", () => {
        it("handles null GObject when optional", () => {});
        it("handles same GObject passed multiple times", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_label_new`, `gtk_button_new`, `gtk_box_new` (owned returns)
- `gtk_box_append`, `gtk_box_remove` (owned args)
- `gtk_widget_get_parent` (borrowed return)
- `gtk_widget_get_first_child` / `gtk_widget_get_next_sibling` (borrowed)
- `gtk_window_set_child` / `gtk_window_get_child`
- `g_object_ref` / `g_object_unref` (refcount manipulation for testing)
- `g_object_ref_count` (via `G_OBJECT(obj)->ref_count` or internal access)

---

### 6. `call/boxed.test.ts`

Tests boxed types (heap-allocated structs with copy/free semantics).

**Permutations:**

| Ownership | Type Descriptor |
|-----------|-----------------|
| Owned | `{ type: "boxed", innerType: "GdkRGBA", lib: "libgtk-4.so.1" }` |
| Borrowed | `{ type: "boxed", innerType: "GdkRGBA", lib: "libgtk-4.so.1", borrowed: true }` |

**Test Cases:**

```typescript
describe("call - boxed types", () => {
    describe("GdkRGBA", () => {
        it("creates RGBA boxed type", () => {});
        it("passes RGBA to style functions", () => {});
        it("returns RGBA from color parsing", () => {});
    });

    describe("GdkRectangle", () => {
        it("creates rectangle boxed type", () => {});
        it("passes rectangle as argument", () => {});
        it("returns rectangle from widget geometry", () => {});
    });

    describe("PangoFontDescription", () => {
        it("creates font description", () => {});
        it("modifies font description", () => {});
    });

    describe("ownership", () => {
        it("handles owned boxed (caller must free)", () => {});
        it("handles borrowed boxed (valid during call)", () => {});
    });

    describe("memory leaks", () => {
        it("does not leak owned boxed types", () => {});
        it("does not leak when creating many boxed in loop", () => {});
        it("properly copies boxed when passing owned", () => {});
        it("properly frees boxed when JS object is garbage collected", () => {});
        it("does not double-free borrowed boxed", () => {});
    });

    describe("edge cases", () => {
        it("handles boxed types from different libraries", () => {});
    });
});
```

**GTK Functions to Use:**
- `gdk_rgba_parse` (creates owned GdkRGBA)
- `gtk_color_dialog_button_get_rgba` (returns borrowed GdkRGBA)
- `pango_font_description_new` / `pango_font_description_from_string`
- `gtk_widget_get_allocation` (out-param GdkRectangle)
- `gdk_rgba_copy` / `gdk_rgba_free` (for verifying copy/free semantics)
- `pango_font_description_copy` / `pango_font_description_free`

---

### 7. `call/array.test.ts`

Tests array types with different item types and list implementations.

**Permutations:**

| List Type | Item Type | Type Descriptor |
|-----------|-----------|-----------------|
| Array | string | `{ type: "array", itemType: { type: "string" } }` |
| Array | int32 | `{ type: "array", itemType: { type: "int", size: 32 } }` |
| Array | gobject | `{ type: "array", itemType: { type: "gobject" } }` |
| GList | gobject | `{ type: "array", itemType: { type: "gobject" }, listType: "glist" }` |
| GSList | gobject | `{ type: "array", itemType: { type: "gobject" }, listType: "gslist" }` |

**Test Cases:**

```typescript
describe("call - array types", () => {
    describe("string arrays", () => {
        it("passes string array argument", () => {});
        it("returns string array", () => {});
        it("handles empty string array", () => {});
        it("handles single-element array", () => {});
        it("handles array with unicode strings", () => {});
    });

    describe("integer arrays", () => {
        it("passes 32-bit integer array", () => {});
        it("returns integer array", () => {});
        it("handles mixed positive/negative values", () => {});
    });

    describe("gobject arrays", () => {
        it("returns array of GObjects", () => {});
        it("passes array of GObjects", () => {});
    });

    describe("GList", () => {
        it("returns GList of widgets", () => {});
        it("iterates GList correctly", () => {});
        it("handles empty GList", () => {});
    });

    describe("GSList", () => {
        it("returns GSList", () => {});
        it("handles empty GSList", () => {});
    });

    describe("ownership", () => {
        it("handles owned arrays (caller frees)", () => {});
        it("handles borrowed arrays (GTK owns)", () => {});
    });

    describe("memory leaks", () => {
        it("does not leak string array elements", () => {});
        it("does not leak array container", () => {});
        it("does not leak GList nodes", () => {});
        it("does not leak GSList nodes", () => {});
        it("does not leak GObjects in array", () => {});
        it("properly frees nested structures", () => {});
        it("does not leak when creating many arrays in loop", () => {});
    });

    describe("edge cases", () => {
        it("handles null-terminated string arrays", () => {});
        it("handles very large arrays", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_widget_set_css_classes` / `gtk_widget_get_css_classes` (string array)
- `gtk_flow_box_get_selected_children` (GList of widgets)
- `gtk_container_get_children` style functions (GList)
- `g_list_store_new` / operations (GList manipulation)
- `g_strfreev` (verify string array cleanup)
- `g_list_free` / `g_list_free_full` (verify GList cleanup)
- `g_slist_free` / `g_slist_free_full` (verify GSList cleanup)

---

### 8. `call/ref.test.ts`

Tests reference (out-parameter) types with different inner types.

**Permutations:**

| Inner Type | Type Descriptor | Use Case |
|------------|-----------------|----------|
| int32 | `{ type: "ref", innerType: { type: "int", size: 32 } }` | Widget measurement |
| int64 | `{ type: "ref", innerType: { type: "int", size: 64 } }` | Large values |
| float64 | `{ type: "ref", innerType: { type: "float", size: 64 } }` | Progress values |
| gobject | `{ type: "ref", innerType: { type: "gobject" } }` | Object creation |
| boxed | `{ type: "ref", innerType: { type: "boxed", ... } }` | Struct output |

**Test Cases:**

```typescript
describe("call - ref types", () => {
    describe("integer refs", () => {
        it("populates 32-bit signed integer ref", () => {});
        it("populates 32-bit unsigned integer ref", () => {});
        it("populates 64-bit integer ref", () => {});
        it("handles multiple integer refs in same call", () => {});
    });

    describe("float refs", () => {
        it("populates 64-bit float ref", () => {});
    });

    describe("gobject refs", () => {
        it("populates gobject ref", () => {});
    });

    describe("boxed refs", () => {
        it("populates boxed type ref (GdkRectangle)", () => {});
    });

    describe("null refs", () => {
        it("ignores null refs (optional out params)", () => {});
        it("uses null to indicate unneeded output", () => {});
    });

    describe("memory leaks", () => {
        it("does not leak gobject refs", () => {});
        it("does not leak boxed refs", () => {});
        it("does not leak when using many refs in loop", () => {});
        it("properly handles ref that receives owned value", () => {});
        it("properly handles ref that receives borrowed value", () => {});
    });

    describe("edge cases", () => {
        it("handles ref initial value overwriting", () => {});
        it("handles partial out-param usage (some null)", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_widget_measure` (4 int32 out-params)
- `gtk_widget_compute_bounds` (GdkRectangle out-param)
- `gtk_widget_get_preferred_size` (GtkRequisition out-params)
- `gtk_tree_model_get_iter_first` (GtkTreeIter out-param)

---

### 9. `call/callback.test.ts`

Tests all 6 callback trampolines.

**Permutations:**

| Trampoline | Type Descriptor | Use Case |
|------------|-----------------|----------|
| closure | `{ type: "callback", trampoline: "closure" }` | Signal handlers |
| asyncReady | `{ type: "callback", trampoline: "asyncReady", sourceType, resultType }` | Async operations |
| destroy | `{ type: "callback", trampoline: "destroy" }` | Cleanup callbacks |
| sourceFunc | `{ type: "callback", trampoline: "sourceFunc", returnType }` | Idle/timeout |
| drawFunc | `{ type: "callback", trampoline: "drawFunc" }` | Drawing area |
| compareDataFunc | `{ type: "callback", trampoline: "compareDataFunc", returnType }` | Sorting |

**Test Cases:**

```typescript
describe("call - callback types", () => {
    describe("closure trampoline (signals)", () => {
        it("connects callback to signal", () => {});
        it("invokes callback when signal emits", () => {});
        it("receives signal arguments in callback", () => {});
        it("handles callback that returns value", () => {});
        it("disconnects callback correctly", () => {});
    });

    describe("asyncReady trampoline", () => {
        it("invokes async callback on completion", () => {});
        it("receives source object in callback", () => {});
        it("receives async result in callback", () => {});
        it("handles async error in callback", () => {});
    });

    describe("destroy trampoline", () => {
        it("invokes destroy callback on cleanup", () => {});
        it("receives user data in destroy callback", () => {});
    });

    describe("sourceFunc trampoline (idle/timeout)", () => {
        it("invokes idle callback", () => {});
        it("invokes timeout callback", () => {});
        it("continues when returning true", () => {});
        it("stops when returning false", () => {});
    });

    describe("drawFunc trampoline", () => {
        it("invokes draw callback", () => {});
        it("receives cairo context in callback", () => {});
        it("receives widget dimensions", () => {});
    });

    describe("compareDataFunc trampoline", () => {
        it("invokes compare callback for sorting", () => {});
        it("returns negative for less-than", () => {});
        it("returns zero for equal", () => {});
        it("returns positive for greater-than", () => {});
    });

    describe("callback argument types", () => {
        it("passes integer arguments to callback", () => {});
        it("passes string arguments to callback", () => {});
        it("passes gobject arguments to callback", () => {});
    });

    describe("memory leaks", () => {
        it("does not leak closure when signal handler disconnects", () => {});
        it("does not leak closure when object is destroyed", () => {});
        it("does not leak when connecting many handlers in loop", () => {});
        it("properly releases JS function reference after disconnect", () => {});
        it("does not leak sourceFunc closure after returning false", () => {});
        it("does not leak destroy callback after invocation", () => {});
        it("does not leak drawFunc closure when widget destroyed", () => {});
        it("properly cleans up async callback after completion", () => {});
    });

    describe("edge cases", () => {
        it("handles callback that throws exception", () => {});
        it("handles multiple callbacks on same object", () => {});
    });
});
```

**GTK Functions to Use:**
- `g_signal_connect_data`, `g_signal_connect_closure` (closure)
- `g_file_read_async` + `g_file_read_finish` (asyncReady)
- `g_timeout_add`, `g_idle_add` (sourceFunc)
- `gtk_drawing_area_set_draw_func` (drawFunc)
- `gtk_list_store_set_sort_func` (compareDataFunc)
- `g_object_set_data_full` (destroy)
- `g_signal_handler_disconnect` (for cleanup verification)
- `g_source_remove` (for sourceFunc cleanup)

---

### 10. `call/null.test.ts`

Tests null pointer type.

**Test Cases:**

```typescript
describe("call - null type", () => {
    it("passes null as optional argument", () => {});
    it("passes null for unused out-parameters", () => {});
    it("returns null for absent optional return", () => {});
    it("handles null in array context", () => {});

    describe("edge cases", () => {
        it("distinguishes null from undefined", () => {});
        it("handles null GObject vs missing GObject", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_label_new(null)` (null string creates empty label)
- `gtk_widget_get_parent` on orphan widget (returns null)
- `gtk_widget_measure` with null out-params

---

### 11. `call/undefined.test.ts`

Tests void return type.

**Test Cases:**

```typescript
describe("call - undefined type", () => {
    it("returns undefined for void functions", () => {});
    it("handles void function with no args", () => {});
    it("handles void function with multiple args", () => {});

    describe("edge cases", () => {
        it("return value is exactly undefined, not null", () => {});
    });
});
```

**GTK Functions to Use:**
- `gtk_widget_show` / `gtk_widget_hide` (void return)
- `gtk_label_set_text` (void return)
- `gtk_box_append` (void return)

---

### 12. `call/error-handling.test.ts`

Tests error conditions and edge cases.

**Test Cases:**

```typescript
describe("call - error handling", () => {
    describe("symbol errors", () => {
        it("throws on invalid symbol name", () => {});
        it("throws on misspelled symbol", () => {});
    });

    describe("library errors", () => {
        it("throws on invalid library name", () => {});
        it("throws on library not found", () => {});
    });

    describe("type errors", () => {
        it("throws on invalid type descriptor", () => {});
        it("throws on unknown type name", () => {});
        it("throws on invalid integer size", () => {});
        it("throws on invalid float size", () => {});
    });

    describe("value errors", () => {
        it("throws on wrong value type for integer", () => {});
        it("throws on wrong value type for string", () => {});
        it("throws on non-function for callback", () => {});
    });

    describe("arity errors", () => {
        it("throws on too few arguments", () => {});
        it("throws on too many arguments", () => {});
    });
});
```

---

## Test Utilities

Create shared utilities in `call/test-helpers.ts`:

```typescript
import { call } from "../../index.js";
import { GTK_LIB, GOBJECT_LIB, GIO_LIB, GLIB_LIB, GDK_LIB } from "../test-setup.js";

export { GTK_LIB, GOBJECT_LIB, GIO_LIB, GLIB_LIB };
export const GDK_LIB = "libgtk-4.so.1";
export const PANGO_LIB = "libpango-1.0.so.0";

export function createLabel(text: string = "Test") {
    return call(GTK_LIB, "gtk_label_new", [{ type: { type: "string" }, value: text }], { type: "gobject" });
}

export function createButton(label?: string) {
    if (label) {
        return call(GTK_LIB, "gtk_button_new_with_label", [{ type: { type: "string" }, value: label }], { type: "gobject" });
    }
    return call(GTK_LIB, "gtk_button_new", [], { type: "gobject" });
}

export function createBox(orientation: number = 0, spacing: number = 0) {
    return call(GTK_LIB, "gtk_box_new", [
        { type: { type: "int", size: 32 }, value: orientation },
        { type: { type: "int", size: 32 }, value: spacing }
    ], { type: "gobject" });
}

export const INT8 = { type: "int" as const, size: 8 as const };
export const INT16 = { type: "int" as const, size: 16 as const };
export const INT32 = { type: "int" as const, size: 32 as const };
export const INT64 = { type: "int" as const, size: 64 as const };
export const UINT8 = { type: "int" as const, size: 8 as const, unsigned: true };
export const UINT16 = { type: "int" as const, size: 16 as const, unsigned: true };
export const UINT32 = { type: "int" as const, size: 32 as const, unsigned: true };
export const UINT64 = { type: "int" as const, size: 64 as const, unsigned: true };
export const FLOAT32 = { type: "float" as const, size: 32 as const };
export const FLOAT64 = { type: "float" as const, size: 64 as const };
export const BOOLEAN = { type: "boolean" as const };
export const STRING = { type: "string" as const };
export const STRING_BORROWED = { type: "string" as const, borrowed: true };
export const GOBJECT = { type: "gobject" as const };
export const GOBJECT_BORROWED = { type: "gobject" as const, borrowed: true };
export const NULL = { type: "null" as const };
export const UNDEFINED = { type: "undefined" as const };
```

---

## Migration Steps

1. Create `packages/native/tests/call/` directory
2. Create `test-helpers.ts` with shared utilities
3. Create each test file with comprehensive test cases
4. Remove the original `call.test.ts`
5. Update vitest config if needed (should auto-discover)
6. Run tests to verify all pass
7. Update test count in PLAN.md

---

## Expected Test Count

| File | Estimated Tests |
|------|-----------------|
| integer.test.ts | 17 |
| float.test.ts | 12 |
| boolean.test.ts | 6 |
| string.test.ts | 19 (+5 memory leak) |
| gobject.test.ts | 21 (+9 refcount/memory) |
| boxed.test.ts | 17 (+5 memory leak) |
| array.test.ts | 25 (+7 memory leak) |
| ref.test.ts | 17 (+5 memory leak) |
| callback.test.ts | 30 (+8 memory leak) |
| null.test.ts | 6 |
| undefined.test.ts | 4 |
| error-handling.test.ts | 12 |
| **Total** | **~186** |

Current call.test.ts has 13 tests. The new structure will provide ~14x more comprehensive coverage.

---

## Notes

1. **GTK Functions**: Not all GTK functions may be available for testing every type combination. Some tests may need to use GLib/GIO functions or create custom test scenarios.

2. **Platform-specific**: Tests require GTK4 and a display server (X11/Wayland). CI uses Xvfb.

3. **Serial Execution**: GTK is single-threaded; tests must run serially (`pool: { threads: false }`).

4. **Memory Safety**: Pay attention to owned vs borrowed semantics to avoid memory leaks or use-after-free.

5. **Callback Threading**: Callbacks execute on the GTK main thread; some tests may need synchronization helpers.

---

## Memory Leak & Refcount Testing Strategy

### Why This Matters

Memory management in FFI is error-prone. The native layer must correctly:
- Track GObject reference counts
- Free owned strings and boxed types
- Clean up closures when disconnected
- Handle the JavaScript GC correctly

### Testing Approaches

#### 1. Refcount Verification (GObjects)

```typescript
function getRefCount(obj: unknown): number {
    return call(GOBJECT_LIB, "g_atomic_int_get", [
        { type: { type: "gobject", borrowed: true }, value: obj },
    ], { type: "int", size: 32 }) as number;
}

it("increments refcount when receiving owned GObject", () => {
    const label = createLabel("Test");
    const initialRefCount = getRefCount(label);

    // Pass to container (should sink floating ref, not change count)
    const box = createBox();
    call(GTK_LIB, "gtk_box_append", [
        { type: GOBJECT, value: box },
        { type: GOBJECT, value: label },
    ], UNDEFINED);

    // After adding to container, refcount should be managed by container
    expect(getRefCount(label)).toBe(initialRefCount);
});
```

#### 2. Loop Stress Tests

```typescript
it("does not leak when creating many GObjects in loop", () => {
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 10000; i++) {
        const label = createLabel(`Label ${i}`);
        // Label goes out of scope, should be collected
    }

    // Force GC if available
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    // Memory should not grow significantly (allow 10MB tolerance)
    expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024);
});
```

#### 3. Weak Reference Tracking

```typescript
it("properly releases GObject when JS object is garbage collected", () => {
    let weak: WeakRef<object> | null = null;

    (() => {
        const label = createLabel("Test");
        weak = new WeakRef(label as object);
    })();

    // Force GC
    if (global.gc) global.gc();

    // WeakRef should be cleared
    expect(weak?.deref()).toBeUndefined();
});
```

#### 4. Closure Cleanup Verification

```typescript
it("does not leak closure when signal handler disconnects", () => {
    const button = createButton("Test");
    let callbackCalled = false;

    const handlerId = call(GOBJECT_LIB, "g_signal_connect_data", [
        { type: GOBJECT, value: button },
        { type: STRING, value: "clicked" },
        { type: { type: "callback", trampoline: "closure" }, value: () => { callbackCalled = true; } },
        { type: NULL, value: null },
        { type: NULL, value: null },
        { type: INT32, value: 0 },
    ], UINT64);

    // Disconnect
    call(GOBJECT_LIB, "g_signal_handler_disconnect", [
        { type: GOBJECT, value: button },
        { type: UINT64, value: handlerId },
    ], UNDEFINED);

    // Closure should be freed - verify by checking internal state or memory
});
```

#### 5. Parent-Child Lifecycle

```typescript
it("properly releases GObject when parent is destroyed", () => {
    const box = createBox();
    const label = createLabel("Test");

    call(GTK_LIB, "gtk_box_append", [
        { type: GOBJECT, value: box },
        { type: GOBJECT, value: label },
    ], UNDEFINED);

    const labelRefBefore = getRefCount(label);

    // Destroy parent
    call(GTK_LIB, "gtk_widget_unparent", [
        { type: GOBJECT, value: label },
    ], UNDEFINED);

    // Label should have one less ref (no longer held by box)
    // But still held by JS
    expect(getRefCount(label)).toBeLessThan(labelRefBefore);
});
```

### Test Utilities for Memory Testing

Add to `call/test-helpers.ts`:

```typescript
export function getRefCount(obj: unknown): number {
    // Access GObject's ref_count field
    // This may need to read from a specific offset
    return call(GOBJECT_LIB, "g_atomic_int_get", [
        { type: { type: "ref", innerType: INT32 }, value: ... },
    ], INT32) as number;
}

export function forceGC(): void {
    if (global.gc) {
        global.gc();
    }
}

export function measureMemory<T>(fn: () => T): { result: T; memoryDelta: number } {
    forceGC();
    const before = process.memoryUsage().heapUsed;
    const result = fn();
    forceGC();
    const after = process.memoryUsage().heapUsed;
    return { result, memoryDelta: after - before };
}

export async function waitForGC(weakRef: WeakRef<object>, timeoutMs = 1000): Promise<boolean> {
    const start = Date.now();
    while (weakRef.deref() !== undefined && Date.now() - start < timeoutMs) {
        forceGC();
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    return weakRef.deref() === undefined;
}
```

### Running with GC Exposed

To enable `global.gc()` in tests, run Node.js with:

```bash
node --expose-gc node_modules/vitest/vitest.mjs run
```

Or add to `vitest.config.ts`:

```typescript
export default defineConfig({
    test: {
        // ... other config
    },
    esbuild: {
        // If using esbuild
    },
});
```

And update `package.json`:

```json
{
    "scripts": {
        "test": "node --expose-gc ./node_modules/vitest/vitest.mjs run"
    }
}
```
