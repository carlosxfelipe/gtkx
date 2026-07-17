import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gtkxIcons } from "../../src/vite-plugins/icons.js";
import { callOutputOptions } from "./output-options.js";

type ConfigHook = (config: { root?: string }) => void;
type ConfigResolvedHook = (config: { command: "build" | "serve" }) => void;
type BuildEndHook = (this: { emitFile: (asset: unknown) => void }) => void;

const ICON_REL_PATH = join("icons", "hicolor", "scalable", "apps", "com.example.app.svg");

describe("gtkxIcons", () => {
    let projectDir: string;

    const writeManifest = (): void => {
        writeFileSync(join(projectDir, "package.json"), JSON.stringify({ imports: { "#data/*": "./data/*" } }));
    };

    const writeIcon = (): void => {
        const full = join(projectDir, "data", ICON_REL_PATH);
        mkdirSync(join(full, ".."), { recursive: true });
        writeFileSync(full, "<svg/>");
    };

    const configuredPlugin = (command: "build" | "serve"): ReturnType<typeof gtkxIcons> => {
        const plugin = gtkxIcons();
        (plugin.config as ConfigHook)({ root: projectDir });
        (plugin.configResolved as ConfigResolvedHook)({ command });
        return plugin;
    };

    beforeEach(() => {
        projectDir = mkdtempSync(join(tmpdir(), "gtkx-icons-plugin-test-"));
    });

    afterEach(() => {
        rmSync(projectDir, { recursive: true, force: true });
    });

    it("returns a plugin with the expected name and pre-enforce", () => {
        const plugin = gtkxIcons();
        expect(plugin.name).toBe("gtkx:icons");
        expect(plugin.enforce).toBe("pre");
    });

    it("emits every data icon as a build asset preserving the theme layout", () => {
        writeManifest();
        writeIcon();
        const plugin = configuredPlugin("build");
        const emitFile = vi.fn();

        (plugin.buildEnd as BuildEndHook).call({ emitFile });

        expect(emitFile).toHaveBeenCalledTimes(1);
        const asset = emitFile.mock.calls[0]?.[0] as { type: string; fileName: string; source: Buffer };
        expect(asset.type).toBe("asset");
        expect(asset.fileName).toBe(ICON_REL_PATH);
        expect(asset.source.toString()).toBe("<svg/>");
    });

    it("emits nothing without a data icons directory", () => {
        writeManifest();
        const plugin = configuredPlugin("build");
        const emitFile = vi.fn();

        (plugin.buildEnd as BuildEndHook).call({ emitFile });

        expect(emitFile).not.toHaveBeenCalled();
    });

    it("emits nothing outside build mode", () => {
        writeManifest();
        writeIcon();
        const plugin = configuredPlugin("serve");
        const emitFile = vi.fn();

        (plugin.buildEnd as BuildEndHook).call({ emitFile });

        expect(emitFile).not.toHaveBeenCalled();
    });

    it("prepends the XDG data dirs banner to build output options when icons exist", () => {
        writeManifest();
        writeIcon();
        const plugin = configuredPlugin("build");

        const result = callOutputOptions(plugin, {});

        expect(result?.banner).toContain("XDG_DATA_DIRS");
        expect(result?.banner).toContain("import.meta.url");
    });

    it("keeps an existing banner ahead of nothing by combining both", () => {
        writeManifest();
        writeIcon();
        const plugin = configuredPlugin("build");

        const result = callOutputOptions(plugin, { banner: "existing;" });

        expect(result?.banner).toContain("XDG_DATA_DIRS");
        expect(result?.banner).toContain("existing;");
    });

    it("leaves output options untouched without icons", () => {
        writeManifest();
        const plugin = configuredPlugin("build");

        expect(callOutputOptions(plugin, {})).toBeUndefined();
    });

    it("leaves output options untouched outside build mode", () => {
        writeManifest();
        writeIcon();
        const plugin = configuredPlugin("serve");

        expect(callOutputOptions(plugin, {})).toBeUndefined();
    });
});
