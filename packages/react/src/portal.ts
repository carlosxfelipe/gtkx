import type { ReactNode, ReactPortal } from "react";
import type { Container } from "./types.js";

/**
 * Creates a React portal for rendering children into a different part of the widget tree.
 *
 * Portals are useful for rendering dialogs, tooltips, or other floating content
 * that should visually appear outside its parent component's boundaries.
 *
 * @param children - The React elements to render in the portal
 * @param container - The target container widget to render into
 * @param key - Optional key for the portal element
 * @returns A ReactPortal element
 *
 * @example
 * ```tsx
 * import { createPortal } from "@gtkx/react";
 *
 * const Modal = ({ container, children }) => {
 *   return createPortal(
 *     <GtkWindow modal>
 *       {children}
 *     </GtkWindow>,
 *     container
 *   );
 * };
 * ```
 */
export const createPortal = (children: ReactNode, container: Container, key?: string | null): ReactPortal => {
    return {
        $$typeof: Symbol.for("react.portal"),
        key: key ?? null,
        children,
        containerInfo: container,
        implementation: null,
    } as unknown as ReactPortal;
};
