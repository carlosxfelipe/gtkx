import { isSameArray } from "@gtkx/utils";
import { type ReactNode, useCallback, useRef, useState } from "react";

export type PageTransitionHandlers = { onHiding: () => void; onHidden: () => void };

export type RenderedPages = {
    nodes: ReactNode[];
    rendered: string[];
    releaseIdle: (liveTags: string[]) => void;
};

const mergeDeparted = (previous: string[], keys: string[], lingering: string[]): string[] => {
    const retained = lingering.filter((tag) => !keys.includes(tag));
    const departed = previous.filter((tag) => !keys.includes(tag) && !retained.includes(tag));
    return [...retained, ...departed];
};

export const useRenderedPages = (
    keys: string[],
    render: (key: string, handlers: PageTransitionHandlers) => ReactNode,
): RenderedPages => {
    const cacheRef = useRef<Map<string, ReactNode>>(new Map());
    const transitioningRef = useRef<Set<string>>(new Set());
    const previousKeysRef = useRef<string[]>([]);
    const [lingering, setLingering] = useState<string[]>([]);

    const handlersFor = useCallback(
        (key: string): PageTransitionHandlers => ({
            onHiding: () => transitioningRef.current.add(key),
            onHidden: () => {
                transitioningRef.current.delete(key);
                setLingering((current) => current.filter((tag) => tag !== key));
            },
        }),
        [],
    );

    const releaseIdle = useCallback((liveTags: string[]): void => {
        setLingering((current) => {
            const next = current.filter((tag) => liveTags.includes(tag) || transitioningRef.current.has(tag));
            return isSameArray(current, next) ? current : next;
        });
    }, []);

    const merged = mergeDeparted(previousKeysRef.current, keys, lingering);
    if (!isSameArray(lingering, merged)) setLingering(merged);
    previousKeysRef.current = keys;

    for (const key of keys) cacheRef.current.set(key, render(key, handlersFor(key)));
    for (const key of cacheRef.current.keys()) {
        if (!keys.includes(key) && !merged.includes(key)) cacheRef.current.delete(key);
    }

    const rendered = [...keys, ...merged];

    return { nodes: rendered.map((key) => cacheRef.current.get(key) ?? null), rendered, releaseIdle };
};
