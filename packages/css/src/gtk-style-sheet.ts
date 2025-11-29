import { events } from "@gtkx/ffi";
import { type Display, DisplayManager } from "@gtkx/ffi/gdk";
import { CssProvider, StyleContext } from "@gtkx/ffi/gtk";

type StyleSheetOptions = {
    key: string;
    container?: unknown;
    nonce?: string;
    speedy?: boolean;
    prepend?: boolean;
};

const STYLE_PROVIDER_PRIORITY_APPLICATION = 600;

let isGtkReady = false;
const pendingSheets: GtkStyleSheet[] = [];

const flushPendingStyles = (): void => {
    isGtkReady = true;
    for (const sheet of pendingSheets) {
        sheet.applyQueuedRules();
    }
    pendingSheets.length = 0;
};

events.once("ready", flushPendingStyles);

/**
 * Custom StyleSheet implementation for Emotion that outputs to GTK's CssProvider.
 * Implements Emotion's StyleSheet interface to enable CSS-in-JS with GTK widgets.
 *
 * Rules are queued until GTK is initialized, then applied automatically.
 */
export class GtkStyleSheet {
    key: string;
    private rules: string[] = [];
    private provider: CssProvider | null = null;
    private display: Display | null = null;
    private isRegistered = false;
    private hasPendingRules = false;

    constructor(options: StyleSheetOptions) {
        this.key = options.key;
    }

    private ensureProvider(): void {
        if (!this.provider) {
            this.provider = new CssProvider();
            this.display = DisplayManager.get().getDefaultDisplay();

            if (this.display) {
                StyleContext.addProviderForDisplay(this.display, this.provider, STYLE_PROVIDER_PRIORITY_APPLICATION);
                this.isRegistered = true;
            }
        }
    }

    private updateProvider(): void {
        if (this.provider && this.rules.length > 0) {
            const css = this.rules.join("\n");
            this.provider.loadFromString(css);
        }
    }

    insert(rule: string): void {
        this.rules.push(rule);

        if (isGtkReady) {
            this.ensureProvider();
            this.updateProvider();
        } else if (!this.hasPendingRules) {
            this.hasPendingRules = true;
            pendingSheets.push(this);
        }
    }

    applyQueuedRules(): void {
        if (this.rules.length > 0) {
            this.ensureProvider();
            this.updateProvider();
        }
        this.hasPendingRules = false;
    }

    flush(): void {
        if (this.provider && this.display && this.isRegistered) {
            StyleContext.removeProviderForDisplay(this.display, this.provider);
            this.isRegistered = false;
        }

        this.rules = [];
        this.provider = null;
        this.display = null;
        this.hasPendingRules = false;
    }

    hydrate(_elements: unknown[]): void {
        // No-op for GTK - hydration is a browser SSR concept
    }
}
