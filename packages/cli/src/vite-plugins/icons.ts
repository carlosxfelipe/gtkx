import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { info } from "@gtkx/utils";
import type { Plugin, UserConfig } from "vite";
import { resolveDataDir } from "../internal/data-dir.js";

const ICONS_DIR = "icons";

const XDG_ENV_BANNER = [
    `process.env.XDG_DATA_DIRS = [`,
    `    decodeURIComponent(new URL(".", import.meta.url).pathname),`,
    `    process.env.XDG_DATA_DIRS || "/usr/local/share:/usr/share",`,
    `].join(":");`,
].join("\n");

type PluginState = {
    isBuild: boolean;
    iconsDir: string | null;
};

type IconFile = {
    absPath: string;
    rel: string;
};

const findIconFiles = (iconsDir: string | null): IconFile[] => {
    if (iconsDir === null || !existsSync(iconsDir)) return [];
    return readdirSync(iconsDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => {
            const absPath = join(entry.parentPath, entry.name);
            return { absPath, rel: relative(iconsDir, absPath) };
        });
};

export function gtkxIcons(): Plugin {
    const state: PluginState = {
        isBuild: false,
        iconsDir: null,
    };

    return {
        name: "gtkx:icons",
        enforce: "pre",

        config(config: UserConfig) {
            const root = config.root ?? process.cwd();
            const dataDir = resolveDataDir(root);
            state.iconsDir = dataDir === null ? null : join(root, dataDir, ICONS_DIR);
        },

        configResolved(config) {
            state.isBuild = config.command === "build";
        },

        outputOptions(options) {
            if (!state.isBuild || typeof options.banner === "function") return;
            if (findIconFiles(state.iconsDir).length === 0) return;
            const existing = options.banner;
            return { ...options, banner: existing ? `${XDG_ENV_BANNER}\n${existing}` : XDG_ENV_BANNER };
        },

        buildEnd() {
            if (!state.isBuild) return;
            const icons = findIconFiles(state.iconsDir);
            for (const { absPath, rel } of icons) {
                this.emitFile({
                    type: "asset",
                    fileName: join(ICONS_DIR, rel),
                    source: readFileSync(absPath),
                });
            }
            if (icons.length > 0) info(`Copied ${icons.length} icon(s) into ${ICONS_DIR}/`);
        },
    };
}
