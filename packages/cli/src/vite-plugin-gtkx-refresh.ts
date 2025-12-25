import type { Plugin } from "vite";

type GtkxRefreshOptions = {
    include?: RegExp;
    exclude?: RegExp;
};

const defaultInclude = /\.[tj]sx?$/;
const defaultExclude = /node_modules/;

const refreshRuntimePath = "@gtkx/cli/refresh-runtime";

export function gtkxRefresh(options: GtkxRefreshOptions = {}): Plugin {
    const include = options.include ?? defaultInclude;
    const exclude = options.exclude ?? defaultExclude;

    return {
        name: "gtkx:refresh",
        enforce: "post",

        transform(code, id, transformOptions) {
            if (!transformOptions?.ssr) {
                return;
            }

            if (!include.test(id)) {
                return;
            }

            if (exclude.test(id)) {
                return;
            }

            const hasRefreshReg = code.includes("$RefreshReg$");
            const hasRefreshSig = code.includes("$RefreshSig$");

            if (!hasRefreshReg && !hasRefreshSig) {
                return;
            }

            const moduleIdJson = JSON.stringify(id);

            const header = `
import { createModuleRegistration as __createModuleRegistration__ } from "${refreshRuntimePath}";
const { $RefreshReg$, $RefreshSig$ } = __createModuleRegistration__(${moduleIdJson});
`;

            return {
                code: header + code,
                map: null,
            };
        },
    };
}
