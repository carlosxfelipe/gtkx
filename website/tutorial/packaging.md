---
description: "Ship the Tasks app: gtkx build, a self-contained binary, a Flatpak manifest, desktop entry and AppStream metadata, and Flathub submission."
---

# Packaging and Shipping

A GTKX app is a Node.js program that renders native widgets, so shipping it means bundling the JavaScript, the native addon, and the compiled GSettings schema into something a user can install. This page turns the Tasks app into a self-contained binary and a Flatpak.

## Building

`gtkx build` compiles the app for production:

```bash
npm run build   # gtkx build
```

It writes three things to `dist/`:

- `bundle.js`, the whole app as one JavaScript file,
- `gtkx.node`, the native addon that bridges to GTK4,
- `gschemas.compiled`, the compiled GSettings schema (emitted automatically because the app imports a `.gschema.xml`).

At this point you can already run the app with `node dist/bundle.js`, provided GTK4 and Adwaita are installed on the machine.

## A single executable

To ship a binary that does not depend on a system Node.js, the tutorial bundles the app into a [Node.js Single Executable Application](https://nodejs.org/api/single-executable-applications.html) (SEA). The `package.json` wires this up:

```json
"scripts": {
  "bundle": "gtkx build && node scripts/bundle.ts",
  "bundle:postject": "node scripts/bundle-postject.ts",
  "build:sea": "bash scripts/build-sea.sh"
}
```

- `scripts/bundle.ts` re-bundles `dist/bundle.js` into a CommonJS file (`dist/bundle.cjs`) with a small shim that resolves `gtkx.node` next to the executable at runtime.
- `scripts/bundle-postject.ts` (the `bundle:postject` script) bundles the `postject` CLI into `vendor/postject.cjs`, so the sandboxed Flatpak build can inject the blob offline without fetching anything.
- `sea-config.json` tells Node.js what to embed:

```json
{
  "main": "dist/bundle.cjs",
  "output": "dist/sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "useCodeCache": true
}
```

- `build:sea` runs `node --experimental-sea-config sea-config.json` to produce the blob, copies the `node` binary to `dist/app`, and uses `postject` to inject the blob as an ELF section. The result is a standalone `dist/app` binary with `dist/gtkx.node` beside it.

Run the three scripts in order to produce the binary:

```bash
npm run bundle && npm run bundle:postject && npm run build:sea
```

::: warning
The SEA blob is appended to the `node` binary as an ELF section. Stripping the binary would corrupt the embedded app, so any packaging step must leave it unstripped.
:::

## Flatpak

Flatpak is the standard way to distribute a GNOME app. The manifest at `flatpak/com.gtkx.tutorial.yaml` builds against the GNOME runtime and the Node.js SDK extension:

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
```

The `finish-args` are intentionally minimal: no `--filesystem` permission is granted. The tasks store resolves its path from `process.env.XDG_DATA_HOME`, which Flatpak sets inside the sandbox (to `~/.var/app/com.gtkx.tutorial/data`), so its writes land in the app's own private data directory. User-selected files arrive through XDG desktop portals. Notifications are routed through the portal automatically, so `app.sendNotification` works without extra permissions.

The `build-options` point npm at the SDK's Node.js and turn off stripping:

```yaml
build-options:
  append-path: /usr/lib/sdk/node24/bin
  env:
    npm_config_nodedir: /usr/lib/sdk/node24
  no-debuginfo: true
  strip: false
```

The module builds the SEA and installs everything under `/app`:

```yaml
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
  - install -Dm644 assets/icon.png /app/share/icons/hicolor/256x256/apps/com.gtkx.tutorial.png
```

These commands produce their own SEA binary the same way the local build does, injecting the blob into the SDK's `node` inside the sandbox, and install it as `gtkx-tutorial`. Installing and compiling the GSettings schema into `/app/share/glib-2.0/schemas` is what lets `useSetting` read and write preferences inside the sandbox.

## The desktop entry and AppStream metadata

Two files integrate the app with the desktop. The `.desktop` entry lists it in the launcher and, for the Tasks app, opts into notifications:

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

`X-GNOME-UsesNotifications=true` surfaces the app in GNOME Settings under Notifications, and `DBusActivatable=true` lets the shell activate the app to deliver a reminder action even when it is not running.

The AppStream `metainfo.xml` provides the store listing: name, summary, description, screenshots, license, releases, and a content rating. Its `id` must match the application ID, and its `launchable` must point at the `.desktop` file.

Validate both before shipping:

```bash
npm run flatpak:lint
# desktop-file-validate flatpak/com.gtkx.tutorial.desktop
# appstreamcli validate --no-net flatpak/com.gtkx.tutorial.metainfo.xml
```

## Submitting to Flathub

To publish, vendor the npm dependencies for the offline build with [flatpak-node-generator](https://github.com/flatpak/flatpak-builder-tools) (`npm run flatpak:sources`), build locally with `npm run flatpak:build`, then open a pull request against the [flathub/flathub](https://github.com/flathub/flathub) repository that swaps the local `dir` source for a pinned `git` source.

## Next

You have built, run, tested, and packaged a complete GTKX application. Explore the [full source on GitHub](https://github.com/gtkx-org/gtkx/tree/main/examples/tutorial) and start your own app with `npm create gtkx@latest`.
