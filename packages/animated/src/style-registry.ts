import { attachParsingErrorLogger, registerProviderForDefaultDisplay } from "@gtkx/css/internal";
import type * as Gtk from "@gtkx/gi/gtk";
import { STYLE_PROVIDER_PRIORITY_APPLICATION } from "@gtkx/gi/gtk";
import { createLogger } from "@gtkx/utils";
import type { ValueType } from "motion/react";
import { camelToDash, getValueAsType, numberValueTypes, px, warnOnce } from "motion/react";
import { GTK_CSS_PROPERTIES } from "./gtk-css-properties.js";

const log = createLogger("animated");

const CLASS_PREFIX = "gtkx-anim-";

const SUPPORTED_PROPERTIES = new Set<string>(GTK_CSS_PROPERTIES);

const VALUE_TYPES: Record<string, ValueType> = { ...numberValueTypes, borderSpacing: px };

const declarationFor = (key: string, value: string | number): string | null => {
    if (key.startsWith("--")) return `${key}: ${value};`;
    if (!SUPPORTED_PROPERTIES.has(key)) {
        if (process.env.NODE_ENV !== "production") {
            warnOnce(false, `"${key}" is not supported by GTK4 CSS and was dropped.`, `gtkx-animated-${key}`);
        }
        return null;
    }
    if (key === "visibility") {
        return value === "hidden" || value === "collapse" ? "opacity: 0;" : null;
    }
    if (key === "transformOrigin") {
        return `transform-origin: ${String(value).split(" ").slice(0, 2).join(" ")};`;
    }
    return `${camelToDash(key)}: ${getValueAsType(value, VALUE_TYPES[key])};`;
};

export const buildDeclarations = (values: Record<string, string | number>): string => {
    let declarations = "";
    for (const key in values) {
        const value = values[key];
        if (value === undefined || value === "") continue;
        declarations += declarationFor(key, value) ?? "";
    }
    return declarations;
};

class StyleRegistry {
    private provider: Gtk.CssProvider | null = null;
    private rules = new Map<string, string>();
    private nextId = 1;
    private flushScheduled = false;

    allocateClass(): string {
        const className = `${CLASS_PREFIX}${this.nextId}`;
        this.nextId += 1;
        return className;
    }

    setRule(className: string, declarations: string): void {
        if (this.rules.get(className) === declarations) return;
        this.rules.set(className, declarations);
        this.scheduleFlush();
    }

    removeRule(className: string): void {
        if (this.rules.delete(className)) this.scheduleFlush();
    }

    private ensureProvider(): Gtk.CssProvider {
        if (this.provider) return this.provider;
        const provider = registerProviderForDefaultDisplay(STYLE_PROVIDER_PRIORITY_APPLICATION + 1);
        attachParsingErrorLogger(provider, log, "animated CSS");
        this.provider = provider;
        return provider;
    }

    private scheduleFlush(): void {
        if (this.flushScheduled) return;
        this.flushScheduled = true;
        queueMicrotask(() => {
            this.flushScheduled = false;
            this.flush();
        });
    }

    private flush(): void {
        let css = "";
        for (const [className, declarations] of this.rules) {
            css += `.${className} { ${declarations} }\n`;
        }
        this.ensureProvider().loadFromString(css);
    }
}

export const styleRegistry: StyleRegistry = new StyleRegistry();
