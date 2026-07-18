import type * as GObject from "@gtkx/gi/gobject";
import type { SignalHandler } from "@gtkx/runtime";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { type ObjectProp, resolveObjectProp } from "../utils/object-prop.js";

type ObjectValueCache<T extends GObject.Object, V> = {
    object: T | null;
    signal: string;
    value: V;
};

export function useObjectValue<T extends GObject.Object, V>(
    object: ObjectProp<T>,
    signal: string,
    read: (object: T | null) => V,
): V {
    const resolved = resolveObjectProp(object);
    const readRef = useRef(read);
    readRef.current = read;
    const cacheRef = useRef<ObjectValueCache<T, V> | null>(null);

    const readNow = useCallback((): ObjectValueCache<T, V> => {
        const cache = { object: resolved, signal, value: readRef.current(resolved) };
        cacheRef.current = cache;
        return cache;
    }, [resolved, signal]);

    const getSnapshot = useCallback((): V => {
        const cache = cacheRef.current;
        if (cache !== null && cache.object === resolved && cache.signal === signal) {
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
