type FlushCallback = () => void;

type BatchState = {
    depth: number;
    pendingFlushes: Set<FlushCallback>;
};

const state: BatchState = {
    depth: 0,
    pendingFlushes: new Set(),
};

/**
 * Marks the beginning of a React reconciler commit phase.
 * While in commit, flush callbacks are deferred until endCommit is called.
 * Supports nested commits through depth tracking.
 */
export const beginCommit = (): void => {
    state.depth++;
};

/**
 * Marks the end of a React reconciler commit phase.
 * Executes all pending flush callbacks that were deferred during the commit
 * only when the outermost commit ends (depth reaches 0).
 * If called without a matching beginCommit, resets the state (useful for test cleanup).
 */
export const endCommit = (): void => {
    if (state.depth <= 0) {
        state.depth = 0;
        return;
    }

    state.depth--;

    if (state.depth === 0 && state.pendingFlushes.size > 0) {
        const callbacks = [...state.pendingFlushes];
        state.pendingFlushes.clear();
        queueMicrotask(() => {
            for (const callback of callbacks) {
                callback();
            }
        });
    }
};

/**
 * Schedules a callback to be executed, deferring it if currently in a commit phase.
 * This ensures GTK state updates happen after React has finished its batch of changes.
 */
export const scheduleFlush = (callback: FlushCallback): void => {
    if (state.depth > 0) {
        state.pendingFlushes.add(callback);
    } else {
        callback();
    }
};
