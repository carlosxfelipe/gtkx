import { createLogger } from "@gtkx/utils";
import {
    Children,
    createContext,
    isValidElement,
    type Key,
    type ReactElement,
    type ReactNode,
    type RefObject,
    useContext,
    useId,
    useInsertionEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

const log = createLogger("animate");

type PresenceRegistration = {
    isComplete: boolean;
    isExitInstant: (() => boolean) | undefined;
};

type RegistrationBag = Map<string, PresenceRegistration>;

interface PresenceContextProps {
    isPresent: boolean;
    initial: boolean;
    onExitComplete: (id: string) => void;
    register: (id: string, isExitInstant?: () => boolean) => () => void;
}

const PresenceContext = createContext<PresenceContextProps | null>(null);

type UsePresenceResult = [true, null] | [true] | [false, () => void];

const alwaysPresent: [true, null] = [true, null];

export const usePresence = (isExitInstant?: () => boolean): UsePresenceResult => {
    const context = useContext(PresenceContext);
    const presenceId = useId();

    const isExitInstantRef = useRef(isExitInstant);
    useInsertionEffect(() => {
        isExitInstantRef.current = isExitInstant;
    });

    useLayoutEffect(() => {
        if (context === null) return;
        return context.register(presenceId, () => isExitInstantRef.current?.() ?? false);
    }, [presenceId]);

    if (context === null) return alwaysPresent;
    if (context.isPresent) return [true];
    return [false, () => context.onExitComplete(presenceId)];
};

export const useIsInitialPresence = (): boolean => {
    const context = useContext(PresenceContext);
    return context === null ? true : context.initial;
};

const warned = new Set<string>();

const warnOnceUnkeyedChild = (): void => {
    if (process.env.NODE_ENV === "production") return;
    const message =
        "AnimatePresence received a child without a key; exit animation is disabled for it until a unique key is supplied.";
    if (warned.has(message)) return;
    warned.add(message);
    log.warn(message);
};

export const onlyElements = (children: ReactNode): ReactElement[] => {
    const result: ReactElement[] = [];

    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        if (child.key === null) {
            warnOnceUnkeyedChild();
            return;
        }
        result.push(child);
    });

    return result;
};

export const getChildKey = (child: ReactElement): Key => {
    if (child.key === null) {
        throw new Error("[gtkx] AnimatePresence child is missing a key; onlyElements should have filtered it.");
    }
    return child.key;
};

type PresenceChildProps = {
    isPresent: boolean;
    initial: boolean;
    registrations: RegistrationBag;
    onExitComplete?: (() => void) | undefined;
    children: ReactNode;
};

const PresenceChild = ({
    isPresent,
    initial,
    registrations,
    onExitComplete,
    children,
}: PresenceChildProps): ReactNode => {
    const isPresentRef = useRef(isPresent);
    const onExitCompleteRef = useRef(onExitComplete);

    useInsertionEffect(() => {
        isPresentRef.current = isPresent;
        onExitCompleteRef.current = onExitComplete;
    });

    const context = useMemo<PresenceContextProps>(
        () => ({
            isPresent,
            initial,
            onExitComplete: (id: string) => {
                const registration = registrations.get(id);
                if (!registration) return;
                registration.isComplete = true;
                for (const { isComplete } of registrations.values()) {
                    if (!isComplete) return;
                }
                onExitCompleteRef.current?.();
            },
            register: (id: string, isExitInstant?: () => boolean) => {
                registrations.set(id, { isComplete: false, isExitInstant });
                return () => {
                    registrations.delete(id);
                    if (!isPresentRef.current && registrations.size === 0) onExitCompleteRef.current?.();
                };
            },
        }),
        [isPresent, initial, registrations],
    );

    useLayoutEffect(() => {
        if (!isPresent && registrations.size === 0) onExitComplete?.();
    }, [isPresent, registrations, onExitComplete]);

    return <PresenceContext.Provider value={context}>{children}</PresenceContext.Provider>;
};

