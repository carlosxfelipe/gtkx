# Deploying

This guide covers packaging and distributing your GTKX application.

## Single Executable Application (SEA)

GTKX apps are bundled as Node.js Single Executable Applications. The key GTKX-specific requirement is handling the native module (`@gtkx/native`).

### Bundle with esbuild

The native module must be marked as external since it cannot be bundled into JavaScript:

```typescript
// scripts/bundle.ts
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["dist/index.js"],
  bundle: true,
  platform: "node",
  target: "node22",
  outfile: "dist/bundle.js",
  format: "cjs",
  external: ["./index.node"], // Keep native module external
});
```

### SEA Configuration

```json
{
  "main": "dist/bundle.js",
  "output": "dist/app",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": true
}
```

### Build the SEA

```bash
#!/bin/bash
set -e

# Generate SEA blob
node --experimental-sea-config sea-config.json

# Copy node binary
cp $(which node) dist/app

# Inject blob into binary
npx postject dist/app NODE_SEA_BLOB dist/app.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# Copy native module alongside the binary
cp node_modules/@gtkx/native/index.node dist/

echo "SEA built successfully"
```

The final distribution includes two files:

- `dist/app` — The executable with your bundled JavaScript
- `dist/index.node` — The native GTK4 bindings

## Packaging for Distribution

GTKX applications can be packaged as:

- **Flatpak** — Sandboxed, cross-distribution packages (recommended)
- **Snap** — Alternative sandboxed packaging for Ubuntu
- **Native packages** — Distribution-specific (.deb, .rpm)

For complete examples including Flatpak manifests, Snap configurations, desktop entries, and build scripts, see the [deploying example](https://github.com/eugeniodepalo/gtkx/tree/main/examples/deploying) in the repository.
