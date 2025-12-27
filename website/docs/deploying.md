# Deploying

This guide covers packaging GTKX applications for distribution.

## Overview

GTKX applications can be packaged as:

1. **Flatpak** — Sandboxed, cross-distribution packages (recommended)
2. **Snap** — Alternative sandboxed packaging for Ubuntu
3. **Native packages** — Distribution-specific (.deb, .rpm)

## Flatpak Deployment

Flatpak is the recommended distribution method for GTK applications on Linux.

### Prerequisites

Install Flatpak and the GNOME SDK:

```bash
# Fedora
sudo dnf install flatpak flatpak-builder

# Ubuntu
sudo apt install flatpak flatpak-builder

# Add Flathub repo
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install GNOME SDK
flatpak install flathub org.gnome.Platform//48 org.gnome.Sdk//48
flatpak install flathub org.freedesktop.Sdk.Extension.node22//24.08
```

### Project Structure

```
my-app/
├── src/
├── assets/
│   └── icon.png           # 256x256 app icon
├── flatpak/
│   ├── org.example.myapp.yaml
│   ├── org.example.myapp.desktop
│   └── build.sh
├── package.json
└── sea-config.json
```

### Flatpak Manifest

Create `flatpak/org.example.myapp.yaml`:

```yaml
app-id: org.example.myapp
runtime: org.gnome.Platform
runtime-version: '48'
sdk: org.gnome.Sdk
sdk-extensions:
  - org.freedesktop.Sdk.Extension.node22
command: myapp
finish-args:
  - --share=ipc
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri
build-options:
  append-path: /usr/lib/sdk/node22/bin
  env:
    npm_config_nodedir: /usr/lib/sdk/node22
  no-debuginfo: true
  strip: false
modules:
  - name: myapp
    buildsystem: simple
    build-options:
      build-args:
        - --share=network
    build-commands:
      - install -Dm755 dist/app /app/bin/myapp
      - install -Dm755 dist/index.node /app/bin/index.node
      - install -Dm644 flatpak/org.example.myapp.desktop /app/share/applications/org.example.myapp.desktop
      - install -Dm644 assets/icon.png /app/share/icons/hicolor/256x256/apps/org.example.myapp.png
    sources:
      - type: dir
        path: ..
        skip:
          - .flatpak-builder
          - build-dir
          - node_modules
```

### Desktop Entry

Create `flatpak/org.example.myapp.desktop`:

```ini
[Desktop Entry]
Name=My App
Comment=A GTKX application
Exec=myapp
Icon=org.example.myapp
Terminal=false
Type=Application
Categories=Utility;
```

### Build Script

Create `flatpak/build.sh`:

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Build the Single Executable Application
npm run build:sea

# Create temp repo
TEMP_REPO=$(mktemp -d)

# Build Flatpak
flatpak-builder --user --install --force-clean --repo="$TEMP_REPO" build-dir flatpak/org.example.myapp.yaml

# Create bundle
flatpak build-bundle "$TEMP_REPO" dist/flatpak/org.example.myapp.flatpak org.example.myapp

rm -rf "$TEMP_REPO"

echo "Flatpak bundle created at: dist/flatpak/org.example.myapp.flatpak"
```

### Single Executable Application (SEA)

GTKX apps are bundled as Node.js Single Executable Applications for Flatpak.

Create `sea-config.json`:

```json
{
  "main": "dist/bundle.js",
  "output": "dist/app",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": true
}
```

Add build scripts to `package.json`:

```json
{
  "scripts": {
    "build": "tsc -b",
    "bundle": "node scripts/bundle.ts",
    "build:sea": "npm run build && npm run bundle && scripts/build-sea.sh"
  }
}
```

Create `scripts/bundle.ts`:

```typescript
import * as esbuild from "esbuild";

await esbuild.build({
    entryPoints: ["dist/index.js"],
    bundle: true,
    platform: "node",
    target: "node22",
    outfile: "dist/bundle.js",
    format: "cjs",
    external: ["./index.node"],
});
```

Create `scripts/build-sea.sh`:

```bash
#!/bin/bash
set -e

# Generate SEA blob
node --experimental-sea-config sea-config.json

# Copy node binary
cp $(which node) dist/app

# Inject blob into binary
npx postject dist/app NODE_SEA_BLOB dist/app.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# Copy native module
cp node_modules/@gtkx/native/index.node dist/

echo "SEA built successfully"
```

### Building

```bash
# Install dependencies
npm install

# Build Flatpak
chmod +x flatpak/build.sh
./flatpak/build.sh

# Install locally
flatpak install dist/flatpak/org.example.myapp.flatpak
```

## Application ID

Your app ID should follow reverse domain notation:

- `org.example.myapp`
- `com.yourcompany.appname`
- `io.github.username.appname`

This ID is used in:
- `package.json` (`gtkx.appId`)
- Flatpak manifest (`app-id`)
- Desktop entry filename
- Icon filename

## Icons

Provide a 256x256 PNG icon in `assets/icon.png`. You can also provide additional sizes:

```bash
assets/
├── icon.png           # 256x256
├── icon-48.png        # 48x48
├── icon-128.png       # 128x128
└── icon.svg           # Scalable (optional)
```

## Testing Flatpak Locally

```bash
# Build and install
flatpak-builder --user --install --force-clean build-dir flatpak/org.example.myapp.yaml

# Run
flatpak run org.example.myapp

# Uninstall
flatpak uninstall org.example.myapp
```

## Publishing to Flathub

To distribute on Flathub:

1. Fork [flathub/flathub](https://github.com/flathub/flathub)
2. Add your manifest
3. Submit a pull request
4. Follow Flathub review guidelines

See [Flathub documentation](https://docs.flathub.org/) for details.

## Checklist

Before distributing:

- [ ] Set a proper app ID (reverse domain)
- [ ] Create 256x256 icon
- [ ] Write desktop entry with accurate metadata
- [ ] Test on fresh system (VM or container)
- [ ] Verify permissions in `finish-args`
- [ ] Add appropriate categories to desktop entry
