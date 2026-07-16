import { AnimatePresence as FramerAnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

/** Presence modes supported on GTK: `"sync"` renders exiting and entering children together, `"wait"` holds the entering child until the exit completes. */
export type AnimatePresenceMode = "sync" | "wait";

/** Props for {@link AnimatePresence}. */
export interface AnimatePresenceProps {
    children?: ReactNode;
    /** Suppress enter animations on first render. Defaults to true. */
    initial?: boolean;
    /** Presence mode. Defaults to `"sync"`. */
    mode?: AnimatePresenceMode;
    /** Fired once all exiting children have finished animating out. */
    onExitComplete?: () => void;
    /** Value forwarded to exiting children as their `custom` prop. */
    custom?: unknown;
    /** Propagate exit animations through nested AnimatePresence components. */
    propagate?: boolean;
}

/**
 * framer-motion's AnimatePresence, retyped to the modes that work against GTK widgets.
 * Keeps children mounted while their exit animation plays; children must have a stable `key`.
 */
export const AnimatePresence: (props: AnimatePresenceProps) => ReactNode = FramerAnimatePresence;
