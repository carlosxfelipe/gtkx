import type * as GObject from "@gtkx/gi/gobject";
import type { SignalHandler } from "@gtkx/runtime";
import { useRef } from "react";
import type { ObjectProp } from "../utils/object-prop.js";
import { useObjectAttachment } from "./use-object-attachment.js";

type AnySignalHandler = (...args: unknown[]) => unknown;

type SignalsOf<T extends GObject.Object> = NonNullable<T["__signals__"]>;

export type SignalNameOf<T extends GObject.Object> =
    | (keyof SignalsOf<T> & string)
    | `${keyof SignalsOf<T> & string}::${string}`;

export type SignalHandlerFor<T extends GObject.Object, S extends string> = S extends keyof SignalsOf<T>
    ? SignalsOf<T>[S]
    : S extends `${infer TBase}::${string}`
      ? TBase extends keyof SignalsOf<T>
          ? SignalsOf<T>[TBase]
          : AnySignalHandler
      : AnySignalHandler;

type UseSignalOptions = {
    after?: boolean;
    immediate?: boolean;
};

type SignalSubscription = {
    obj: GObject.Object;
    signal: string;
    after: boolean;
    listener: SignalHandler;
};

/**
 * Connects a handler to a GObject signal for the lifetime of the component, reconnecting when the object changes.
 *
 * @param object The GObject (or ref to one) to connect to.
 * @param signal The signal name, optionally with a detail suffix.
 * @param handler The callback invoked when the signal is emitted.
 * @param options Connection options such as running after the default handler or invoking immediately.
 */
export function useSignal<T extends GObject.Object, S extends SignalNameOf<T>>(
    object: ObjectProp<T>,
    signal: S,
    handler: SignalHandlerFor<T, S>,
    options?: UseSignalOptions,
): void;
export function useSignal(
    object: ObjectProp<GObject.Object>,
    signal: string,
    handler: AnySignalHandler,
    options?: UseSignalOptions,
): void {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;
    const after = options?.after ?? false;
    const immediate = options?.immediate ?? false;

    useObjectAttachment<GObject.Object, SignalSubscription>(object, {
        attach: (obj) => {
            const listener: SignalHandler = (...args) => handlerRef.current(...args);
            obj.on(signal, listener, after);
            if (immediate) handlerRef.current();
            return { obj, signal, after, listener };
        },
        detach: (subscription) => subscription.obj.off(subscription.signal, subscription.listener),
        isSame: (subscription, obj) =>
            subscription.obj === obj && subscription.signal === signal && subscription.after === after,
    });
}
