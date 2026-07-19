---
description: "Give the finished app an icon, a desktop entry, AppStream metadata, and a single executable."
---

# Appendix B: Making It a Real Application

The app is finished: [Appendix A](/tutorial/testing) left you with a suite that proves it. This appendix is follow-on work of a different kind. Nothing here changes what the app does. It closes the gap between something that runs from your project directory and something that installs, appears in the overview under its own icon, and carries the metadata a software center expects.

## What the build produces

Run the production build:

```bash
npm run build
```

```
> gtkx-tutorial@0.1.0 build
> gtkx build

[gtkx] Building /home/eugenio/gtkx/examples/tutorial/src/index.tsx
vite v8.1.5 building ssr environment for production...
[gtkx] Queued GSettings schema: com.gtkx.tutorial.gschema.xml
[gtkx] Compiled 1 GSettings schema(s)
[gtkx] Copied 2 icon(s) into icons/
✓ 223 modules transformed.
rendering chunks...
computing gzip size...
dist/icons/hicolor/symbolic/apps/com.gtkx.tutorial-symbolic.svg      0.49 kB │ gzip:   0.28 kB
dist/gschemas.compiled                                               0.63 kB
dist/icons/hicolor/scalable/apps/com.gtkx.tutorial.svg               1.47 kB │ gzip:   0.38 kB
dist/gtkx.node                                                   1,525.12 kB
dist/bundle.js                                                   3,784.98 kB │ gzip: 486.82 kB

✓ built in 694ms
[gtkx] Build complete: dist/bundle.js
```

Four kinds of artifact land in `dist/`. `bundle.js` is every module you wrote plus React, zustand, and the GTKX runtime, in one file. `gtkx.node` is the native addon that bridges JavaScript to GTK4. `gschemas.compiled` is the binary form of the GSettings schema you wrote in [Preferences and the System Theme](/tutorial/preferences-and-theming), compiled by `glib-compile-schemas` during the build. `icons/` is a copy of `data/icons/`, laid out exactly as it was.

Those last three are found at runtime relative to the executable: the bundle prepends its own directory to `GSETTINGS_SCHEMA_DIR` and to `XDG_DATA_DIRS`, and loads `gtkx.node` from beside `process.execPath`. Keep them together and the app is self-contained. Copy `bundle.js` alone somewhere else and the settings schema goes missing on the first `useSetting` call.

`node dist/bundle.js` runs it on any machine with GTK4 and Adwaita installed. That is already shippable. It is not yet a program a user can double-click.

## A single executable

