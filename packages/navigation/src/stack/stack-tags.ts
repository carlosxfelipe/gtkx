import { useRef } from "react";

export type StackTags = {
    tagOf: (routeKey: string) => string;
    routeKeyOf: (tag: string) => string;
    retain: (routeKeys: string[]) => void;
};

export const stackPageTags = (
    pageKeys: string[],
    tagFor: (routeKey: string) => string | undefined,
): Map<string, string> => {
    const tags = new Map<string, string>();
    const used = new Set<string>();
    for (const routeKey of pageKeys) {
        const tag = tagFor(routeKey) ?? routeKey;
        if (used.has(tag)) throw new Error(`Duplicate stack page tag "${tag}"`);
        used.add(tag);
        tags.set(routeKey, tag);
    }
    return tags;
};

const findRouteKey = (tags: Map<string, string>, tag: string): string => {
    for (const [routeKey, value] of tags) {
        if (value === tag) return routeKey;
    }
    return tag;
};

export const useStackTags = (tags: Map<string, string>): StackTags => {
    const tagsRef = useRef<Map<string, string>>(new Map());
    for (const [routeKey, tag] of tags) tagsRef.current.set(routeKey, tag);

    return {
        tagOf: (routeKey) => tagsRef.current.get(routeKey) ?? routeKey,
        routeKeyOf: (tag) => findRouteKey(tagsRef.current, tag),
        retain: (routeKeys) => {
            for (const routeKey of [...tagsRef.current.keys()]) {
                if (!routeKeys.includes(routeKey)) tagsRef.current.delete(routeKey);
            }
        },
    };
};
