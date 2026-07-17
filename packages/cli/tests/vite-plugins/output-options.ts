import type { Plugin } from "vite";

export const callOutputOptions = (
    plugin: Plugin,
    options: Record<string, unknown>,
): Record<string, unknown> | undefined => {
    const hook = plugin.outputOptions;
    const handler = typeof hook === "function" ? hook : hook?.handler;
    if (!handler) return undefined;
    return (Reflect.apply(handler, {}, [options]) ?? undefined) as Record<string, unknown> | undefined;
};
