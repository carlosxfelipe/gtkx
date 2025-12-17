# Test Rewrite Plan

## Overview

Rewrite all tests in the codebase with a consistent approach: one test file per unit exposed to end users.

## Test Guidelines

### What to Test

- **Only test public APIs** - Functions, classes, and components that are exported and intended for end-user consumption
- **Never test internal/private functions** - If it's not exported or is an implementation detail, don't test it directly
- **Test through the public interface** - Internal behavior should be verified through the public API that uses it

### Test Structure

Each test file should follow this structure:

```typescript
describe("UnitName", () => {
    // Happy path tests at the root level (no nested describe)
    it("does the main thing correctly", () => {});
    it("handles valid input A", () => {});
    it("handles valid input B", () => {});

    // Only group edge cases and error handling
    describe("edge cases", () => {
        it("handles boundary condition", () => {});
        it("handles unusual but valid input", () => {});
    });

    describe("error handling", () => {
        it("throws on invalid input", () => {});
        it("handles failure gracefully", () => {});
    });

    // Memory leak tests only if applicable
    describe("memory leaks", () => {
        it("cleans up resources on unmount", () => {});
    });
});
```

### Test Categories

For each unit, include tests for:

1. **Happy path** - Normal, expected usage (at root describe level)
2. **Edge cases** - Boundary conditions, unusual but valid inputs (grouped)
3. **Error handling** - Invalid inputs, failure scenarios (grouped)
4. **Memory leaks** - Resource cleanup, if applicable (grouped)

### Mocking Policy

- **Never mock** unless done for performance or isolation purposes
- **Allowed mocks**:
  - `memfs` - In-memory filesystem for isolated file system tests (avoids polluting real filesystem)
  - External services that would be slow or unreliable in tests
- **Not allowed**: Mocking internal modules, GTK/FFI bindings, or other code under test

### Testing Tools

- **vitest** - Test runner
- **memfs** - In-memory filesystem for isolated file system tests

---

## Package: @gtkx/cli

### Public API

The CLI exposes:
1. `gtkx create` command (via `createApp()` function)
2. `gtkx dev` command (via `createDevServer()` function)
3. Utility functions: `isValidProjectName`, `isValidAppId`, `getTestScript`, `getAddCommand`, `getRunCommand`, `generatePackageJson`, `generateTsConfig`

### Test Files

```
packages/cli/tests/
├── create.test.ts    # createApp() and utility functions
└── dev-server.test.ts # createDevServer()
```

### Status: ✅ Complete (91 tests)

---

## Package: @gtkx/react

### Public API

TODO: Document public exports

### Test Files

TODO: Plan test files

### Status: ⏳ Pending

---

## Package: @gtkx/ffi

### Public API

TODO: Document public exports (note: mostly auto-generated)

### Test Files

TODO: Plan test files

### Status: ⏳ Pending

---

## Package: @gtkx/css

### Public API

The CSS package exposes:
1. `css` - Creates CSS class names from styles and injects them into GTK's CssProvider
2. `cx` - Merges multiple class names, filtering out falsy values
3. `injectGlobal` - Injects global CSS styles

### Test Files

```
packages/css/tests/
└── css.test.ts    # css(), cx(), injectGlobal()
```

### Status: ✅ Complete (23 tests)

---

## Package: @gtkx/testing

### Public API

TODO: Document public exports

### Test Files

TODO: Plan test files

### Status: ⏳ Pending

---

## Package: @gtkx/gir

### Public API

TODO: Document public exports

### Test Files

TODO: Plan test files

### Status: ⏳ Pending

---

## Package: @gtkx/native

### Public API

TODO: Document public exports (Rust native module)

### Test Files

TODO: Plan test files

### Status: ⏳ Pending
