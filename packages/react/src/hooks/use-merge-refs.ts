import { type Ref, type RefCallback, useCallback, useLayoutEffect, useRef } from "react";

type MergedRefEntry<T> = {
    ref: Ref<T | null> | undefined;
    cleanup: (() => void) | undefined;
};

const attachRef = <T>(ref: Ref<T | null> | undefined, value: T): (() => void) | undefined => {
    if (typeof ref === "function") {
        const cleanup = ref(value);
        return typeof cleanup === "function" ? cleanup : () => ref(null);
    }
    if (ref) {
        ref.current = value;
        return () => {
            ref.current = null;
        };
    }
    return undefined;
};

export const useMergeRefs = <T>(...refs: Array<Ref<T | null> | undefined>): RefCallback<T> => {
    const latestRefs = useRef(refs);
    latestRefs.current = refs;
    const attachedRef = useRef<{ value: T; entries: MergedRefEntry<T>[] } | null>(null);

    useLayoutEffect(() => {
        const attached = attachedRef.current;
        if (attached === null) return;
        const next = latestRefs.current;
        for (let index = next.length; index < attached.entries.length; index += 1) {
            attached.entries[index]?.cleanup?.();
        }
        attached.entries = next.map((ref, index) => {
            const entry = attached.entries[index];
            if (entry !== undefined && entry.ref === ref) return entry;
            entry?.cleanup?.();
            return { ref, cleanup: attachRef(ref, attached.value) };
        });
    });

    return useCallback((value: T) => {
        const entries = latestRefs.current.map((ref) => ({ ref, cleanup: attachRef(ref, value) }));
        attachedRef.current = { value, entries };
        return () => {
            const attached = attachedRef.current;
            attachedRef.current = null;
            if (attached) {
                for (const entry of attached.entries) entry.cleanup?.();
            }
        };
    }, []);
};