const exitingChildrenOf = (renderedChildren: ReactElement[], presentKeys: Key[]): ReactElement[] =>
    renderedChildren.filter((child) => !presentKeys.includes(getChildKey(child)));

const isInstantExit = (bag: RegistrationBag | undefined): boolean => {
    if (!bag || bag.size === 0) return true;
    for (const { isExitInstant } of bag.values()) {
        if (!isExitInstant?.()) return false;
    }
    return true;
};

const mergeExitingChildren = (
    presentChildren: ReactElement[],
    renderedChildren: ReactElement[],
    heldKeys: Set<Key>,
): ReactElement[] => {
    const nextChildren = [...presentChildren];
    for (let index = 0; index < renderedChildren.length; index += 1) {
        const child = renderedChildren[index];
        if (child && heldKeys.has(getChildKey(child))) {
            nextChildren.splice(index, 0, child);
        }
    }
    return nextChildren;
};

type PresenceDiff = { nextChildren: ReactElement[]; allLeftInstantly: boolean };

const diffPresentChildren = (
    presentChildren: ReactElement[],
    renderedChildren: ReactElement[],
    presentKeys: Key[],
    bags: Map<Key, RegistrationBag>,
    mode: AnimatePresenceMode,
): PresenceDiff => {
    const leavingChildren = exitingChildrenOf(renderedChildren, presentKeys);
    const heldChildren = leavingChildren.filter((child) => !isInstantExit(bags.get(getChildKey(child))));
    const heldKeys = new Set(heldChildren.map(getChildKey));
    const nextChildren =
        mode === "wait" && heldChildren.length > 0
            ? heldChildren
            : mergeExitingChildren(presentChildren, renderedChildren, heldKeys);
    return { nextChildren, allLeftInstantly: leavingChildren.length > 0 && heldChildren.length === 0 };
};

const pruneBags = (bags: Map<Key, RegistrationBag>, renderedChildren: ReactElement[], presentKeys: Key[]): void => {
    const liveKeys = new Set([...renderedChildren.map(getChildKey), ...presentKeys]);
    for (const key of bags.keys()) {
        if (!liveKeys.has(key)) bags.delete(key);
    }
};

type ExitContext = {
    key: Key;
    exitComplete: Map<Key, boolean>;
    exitingComponents: Set<Key>;
    pendingRef: RefObject<ReactElement[]>;
    commit: (children: ReactElement[]) => void;
    onAllComplete?: (() => void) | undefined;
};

const completeExit = (context: ExitContext): void => {
    if (context.exitingComponents.has(context.key)) return;
    if (!context.exitComplete.has(context.key)) return;

    context.exitingComponents.add(context.key);
    context.exitComplete.set(context.key, true);

    for (const isExitComplete of context.exitComplete.values()) {
        if (!isExitComplete) return;
    }

    context.exitComplete.clear();
    context.exitingComponents.clear();
    context.commit(context.pendingRef.current);
    context.onAllComplete?.();
};

const syncExitTracking = (
    renderedChildren: ReactElement[],
    presentKeys: Key[],
    exitComplete: Map<Key, boolean>,
    exitingComponents: Set<Key>,
): void => {
    for (const child of renderedChildren) {
        const childKey = getChildKey(child);
        if (presentKeys.includes(childKey)) {
            exitComplete.delete(childKey);
            exitingComponents.delete(childKey);
        } else if (exitComplete.get(childKey) !== true) {
            exitComplete.set(childKey, false);
        }
    }
};

type RenderPresenceParams = {
    renderedChildren: ReactElement[];
    presentKeys: Key[];
    presenceInitial: boolean;
    exitComplete: Map<Key, boolean>;
    exitingComponents: Set<Key>;
    pendingPresentChildren: RefObject<ReactElement[]>;
    bagFor: (key: Key) => RegistrationBag;
    commit: (children: ReactElement[]) => void;
    onAllComplete?: (() => void) | undefined;
};

