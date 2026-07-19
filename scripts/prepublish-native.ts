import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { distTagForVersion, type PackageManifest } from "./publish-manifest.js";

const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as PackageManifest;
process.env.npm_config_tag = distTagForVersion(manifest.version ?? "");

execSync("napi prepublish -t npm --no-gh-release", {
    cwd: process.cwd(),
    stdio: "inherit",
});
