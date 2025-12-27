/**
 * Yields to the event loop, allowing pending GTK events to process.
 *
 * Use this after actions that trigger async widget updates.
 *
 * @returns Promise that resolves on the next event loop tick
 *
 * @example
 * ```tsx
 * import { tick } from "@gtkx/testing";
 *
 * widget.setSensitive(false);
 * await tick(); // Wait for GTK to process the change
 * expect(widget.getSensitive()).toBe(false);
 * ```
 */
export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
