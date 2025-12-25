import { type Options as SwcOptions, transform } from "@swc/core";
import type { Plugin } from "vite";

type SwcSsrRefreshOptions = {
    include?: RegExp;
    exclude?: RegExp;
};

const defaultInclude = /\.[tj]sx?$/;
const defaultExclude = /node_modules/;

export function swcSsrRefresh(options: SwcSsrRefreshOptions = {}): Plugin {
    const include = options.include ?? defaultInclude;
    const exclude = options.exclude ?? defaultExclude;

    return {
        name: "gtkx:swc-ssr-refresh",
        enforce: "pre",

        async transform(code, id, transformOptions) {
            if (!transformOptions?.ssr) {
                return;
            }

            if (!include.test(id)) {
                return;
            }

            if (exclude.test(id)) {
                return;
            }

            const isTsx = id.endsWith(".tsx");
            const isTs = id.endsWith(".ts") || isTsx;

            const swcOptions: SwcOptions = {
                filename: id,
                sourceFileName: id,
                sourceMaps: true,
                jsc: {
                    parser: isTs ? { syntax: "typescript", tsx: isTsx } : { syntax: "ecmascript", jsx: true },
                    transform: {
                        react: {
                            runtime: "automatic",
                            development: true,
                            refresh: true,
                        },
                    },
                    target: "es2022",
                },
            };

            const result = await transform(code, swcOptions);

            return {
                code: result.code,
                map: result.map,
            };
        },
    };
}
