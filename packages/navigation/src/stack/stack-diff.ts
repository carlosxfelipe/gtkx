import * as Adw from "@gtkx/gi/adw";
import { isSameArray } from "@gtkx/utils";

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

const animateToTop = (view: Adw.NavigationView, live: string[], desiredTop: string): void => {
    if (desiredTop === view.getVisiblePageTag()) return;
    if (live.includes(desiredTop)) view.popToTag(desiredTop);
    else view.pushByTag(desiredTop);
};

export const applyStackDiff = (view: Adw.NavigationView, desired: string[]): void => {
    const resolvable = desired.filter((tag) => view.findPage(tag) !== null);
    const desiredTop = resolvable[resolvable.length - 1];
    if (desiredTop !== undefined) animateToTop(view, readLiveTags(view), desiredTop);
    if (!isSameArray(readLiveTags(view), resolvable)) view.replaceWithTags(resolvable);
};
