import { createConfigLoader } from "@gtkx/config/internal";
import createConfigPlugin from "@gtkx/config/vite-plugin";
import type { Plugin } from "vite";
import { gtkxCss } from "./css.js";
import { gtkxGResources } from "./gresources.js";
import { gtkxGSettings } from "./gsettings.js";
import { gtkxIcons } from "./icons.js";
import { gtkxReactCompiler } from "./react-compiler.js";

export const gtkxVitePlugins = (mode?: string): Plugin[] => {
    const loadConfig = createConfigLoader(mode !== undefined ? { mode } : {});
    return [
        createConfigPlugin({ name: "gtkx:config", loadConfig }),
        gtkxGSettings(),
        gtkxIcons(),
        gtkxGResources(loadConfig),
        gtkxCss(),
        gtkxReactCompiler(loadConfig),
    ];
};