Node.js can embed a script into a copy of the `node` binary as a [Single Executable Application](https://nodejs.org/api/single-executable-applications.html). The result is one file that needs no `node` on the target machine. Three scripts in `package.json` get you there:

```json
"scripts": {
  "bundle": "gtkx build && node scripts/bundle.ts",
  "bundle:postject": "node scripts/bundle-postject.ts",
  "build:sea": "bash scripts/build-sea.sh"
}
```

`bundle` re-emits the app as CommonJS at `dist/bundle.cjs`, because a single executable cannot use ESM. `bundle:postject` vendors the `postject` CLI into `vendor/postject.cjs`, so the injection step works with no network access. `build:sea` produces the blob, copies your `node` binary to `dist/app`, and injects the blob into it.

`sea-config.json` tells Node.js what to embed:

```json
{
    "main": "dist/bundle.cjs",
    "output": "dist/sea-prep.blob",
    "disableExperimentalSEAWarning": true,
    "useCodeCache": true
}
```

Run the three in order:

```bash
npm run bundle && npm run bundle:postject && npm run build:sea
```

The last step ends with:

```
SEA build complete!
  Binary: dist/app
  Native: dist/gtkx.node

To run: ./dist/app
```

::: warning The binary starts and immediately exits, or reports a missing main script
The blob is appended to the `node` binary as an ELF section. Anything that rewrites the section table destroys it, and `strip` is the usual culprit: a packaging pipeline that strips debug symbols from installed binaries will corrupt the embedded application while leaving a file that still looks like a valid executable. Leave the binary unstripped.

The injection also depends on a sentinel string compiled into `node` itself, which is why `scripts/build-sea.sh` passes `--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2` to `postject`. Keep that value exactly as written.
:::

## The desktop entry

A desktop entry is what makes the app a thing the desktop knows about rather than a path you type. It is an INI file whose name matches the application ID.

Create `flatpak/com.gtkx.tutorial.desktop`:

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

`Exec` is the command, so the binary has to be installed under that name and on `PATH`. `Icon` is the application ID, which is how it resolves against the icon theme. `Categories` decides where the app files itself in a launcher that groups by category, and `Keywords` adds search terms beyond the name.

The last two keys are earned by features you built. `X-GNOME-UsesNotifications=true` is what gives the app its own row in the desktop's notification settings, so the reminders from [Reminders That Reach the Desktop](/tutorial/reminders) can be tuned or silenced there. `DBusActivatable=true` lets the desktop start the app over D-Bus instead of by running `Exec` directly, which is how a reminder's **Mark Complete** button reaches the `app.complete-task` action when the app is closed: the desktop activates the application by its ID, delivers the action, and the app handles it on startup.

## Icons

The build copies `data/icons/` verbatim, so the layout you write there is the layout that ships. Use the same shape as the system icon theme:

```
data/icons/hicolor/scalable/apps/com.gtkx.tutorial.svg
data/icons/hicolor/symbolic/apps/com.gtkx.tutorial-symbolic.svg
```

`hicolor` is the fallback theme every icon theme inherits from, `scalable` is where SVGs go, and `apps` is the context. The file name is the application ID, which is what both the desktop entry's `Icon` key and the About dialog's `applicationIcon` prop look up. Because the tree already matches the theme, installing it is a plain recursive copy into a share directory.

The full-color icon is a 128 by 128 SVG. The symbolic variant is a separate 16 by 16 drawing, deliberately simplified, in a single flat fill so the desktop can recolor it for a dark header bar or a notification badge.

`data/icons/hicolor/symbolic/apps/com.gtkx.tutorial-symbolic.svg`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg height="16px" viewBox="0 0 16 16" width="16px" xmlns="http://www.w3.org/2000/svg">
    <path d="m 5 1 c -2.216 0 -4 1.784 -4 4 v 6 c 0 2.216 1.784 4 4 4 h 6 c 2.216 0 4 -1.784 4 -4 v -6 c 0 -2.216 -1.784 -4 -4 -4 z m 0 2 h 6 c 1.108 0 2 0.892 2 2 v 6 c 0 1.108 -0.892 2 -2 2 h -6 c -1.108 0 -2 -0.892 -2 -2 v -6 c 0 -1.108 0.892 -2 2 -2 z" fill="#241f31"/>
    <path d="m 4.5 8.5 l 2.5 2.5 l 5.5 -5.5 l -1.5 -1.5 l -4 4 l -1 -1 z" fill="#241f31"/>
</svg>
```

::: details Why does the symbolic icon have a hardcoded color?
The desktop recolors symbolic icons by replacing the fill, and `#241f31` is the conventional value it looks for. Draw the shape in that color and it will come out white on a dark panel and dark on a light one. A symbolic icon with several fills, gradients, or strokes will not recolor cleanly, which is why the shape is reduced to two flat paths.
:::

## AppStream metadata

A software center needs more than a name and an icon: a summary, a description, licenses, screenshots, and a release history. That lives in an AppStream metainfo file, and it is also what Flathub validates on submission.

Create `flatpak/com.gtkx.tutorial.metainfo.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
    <id>com.gtkx.tutorial</id>
    <name>Tasks</name>
    <summary>Manage your tasks and to-dos</summary>
    <metadata_license>CC0-1.0</metadata_license>
    <project_license>MPL-2.0</project_license>
    <developer id="dev.gtkx">
        <name>GTKX</name>
    </developer>
    <description>
        <p>
            A task manager built with GTKX, demonstrating how to build React-based
            GTK4 and Adwaita desktop applications. It shows an adaptive sidebar
            layout, boxed lists, a task editor, GSettings-backed preferences, undo
            toasts, drag-to-reorder, desktop notifications, and local JSON
            persistence.
        </p>
    </description>
    <launchable type="desktop-id">com.gtkx.tutorial.desktop</launchable>
    <url type="homepage">https://gtkx.dev</url>
    <url type="bugtracker">https://github.com/gtkx-org/gtkx/issues</url>
    <url type="vcs-browser">https://github.com/gtkx-org/gtkx</url>
    <provides>
        <binary>gtkx-tutorial</binary>
    </provides>
    <screenshots>
        <screenshot type="default">
            <image>https://raw.githubusercontent.com/gtkx-org/gtkx/main/examples/tutorial/assets/screenshot.png</image>
            <caption>Browsing task lists in the sidebar</caption>
        </screenshot>
        <screenshot>
            <image>https://raw.githubusercontent.com/gtkx-org/gtkx/main/examples/tutorial/assets/screenshot-editor.png</image>
            <caption>Editing a task</caption>
        </screenshot>
    </screenshots>
    <releases>
        <release version="1.0.0" date="2026-07-13">
            <description>
                <p>Initial release.</p>
            </description>
        </release>
    </releases>
    <content_rating type="oars-1.1" />
    <branding>
        <color type="primary" scheme_preference="light">#3584e4</color>
        <color type="primary" scheme_preference="dark">#1a5fb4</color>
    </branding>
</component>
```

Three identifiers have to agree with each other: `id` is the application ID you set in `gtkx.config.ts`, `launchable` names the desktop entry file, and `provides`/`binary` names the command in `Exec`. `metadata_license` covers this XML file, `project_license` covers the app. Screenshot images are fetched over the network by the software center, so they need public URLs rather than local paths. `branding` gives a software center accent colors to theme the listing with.

Both files have validators, wired up as one script:

```bash
npm run flatpak:lint
```

That runs `desktop-file-validate` on the entry and `appstreamcli validate --no-net` on the metainfo. Fix what they report before you install anything: a malformed entry is silently ignored by the desktop, and you will be left guessing why the app never shows up.

## Installing into a user prefix

`~/.local` is the per-user counterpart of `/usr`, and the desktop searches it by default. Install the binary and its neighbors into `~/.local/bin`, and the metadata into `~/.local/share`:

```bash
install -Dm755 dist/app ~/.local/bin/gtkx-tutorial
install -Dm755 dist/gtkx.node ~/.local/bin/gtkx.node
install -Dm644 dist/gschemas.compiled ~/.local/bin/gschemas.compiled
install -Dm644 flatpak/com.gtkx.tutorial.desktop ~/.local/share/applications/com.gtkx.tutorial.desktop
install -Dm644 flatpak/com.gtkx.tutorial.metainfo.xml ~/.local/share/metainfo/com.gtkx.tutorial.metainfo.xml
cp -r data/icons/hicolor ~/.local/share/icons/
update-desktop-database ~/.local/share/applications
gtk4-update-icon-cache -f -t ~/.local/share/icons/hicolor
```

The binary, the native addon, and the compiled schema go into the same directory because that is where the running executable looks for them. The icon tree copies straight across, since `data/icons/hicolor/` was already in theme layout. The two cache commands tell the desktop to notice the new files immediately rather than at the next login.

## Run it

Run `./dist/app` from the project directory. Tasks opens with your seeded lists, and closing and reopening it shows the same tasks, because the store still reads and writes `XDG_DATA_HOME` exactly as it did under `npm run dev`.

Then install with the commands above, open the overview, and type **Tasks**. The app appears with its own blue checklist icon rather than a generic placeholder, and pressing Enter launches it. Open the desktop's notification settings and Tasks is listed there as an app that sends notifications.

For the negative check, move `dist/gschemas.compiled` out of `~/.local/bin` and launch again from a terminal. The app aborts on the first settings read with a GLib error naming the `com.gtkx.tutorial` schema as not installed. Put the file back and it starts.

## Summary

`gtkx build` emits the bundle, the native addon, the compiled schema, and the icons, and the running app resolves the last three relative to its own executable. Node's single executable support folds the bundle into a copy of `node`, giving one file to install, as long as nothing strips it. A desktop entry makes the app launchable by name and declares that it sends notifications and can be activated over D-Bus. An icon tree in theme layout and an AppStream metainfo file supply everything a launcher and a software center display.

## Next

Appendix C takes this same set of files and builds them into a sandboxed, distributable package: [Shipping It on Flathub](/tutorial/flatpak).
