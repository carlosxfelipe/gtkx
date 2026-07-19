---
description: "Build a Flatpak anyone can install, and see which sandbox permissions the app does not need."
---

# Appendix C: Shipping It on Flathub

Tasks is finished, and [Appendix B](/tutorial/packaging) gave it an icon, a desktop entry, AppStream metadata, and a single executable that runs from `./dist/app`. That binary runs on your machine. This appendix produces one artifact that runs on anyone's.

A Flatpak bundles the app together with a pinned platform. Your app sees the same Adwaita it was built against, on a distribution that shipped a different one three releases ago, because the runtime travels with it rather than being borrowed from the host. The build happens inside a sandbox with no network, which is the part worth planning for, and the finished app runs inside a sandbox too, which turns out to cost you almost nothing here.

## The manifest

Everything Flatpak needs is one YAML file. Create `flatpak/com.gtkx.tutorial.yaml`:

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
    sources:
      - type: dir
        path: ..
        skip:
          - node_modules
          - dist
          - build-dir
          - flatpak-repo
          - .flatpak-builder
          - vendor
      - generated-sources.json
```

Read it top to bottom.

`id` is the application ID you have been carrying since [Your First Window](/tutorial/your-first-window). It is the Flatpak's identity, the desktop entry's basename, the GSettings schema path, and the directory name the sandbox gives you on disk. Keeping the four in agreement is what makes the rest of the file a straight copy.

`runtime: org.gnome.Platform` with `runtime-version: "50"` is the pin. GTK4, Adwaita, GLib, and the icon theme all come from that runtime, at that version, on every machine. `sdk: org.gnome.Sdk` is the same platform plus compilers and headers, present at build time only.

`sdk-extensions` adds `org.freedesktop.Sdk.Extension.node24`, because the GNOME SDK carries no Node.js. The extension installs under `/usr/lib/sdk/node24`, which is why `append-path: /usr/lib/sdk/node24/bin` follows: without it, `npm` is not on `PATH` inside the build and the first build command fails with `npm: command not found`. `npm_config_nodedir` points native module builds at that same Node.js rather than at a copy npm would otherwise download.

`command: gtkx-tutorial` names the executable Flatpak runs, matching the `Exec=` line of the desktop entry and the name the binary is installed under in the build commands.

`strip: false` matters for exactly the reason [Appendix B](/tutorial/packaging) gave: the application is appended to the `node` binary as an ELF section, and stripping the binary throws that section away.

::: warning `Cannot find module` or an immediate exit from a Flatpak build that worked locally
Check `strip: false` and `no-debuginfo: true` are both still in `build-options`. Flatpak strips binaries by default, and a stripped single executable launches as a bare Node.js REPL or dies without a useful message, because the embedded application is gone.
:::

The build commands then do what Appendix B did by hand, in the sandbox, ending in a series of `install -Dm644` calls that place the schema, the desktop entry, the metainfo, and both icons where the system expects them. `glib-compile-schemas` runs against `/app/share/glib-2.0/schemas` after the schema is installed, so the preferences you wrote in [Preferences and the System Theme](/tutorial/preferences-and-theming) resolve inside the sandbox.

The `dir` source builds the working tree you have in front of you, skipping everything derived. `generated-sources.json` is the second source, and it does not exist yet.

## Building offline

The sandbox has no network. `npm ci` cannot reach the registry, esbuild cannot download its platform binary, and nothing about that is negotiable: reproducibility is the point, and Flathub enforces it.

The answer is to resolve every dependency ahead of time, on your machine, into a manifest of URLs and checksums that `flatpak-builder` fetches before it seals the sandbox. [`flatpak-node-generator`](https://github.com/flatpak/flatpak-builder-tools/tree/master/node) reads a lockfile and writes exactly that. Install it with `pipx install flatpak-node-generator`.

Create `flatpak/generate-sources.sh`:

```bash
#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if ! command -v flatpak-node-generator >/dev/null 2>&1; then
    echo "Error: flatpak-node-generator not found." >&2
    echo "Install it with: pipx install flatpak-node-generator" >&2
    exit 1
fi

echo "Resolving package-lock.json from npm (requires network)..."
rm -f package-lock.json
npm install --package-lock-only --no-audit --no-fund

echo "Vendoring npm dependencies into flatpak/generated-sources.json..."
flatpak-node-generator npm package-lock.json -o flatpak/generated-sources.json

echo ""
echo "Done. package-lock.json and flatpak/generated-sources.json are ready to build."
```

Add it to `package.json` alongside the scripts from Appendix B:

```json
{
  "scripts": {
    // ...
    "flatpak:lint": "desktop-file-validate flatpak/com.gtkx.tutorial.desktop && appstreamcli validate --no-net flatpak/com.gtkx.tutorial.metainfo.xml",
    "flatpak:sources": "bash flatpak/generate-sources.sh"
  }
}
```

Run it whenever a dependency changes:

```bash
npm run flatpak:sources
```

`flatpak-builder` unpacks those sources into `flatpak-node/` inside the build directory, and the environment variables on the module point every cache at that tree. `npm_config_offline` makes npm fail loudly instead of silently reaching out, `npm_config_cache` is the offline package store it installs from, `XDG_CACHE_HOME` catches the caches other tools would put in `~/.cache`, and `ESBUILD_BINARY_PATH` hands esbuild the binary it would otherwise fetch on install.

One dependency does not come through npm at build time. `postject` injects the application blob into the `node` binary, and the manifest calls it as `node vendor/postject.cjs`, a self-contained CommonJS file produced by the `bundle:postject` script from Appendix B. Bundling the tool ahead of time means the build step needs no package resolution at the moment it runs.

Now build it:

```bash
flatpak-builder \
    --force-clean \
    --user \
    --install-deps-from=flathub \
    --repo=flatpak-repo \
    build-dir \
    flatpak/com.gtkx.tutorial.yaml
