/**
 * Runtime probe that monitors React 19's `ReactSharedInternals.actQueue`
 * pointer and the per-queue `push` operations responsible for adopting state
 * updates into an in-flight `act`. Loaded by {@link ./timing.ts} so that every
 * test process emits structured logs describing how the queue evolves across
 * iterations of `recursivelyFlushAsyncActWork`.
 *
 * Emits compact events to `stderr` with the `[gtkx:react-act]` prefix:
 * - `actQueue installed id=N len=K` — assignment of a non-null queue to the
 *   global pointer (the moment `setState` calls start being adopted).
 * - `actQueue cleared id=N pushes=P maxLen=M nonzeroSamples=S` — assignment
 *   back to `null`, with per-queue totals: how many entries were ever pushed,
 *   the high-water mark length, and how many sampler ticks observed the queue
 *   non-empty.
 * - `sampler-nonempty tick=T id=N len=M` — emitted only when the
 *   `setImmediate` sampler observes a non-empty queue. A non-empty observation
 *   indicates a state update landed between `recursivelyFlushAsyncActWork`
 *   iterations and is the signature of the runaway loop we suspect.
 */

import * as React from "react";

declare module "react" {
    const __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
        actQueue: unknown[] | null;
    };
}

interface QueueStats {
    id: number;
    pushes: number;
    maxLen: number;
    nonzeroSamples: number;
}

const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
const instrumentationOrigin = Date.now();
const queueStatsByQueue = new WeakMap<unknown[], QueueStats>();
const wrappedQueues = new WeakSet<unknown[]>();

let queueCounter = 0;
let samplerCounter = 0;
let currentQueue: unknown[] | null = internals.actQueue;
let samplerScheduled = false;

const logEvent = (event: string, details?: string): void => {
    const elapsed = Date.now() - instrumentationOrigin;
    const suffix = details ? ` ${details}` : "";
    console.error(`[gtkx:react-act] +${elapsed}ms ${event}${suffix}`);
};

const wrapQueue = (queue: unknown[]): QueueStats => {
    const existing = queueStatsByQueue.get(queue);
    if (existing) return existing;
    const stats: QueueStats = {
        id: ++queueCounter,
        pushes: 0,
        maxLen: queue.length,
        nonzeroSamples: 0,
    };
    queueStatsByQueue.set(queue, stats);
    if (!wrappedQueues.has(queue)) {
        wrappedQueues.add(queue);
        const originalPush = queue.push.bind(queue);
        queue.push = (...items: unknown[]): number => {
            const newLen = originalPush(...items);
            stats.pushes += items.length;
            if (newLen > stats.maxLen) stats.maxLen = newLen;
            return newLen;
        };
    }
    return stats;
};

const sampleQueueLength = (): void => {
    samplerScheduled = false;
    const queue = currentQueue;
    if (!queue) return;
    const stats = queueStatsByQueue.get(queue);
    const tick = ++samplerCounter;
    if (queue.length > 0 && stats) {
        stats.nonzeroSamples++;
        logEvent("sampler-nonempty", `tick=${tick} id=${stats.id} len=${queue.length}`);
    }
    scheduleSampler();
};

const scheduleSampler = (): void => {
    if (samplerScheduled || !currentQueue) return;
    samplerScheduled = true;
    setImmediate(sampleQueueLength);
};

if (currentQueue) {
    wrapQueue(currentQueue);
    scheduleSampler();
}

Object.defineProperty(internals, "actQueue", {
    configurable: true,
    get(): unknown[] | null {
        return currentQueue;
    },
    set(newValue: unknown[] | null): void {
        if (newValue === currentQueue) return;
        if (newValue === null && currentQueue) {
            const stats = queueStatsByQueue.get(currentQueue);
            if (stats) {
                logEvent(
                    "actQueue cleared",
                    `id=${stats.id} pushes=${stats.pushes} maxLen=${stats.maxLen} nonzeroSamples=${stats.nonzeroSamples}`,
                );
            } else {
                logEvent("actQueue cleared", "id=? (untracked)");
            }
        } else if (newValue) {
            const stats = wrapQueue(newValue);
            logEvent("actQueue installed", `id=${stats.id} len=${newValue.length}`);
        }
        currentQueue = newValue;
        scheduleSampler();
    },
});

logEvent("react internals instrumentation active");
