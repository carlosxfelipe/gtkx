import * as Adw from "@gtkx/gi/adw";
import { isSameArray } from "@gtkx/utils";
import type { PageRegistry } from "./page-registry.js";

const isPrefix = (prefix: string[], full: string[]): boolean =>
    prefix.length <= full.length && prefix.every((value, index) => value === full[index]);

export const readLiveTags = (view: Adw.NavigationView): string[] => {
    const model = view.getNavigationStack();
    const tags: string[] = [];
    const count = model.getNItems();
    for (let index = 0; index < count; index++) {
        const item = model.getItem(index);
        if (item instanceof Adw.NavigationPage) {
            const tag = item.getTag();
            if (tag !== null) tags.push(tag);
        }
    }
    return tags;
};

const resolvePages = (desired: string[], registry: PageRegistry): Adw.NavigationPage[] | null => {
    const pages: Adw.NavigationPage[] = [];
    for (const tag of desired) {
        const page = registry.get(tag);
        if (!page) return null;
        pages.push(page);
    }
    return pages;
};

export const applyStackDiff = (view: Adw.NavigationView, desired: string[], registry: PageRegistry): void => {
    const live = readLiveTags(view);
    if (isSameArray(live, desired)) return;
    const desiredTop = desired[desired.length - 1];

    if (desiredTop !== undefined && desired.length === live.length + 1 && isPrefix(live, desired)) {
        const page = registry.get(desiredTop);
        if (page) view.push(page);
        return;
    }

    if (desiredTop !== undefined && isPrefix(desired, live)) {
        if (live.length - desired.length === 1) view.pop();
        else view.popToTag(desiredTop);
        return;
    }

    const pages = resolvePages(desired, registry);
    if (pages) view.replace(pages);
};