```

`--install-deps-from=flathub` pulls the GNOME runtime and the Node.js SDK extension the first time, which takes a while and happens once. `--repo=flatpak-repo` writes the result as a local repository you can install from.

## What the sandbox does not grant

Look at `finish-args` again. It is short:

```yaml
finish-args:
  - --share=ipc
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri
```

That is a window on screen and hardware rendering. There is no `--filesystem`, no `--share=network`, and no `--talk-name` for the notification service. Tasks reads and writes your data, sends desktop notifications, and stores preferences, with none of those.

**No filesystem permission**, because of a decision made in [Saving Tasks Between Runs](/tutorial/saving-to-disk). The storage backend resolves its directory from `XDG_DATA_HOME`, and Flatpak sets that variable to the app's own private directory before the process starts. The code that found `~/.local/share/com.gtkx.tutorial` on your machine finds `~/.var/app/com.gtkx.tutorial/data/com.gtkx.tutorial` inside the sandbox, unchanged. Had the path been hardcoded, or built from `homedir()` alone, the manifest would need `--filesystem=home` and Flathub reviewers would ask why.

**No notification permission**, because `Gio.Notification` goes through a portal. The reminder built in [Reminders That Reach the Desktop](/tutorial/reminders) is handed to the application, and inside a sandbox that call is routed to the desktop's notification portal rather than to a raw D-Bus name. The portal is what asks the user, keeps the permission revocable in system settings, and delivers **Mark Complete** back to your `app.complete-task` action.

**No network permission**, because the app never opens a socket. Everything it knows lives in one JSON file and one GSettings schema.

::: details Why is a short finish-args worth caring about?
Every entry in `finish-args` is a hole in the sandbox, and it is permanent: users see it in the software center, reviewers question it, and once shipped it is awkward to take back. Portals invert the model. Instead of the app holding a standing permission, the user grants access at the moment it is used, to the one file or one capability in question, and can withdraw it later. Writing to `XDG_DATA_HOME` and sending notifications through `Gio` are the versions of those tasks that need no hole at all, which is why the tutorial reached for them from the start.
:::

## Run it

Install from the local repository and launch:

```bash
flatpak install --user flatpak-repo com.gtkx.tutorial
flatpak run com.gtkx.tutorial
```

Tasks opens with an empty store: this is a fresh install with its own data directory, so the seeded lists and tasks appear as they did on your very first run. Add a task called `Ship it`, then quit and look at where it landed:

```bash
cat ~/.var/app/com.gtkx.tutorial/data/com.gtkx.tutorial/tasks.json
```

The task is there. Now the negative check: your everyday copy of the app is untouched.

```bash
ls ~/.local/share/com.gtkx.tutorial/
```

That directory still holds the tasks you have been adding all tutorial, with no `Ship it` among them. Two independent stores, one storage backend, no branch anywhere in your code.

Search the overview for Tasks and both entries appear, each with the icon from Appendix B. Remove the sandboxed one with `flatpak uninstall --user com.gtkx.tutorial` and its data directory stays behind, which is the same promise Flatpak makes to every application it hosts.

## Submitting to Flathub

Flathub builds your manifest on its own infrastructure and publishes the result. Three things decide whether that goes smoothly.

**The manifest must build from a pinned source.** Swap the `dir` source for the release you tagged, so the build is reproducible from a URL rather than from your working tree:

```yaml
    sources:
      - type: git
        url: https://github.com/you/your-app.git
        commit: <release commit sha>
      - generated-sources.json
```

Commit `package.json`, `package-lock.json`, and `flatpak/generated-sources.json` to that repository first, since the offline build reads all three.

**The metadata must validate.** This is where the desktop entry and the AppStream metainfo from Appendix B earn their place: the metainfo is the store listing, its `id` must match the application ID, its `launchable` must point at the desktop entry, and its screenshots are the only picture a stranger sees before installing. Check both before you open anything:

```bash
npm run flatpak:lint
```

**The pull request goes to [flathub/flathub](https://github.com/flathub/flathub)**, against the `new-pr` branch, carrying the manifest and `generated-sources.json`. A reviewer reads your `finish-args` first. A short one, backed by portals, is the fastest review you can hand them.

## Summary

- **A Flatpak pins the platform**, so the app sees the runtime it was built against on any distribution.
- **The GNOME SDK gains Node.js through an extension**, mounted at `/usr/lib/sdk/node24` and put on `PATH` with `append-path`.
- **The build sandbox has no network**, so `flatpak-node-generator` resolves dependencies into `generated-sources.json` ahead of time and environment variables point every cache at the unpacked result.
- **`strip: false` protects the single executable**, whose application blob is an ELF section.
- **The app needs no filesystem, network, or notification permission**, because it follows `XDG_DATA_HOME` and sends notifications through a portal.
- **Flathub reviews the manifest, the metadata, and the permissions**, all of which you now have.

That is the whole arc: `npm create gtkx@rc` to an application a stranger can install.

## Next

Read the [complete source on GitHub](https://github.com/gtkx-org/gtkx/tree/main/examples/tutorial), then start your own with `npm create gtkx@rc`.
