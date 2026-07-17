import type * as GObject from "@gtkx/gi/gobject";
import type { SignalHandler } from "@gtkx/runtime";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { type GObjectTarget, resolveGObjectTarget } from "../utils/gobject-target.js";

type GObjectValueCache<T extends GObject.Object, V> = {
    target: T | null;
    signal: string;
    value: V;
};

export function useGObjectValue<T extends GObject.Object, V>(
    target: GObjectTarget<T>,
    signal: string,
    read: (target: T | null) => V,
): V {
    const resolved = resolveGObjectTarget(target);
    const readRef = useRef(read);
    readRef.current = read;
    const cacheRef = useRef<GObjectValueCache<T, V> | null>(null);

    const readNow = useCallback((): GObjectValueCache<T, V> => {
        const cache = { target: resolved, signal, value: readRef.current(resolved) };
        cacheRef.current = cache;
        return cache;
    }, [resolved, signal]);

    const getSnapshot = useCallback((): V => {
        const cache = cacheRef.current;
        if (cache !== null && cache.target === resolved && cache.signal === signal) {
            return cache.value;
        }
        return readNow().value;
    }, [resolved, signal, readNow]);

    const subscribe = useCallback(
        (onStoreChange: () => void): (() => void) => {
            if (resolved === null) return () => {};
            const handler: SignalHandler = () => {
                readNow();
                onStoreChange();
            };
            resolved.on(signal, handler);
            return () => resolved.off(signal, handler);
        },
        [resolved, signal, readNow],
    );

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
