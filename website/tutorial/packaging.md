---
description: "Ship the Tasks app: gtkx build, a standalone binary, a Flatpak manifest, desktop entry and AppStream metadata, and Flathub submission."
---

# Packaging and Shipping

This page turns the Tasks app into a standalone binary and a Flatpak.

## Building

`gtkx build` compiles the app for production, after which `node dist/bundle.js` runs it on any machine with GTK4 and Adwaita installed:

```bash
npm run build   # gtkx build
```

It writes these things to `dist/`:

- `bundle.js`, the whole app as one JavaScript file,
- `gtkx.node`, the native addon that bridges to GTK4,
- `gschemas.compiled`, the compiled GSettings schema,
- `icons/`, the app icons copied from `data/icons/`.

## A single executable

The tutorial bundles the app into a [Node.js Single Executable Application](https://nodejs.org/api/single-executable-applications.html) (SEA). The `package.json` wires this up:

```json
"scripts": {
  "bundle": "gtkx build && node scripts/bundle.ts",
  "bundle:postject": "node scripts/bundle-postject.ts",
  "build:sea": "bash scripts/build-sea.sh"
}
```

`bundle` re-bundles the app into the CommonJS `dist/bundle.cjs`, `bundle:postject` vendors the `postject` CLI into `vendor/postject.cjs` so the sandboxed Flatpak build can inject the blob offline, and `build:sea` produces the blob, copies the `node` binary to `dist/app`, and injects the blob as an ELF section.

`sea-config.json` tells Node.js what to embed:

```json
{
  "main": "dist/bundle.cjs",
  "output": "dist/sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "useCodeCache": true
}
```

Run the scripts in order to produce the binary:

```bash
npm run bundle && npm run bundle:postject && npm run build:sea
```

The resulting `dist/app` resolves `gtkx.node` and `gschemas.compiled` next to the executable at runtime, so both ship alongside the binary.

## Flatpak

### The manifest

The manifest at `flatpak/com.gtkx.tutorial.yaml` builds against the GNOME runtime and the Node.js SDK extension:

```yaml
id: com.gtkx.tutorial
runtime: org.gnome.Platform
runtime-version: "50"
sdk: org.gnome.Sdk
sdk-extensions:
  - org.freedesktop.Sdk.Extension.node24
command: gtkx-tutorial
finish-args:
  - --share=ipc
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri

build-options:
  append-path: /usr/lib/sdk/node24/bin
  env:
    npm_config_nodedir: /usr/lib/sdk/node24
  no-debuginfo: true
  # The SEA blob is appended to the node binary as an ELF section; stripping
  # it would corrupt the embedded application, so leave the binary unstripped.
  strip: false

modules:
  - name: gtkx-tutorial
    buildsystem: simple
    build-options:
      env:
        npm_config_offline: "true"
        npm_config_cache: /run/build/gtkx-tutorial/flatpak-node/npm-cache
        XDG_CACHE_HOME: /run/build/gtkx-tutorial/flatpak-node/cache
        ESBUILD_BINARY_PATH: /run/build/gtkx-tutorial/flatpak-node/cache/esbuild/bin/esbuild-current
    build-commands:
      - npm ci --offline
      - npm run bundle
      - npm run bundle:postject
      - node --experimental-sea-config sea-config.json
      - cp /usr/lib/sdk/node24/bin/node app
      - node vendor/postject.cjs app NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
      - install -Dm755 app /app/bin/gtkx-tutorial
      - install -Dm755 dist/gtkx.node /app/bin/gtkx.node
      - install -Dm644 data/com.gtkx.tutorial.gschema.xml /app/share/glib-2.0/schemas/com.gtkx.tutorial.gschema.xml
      - glib-compile-schemas /app/share/glib-2.0/schemas
      - install -Dm644 flatpak/com.gtkx.tutorial.desktop /app/share/applications/com.gtkx.tutorial.desktop
      - install -Dm644 flatpak/com.gtkx.tutorial.metainfo.xml /app/share/metainfo/com.gtkx.tutorial.metainfo.xml
      - install -Dm644 data/icons/hicolor/scalable/apps/com.gtkx.tutorial.svg /app/share/icons/hicolor/scalable/apps/com.gtkx.tutorial.svg
      - install -Dm644 data/icons/hicolor/symbolic/apps/com.gtkx.tutorial-symbolic.svg /app/share/icons/hicolor/symbolic/apps/com.gtkx.tutorial-symbolic.svg
    # sources: ...
```

The sandbox needs no `--filesystem` permission: the tasks store follows `XDG_DATA_HOME`, which Flatpak points at the app's private data directory, and notifications go through the portal.

The icons live at `data/icons/hicolor/`, a scalable SVG named after the application ID plus a monochrome `-symbolic` variant, laid out exactly like the system icon theme so the install commands are a straight copy.

### The desktop entry and AppStream metadata

The `.desktop` entry lists the app in the launcher and tells the desktop environment how to start it:

```ini
[Desktop Entry]
Name=Tasks
GenericName=Task Manager
Comment=Manage your tasks and to-dos
Exec=gtkx-tutorial
Icon=com.gtkx.tutorial
Terminal=false
Type=Application
Categories=Office;ProjectManagement;
Keywords=Task;Tasks;Todo;To-do;Checklist;
StartupNotify=true
X-GNOME-UsesNotifications=true
DBusActivatable=true
```

`Icon` matches the application ID, so it resolves against the icons installed into the system icon theme. `Categories` and `Keywords` decide where the app lands in the launcher and what search terms find it. `X-GNOME-UsesNotifications=true` gives the app an entry in the system notification settings, and `DBusActivatable=true` lets the desktop activate it over D-Bus, which is how a reminder's **Mark Complete** button reaches the `app.complete-task` action even when the app is not already running.

The AppStream `metainfo.xml` provides the store listing. Its `id` must match the application ID, and its `launchable` must point at the `.desktop` file.

Validate both before shipping:

```bash
npm run flatpak:lint
```

### Build and run

Vendor the dependencies, build in the sandbox, then install and run the result:

```bash
npm run flatpak:sources   # vendor deps into flatpak/generated-sources.json
npm run flatpak:build     # build the flatpak in a sandbox
flatpak install --user flatpak-repo com.gtkx.tutorial
flatpak run com.gtkx.tutorial
```

This needs `flatpak` and `flatpak-builder` with the Flathub remote configured, plus `flatpak-node-generator`, `desktop-file-validate`, and `appstreamcli`, all listed in the [flatpak README](https://github.com/gtkx-org/gtkx/tree/main/examples/tutorial/flatpak).

### Submitting to Flathub

Once it builds and runs locally, open a pull request against the [flathub/flathub](https://github.com/flathub/flathub) repository that swaps the local `dir` source for a pinned `git` source of your published release.

## Next

Explore the [full source on GitHub](https://github.com/gtkx-org/gtkx/tree/main/examples/tutorial) and start your own app with `npm create gtkx@rc`.
