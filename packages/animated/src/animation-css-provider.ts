import { attachParsingErrorLogger, registerProviderForDefaultDisplay } from "@gtkx/css/internal";
import type * as Gtk from "@gtkx/gi/gtk";
import { STYLE_PROVIDER_PRIORITY_APPLICATION } from "@gtkx/gi/gtk";
import { createLogger } from "@gtkx/utils";

const ANIMATION_PROVIDER_PRIORITY = STYLE_PROVIDER_PRIORITY_APPLICATION + 1;

const log = createLogger("animated");

export class AnimationStyleSheet {
    private provider: Gtk.CssProvider | null = null;
    private rules = new Map<string, string>();
    private lastFlushed = "";
    private flushScheduled = false;

    public set(className: string, rule: string): void {
        if (rule.length === 0) {
            this.remove(className);
            return;
        }
        if (this.rules.get(className) === rule) return;
        this.rules.set(className, rule);
        this.scheduleFlush();
    }

    public remove(className: string): void {
        if (!this.rules.delete(className)) return;
        this.scheduleFlush();
    }

    private ensureProvider(): Gtk.CssProvider {
        if (this.provider) return this.provider;
        const provider = registerProviderForDefaultDisplay(ANIMATION_PROVIDER_PRIORITY);
        this.provider = provider;
        attachParsingErrorLogger(provider, log, "animation CSS");
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
        const css = [...this.rules.values()].join("\n");
        if (css === this.lastFlushed) return;
        this.lastFlushed = css;
        this.ensureProvider().loadFromString(css);
    }
}

export const animationStyleSheet: AnimationStyleSheet = new AnimationStyleSheet();
