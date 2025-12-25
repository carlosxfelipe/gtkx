import { events } from "@gtkx/ffi";
import { update } from "@gtkx/react";
import { createServer, type InlineConfig, type ViteDevServer } from "vite";
import { isReactRefreshBoundary, performRefresh } from "./refresh-runtime.js";
import { gtkxRefresh } from "./vite-plugin-gtkx-refresh.js";
import { swcSsrRefresh } from "./vite-plugin-swc-ssr-refresh.js";

export type DevServerOptions = {
    entry: string;
    vite?: InlineConfig;
};

type AppModule = {
    default: () => React.ReactNode;
};

export const createDevServer = async (options: DevServerOptions): Promise<ViteDevServer> => {
    const { entry, vite: viteConfig } = options;

    const moduleExports = new Map<string, Record<string, unknown>>();

    const server = await createServer({
        ...viteConfig,
        appType: "custom",
        plugins: [
            swcSsrRefresh(),
            gtkxRefresh(),
            {
                name: "gtkx:remove-react-dom-optimized",
                enforce: "post",
                config(config) {
                    config.optimizeDeps ??= {};
                    config.optimizeDeps.include = config.optimizeDeps.include?.filter(
                        (dep) => dep !== "react-dom" && !dep.startsWith("react-dom/"),
                    );
                },
            },
        ],
        server: {
            ...viteConfig?.server,
            middlewareMode: true,
        },
        optimizeDeps: {
            ...viteConfig?.optimizeDeps,
            noDiscovery: true,
            include: [],
        },
        ssr: {
            ...viteConfig?.ssr,
            external: true,
        },
    });

    const loadModule = async (): Promise<AppModule> => {
        const mod = (await server.ssrLoadModule(entry)) as AppModule;
        moduleExports.set(entry, { ...mod });
        return mod;
    };

    const invalidateAllModules = (): void => {
        for (const module of server.moduleGraph.idToModuleMap.values()) {
            server.moduleGraph.invalidateModule(module);
        }
    };

    const invalidateModuleAndImporters = (filePath: string): void => {
        const module = server.moduleGraph.getModuleById(filePath);

        if (module) {
            server.moduleGraph.invalidateModule(module);

            for (const importer of module.importers) {
                server.moduleGraph.invalidateModule(importer);
            }
        }
    };

    events.on("stop", () => {
        server.close();
    });

    server.watcher.on("change", async (changedPath) => {
        console.log(`[gtkx] File changed: ${changedPath}`);

        try {
            const module = server.moduleGraph.getModuleById(changedPath);

            if (module) {
                invalidateModuleAndImporters(changedPath);

                const newMod = (await server.ssrLoadModule(changedPath)) as Record<string, unknown>;
                moduleExports.set(changedPath, { ...newMod });

                if (isReactRefreshBoundary(newMod)) {
                    console.log("[gtkx] Fast refreshing...");
                    performRefresh();
                    console.log("[gtkx] Fast refresh complete");
                    return;
                }
            }

            console.log("[gtkx] Full reload...");
            invalidateAllModules();

            const mod = await loadModule();
            const App = mod.default;

            if (typeof App !== "function") {
                console.error("[gtkx] Entry file must export a default function component");
                return;
            }

            update(<App />);
            console.log("[gtkx] Full reload complete");
        } catch (error) {
            console.error("[gtkx] Hot reload failed:", error);
        }
    });

    return server;
};

export type { ViteDevServer };
