import * as Adw from "@gtkx/gi/adw";
import { AdwNavigationPage, AdwNavigationView, type AdwNavigationViewProps } from "@gtkx/jsx/adw";
import { createPortal, rootElement, useSignal } from "@gtkx/react";
import { useMergeRefs } from "@gtkx/react/internal";
import {
    Children,
    createContext,
    isValidElement,
    type ReactElement,
    type ReactNode,
    type Ref,
    type RefCallback,
    useCallback,
    useContext,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { sameIds } from "./utils/same-ids.js";

type PageRegistry = {
    register(tag: string, page: Adw.NavigationPage): void;
    unregister(tag: string, page: Adw.NavigationPage): void;
    get(tag: string): Adw.NavigationPage | undefined;
};

const PageRegistryContext = createContext<PageRegistry | null>(null);

/** Props for {@link NavigationView.Page}. */
export type NavigationPageProps = {
    /** Stable identity within the enclosing NavigationView; drives the stack diff and becomes the page tag. */
    tag: string;
    /** Header title, also used as the next page's back-button tooltip. */
    title?: string;
    /** Set false to disable this page's pop gesture, shortcut, and back button. */
    canPop?: boolean;
    /** Page content. */
    children?: ReactNode;
};

const NavigationViewPage = ({ tag, title, canPop, children }: NavigationPageProps): ReactNode => {
    const registry = useContext(PageRegistryContext);
    if (!registry) throw new Error("<NavigationView.Page> must be a child of <NavigationView>");

    const registryRef = useRef(registry);
    registryRef.current = registry;
    const tagRef = useRef(tag);
    tagRef.current = tag;
    const registeredRef = useRef<Adw.NavigationPage | null>(null);

    const setPage = useCallback<RefCallback<Adw.NavigationPage>>((page) => {
        const reg = registryRef.current;
        const previous = registeredRef.current;
        if (previous && previous !== page) {
            reg.unregister(tagRef.current, previous);
            registeredRef.current = null;
        }
        if (page) {
            reg.register(tagRef.current, page);
            registeredRef.current = page;
        }
    }, []);

    return createPortal(
        <AdwNavigationPage ref={setPage} tag={tag} title={title} canPop={canPop}>
            {children}
        </AdwNavigationPage>,
        rootElement,
    );
};

/** Props for {@link NavigationView}. */
export type NavigationViewProps = Omit<
    AdwNavigationViewProps,
    | "children"
    | "ref"
    | "onPopped"
    | "onPushed"
    | "onReplaced"
    | "onGetNextPage"
    | "onNotifyVisiblePage"
    | "onNotifyVisiblePageTag"
> & {
    ref?: Ref<Adw.NavigationView | null>;
    /** Fires after the widget pops a page on its own, through a swipe, Escape, back button, or navigation action. */
    onPop?: (tag: string) => void;
    /** {@link NavigationView.Page} elements whose mounted order is the stack order, first is the root and last is visible. */
    children?: ReactNode;
};

const isPage = (node: ReactNode): node is ReactElement<NavigationPageProps> =>
    isValidElement(node) && node.type === NavigationViewPage;

const isPrefix = (prefix: string[], full: string[]): boolean =>
    prefix.length <= full.length && prefix.every((value, index) => value === full[index]);

const readLiveTags = (view: Adw.NavigationView): string[] => {
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

const applyStackDiff = (view: Adw.NavigationView, desired: string[], registry: PageRegistry): void => {
    const live = readLiveTags(view);
    if (sameIds(live, desired)) return;
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

const NavigationViewRoot = (props: NavigationViewProps): ReactNode => {
    const { ref, onPop, children, ...intrinsicProps } = props;

    const [view, setViewState] = useState<Adw.NavigationView | null>(null);
    const captureView = useCallback<RefCallback<Adw.NavigationView>>((value) => setViewState(value), []);
    const setRef = useMergeRefs<Adw.NavigationView>(captureView, ref);

    const applyingRef = useRef(false);
    const onPopRef = useRef(onPop);
    onPopRef.current = onPop;

    const pagesRef = useRef<Map<string, Adw.NavigationPage>>(new Map());
    const registry = useMemo<PageRegistry>(
        () => ({
            register: (tag, page) => {
                pagesRef.current.set(tag, page);
            },
            unregister: (tag, page) => {
                if (pagesRef.current.get(tag) === page) pagesRef.current.delete(tag);
            },
            get: (tag) => pagesRef.current.get(tag),
        }),
        [],
    );

    const desired: string[] = [];
    for (const child of Children.toArray(children)) {
        if (isPage(child)) desired.push(child.props.tag);
    }

    useLayoutEffect(() => {
        if (!view) return;
        applyingRef.current = true;
        try {
            applyStackDiff(view, desired, registry);
        } finally {
            applyingRef.current = false;
        }
    });

    useSignal(view, "popped", (page: Adw.NavigationPage) => {
        if (applyingRef.current) return;
        const tag = page.getTag();
        if (tag !== null) onPopRef.current?.(tag);
    });

    return (
        <PageRegistryContext.Provider value={registry}>
            <AdwNavigationView ref={setRef} {...intrinsicProps} />
            {children}
        </PageRegistryContext.Provider>
    );
};

/** Drives an Adw.NavigationView from JSX: each mounted {@link NavigationView.Page} is a stack entry, and widget-initiated pops report through onPop. */
export const NavigationView: ((props: NavigationViewProps) => ReactNode) & {
    Page: (props: NavigationPageProps) => ReactNode;
} = Object.assign(NavigationViewRoot, { Page: NavigationViewPage });