const renderPresenceChildren = (params: RenderPresenceParams): ReactNode =>
    params.renderedChildren.map((child) => {
        const childKey = getChildKey(child);
        const isPresent = params.presentKeys.includes(childKey);
        const onExitComplete = isPresent
            ? undefined
            : () =>
                  completeExit({
                      key: childKey,
                      exitComplete: params.exitComplete,
                      exitingComponents: params.exitingComponents,
                      pendingRef: params.pendingPresentChildren,
                      commit: params.commit,
                      onAllComplete: params.onAllComplete,
                  });
        return (
            <PresenceChild
                key={childKey}
                isPresent={isPresent}
                initial={params.presenceInitial}
                registrations={params.bagFor(childKey)}
                onExitComplete={onExitComplete}
            >
                {child}
            </PresenceChild>
        );
    });

/**
 * Controls how entering and exiting children overlap: `sync` animates them at the same time,
 * while `wait` finishes the exit animations before entering children mount.
 */
export type AnimatePresenceMode = "sync" | "wait";

/** Props for {@link AnimatePresence}. */
export type AnimatePresenceProps = {
    children: ReactNode;
    /** Whether children present on the first render run their enter animations. */
    initial?: boolean;
    /** How entering and exiting children overlap. */
    mode?: AnimatePresenceMode;
    /** Called once every exiting child has finished its exit animation. */
    onExitComplete?: () => void;
};

/**
 * Keeps removed children mounted until their exit animations finish, enabling exit animations for
 * keyed children as they are added to and removed from its subtree. Each child must have a stable
 * unique `key`. Children whose exit is instantaneous (no exit values, a zero-duration exit
 * transition, or animations disabled system-wide) are removed in the same update instead of being
 * held.
 */
export const AnimatePresence = ({
    children,
    initial = true,
    mode = "sync",
    onExitComplete,
}: AnimatePresenceProps): ReactNode => {
    const presentChildren = useMemo(() => onlyElements(children), [children]);
    const presentKeys = presentChildren.map(getChildKey);

    const isInitialRender = useRef(true);
    const pendingPresentChildren = useRef(presentChildren);
    const exitComplete = useRef<Map<Key, boolean>>(new Map());
    const exitingComponents = useRef<Set<Key>>(new Set());
    const registrationBags = useRef<Map<Key, RegistrationBag>>(new Map());
    const instantExitsCompleted = useRef(false);

    const bagFor = (key: Key): RegistrationBag => {
        const existing = registrationBags.current.get(key);
        if (existing) return existing;
        const bag: RegistrationBag = new Map();
        registrationBags.current.set(key, bag);
        return bag;
    };

    const [diffedChildren, setDiffedChildren] = useState(presentChildren);
    const [renderedChildren, setRenderedChildren] = useState(presentChildren);

    const presenceInitial = isInitialRender.current ? initial : true;

    useLayoutEffect(() => {
        isInitialRender.current = false;
    }, []);

    useInsertionEffect(() => {
        pendingPresentChildren.current = presentChildren;
        syncExitTracking(renderedChildren, presentKeys, exitComplete.current, exitingComponents.current);
        pruneBags(registrationBags.current, renderedChildren, presentKeys);
    }, [renderedChildren, presentKeys.join("-"), presentChildren]);

    useLayoutEffect(() => {
        if (!instantExitsCompleted.current) return;
        instantExitsCompleted.current = false;
        onExitComplete?.();
    });

    if (presentChildren !== diffedChildren) {
        const { nextChildren, allLeftInstantly } = diffPresentChildren(
            presentChildren,
            renderedChildren,
            presentKeys,
            registrationBags.current,
            mode,
        );
        if (allLeftInstantly) instantExitsCompleted.current = true;
        setRenderedChildren(nextChildren);
        setDiffedChildren(presentChildren);
        return null;
    }

    return (
        <>
            {renderPresenceChildren({
                renderedChildren,
                presentKeys,
                presenceInitial,
                exitComplete: exitComplete.current,
                exitingComponents: exitingComponents.current,
                pendingPresentChildren,
                bagFor,
                commit: setRenderedChildren,
                onAllComplete: onExitComplete,
            })}
        </>
    );
};
