import createCache from "@emotion/cache";
import type { EmotionCache } from "@emotion/cache";
import { GtkStyleSheet } from "./gtk-style-sheet.js";

let gtkCache: EmotionCache | null = null;

/**
 * Creates and returns a singleton Emotion cache configured for GTK.
 * Uses GtkStyleSheet to inject styles into GTK's CssProvider.
 */
export const getGtkCache = (): EmotionCache => {
    if (!gtkCache) {
        const sheet = new GtkStyleSheet({ key: "gtkx" });

        gtkCache = createCache({
            key: "gtkx",
            container: null,
        });

        // Replace the default sheet with our GTK sheet
        // This works because Emotion uses cache.sheet.constructor for new sheets
        gtkCache.sheet = sheet as unknown as typeof gtkCache.sheet;
    }

    return gtkCache;
};

/**
 * Resets the GTK cache, flushing all styles.
 * Useful for cleanup or testing.
 */
export const resetGtkCache = (): void => {
    if (gtkCache) {
        gtkCache.sheet.flush();
        gtkCache = null;
    }
};
