import { act as reactAct } from "react";

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Returns the current `IS_REACT_ACT_ENVIRONMENT` flag.
 *
 * Async utilities such as {@link waitFor} call this to remember the caller's
 * environment before clearing the flag for the duration of the poll.
 */
export const getIsReactActEnvironment = (): boolean | undefined => globalThis.IS_REACT_ACT_ENVIRONMENT;

/**
 * Sets the `IS_REACT_ACT_ENVIRONMENT` flag.
 *
 * Used by {@link act} and the async utilities to toggle React's act tracking
 * around scopes that should — or should not — capture state updates.
 */
export const setIsReactActEnvironment = (value: boolean | undefined): void => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = value;
};

type ActImplementation = <T>(callback: () => T | Promise<T>) => PromiseLike<T>;

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
    value !== null && typeof value === "object" && typeof (value as { then?: unknown }).then === "function";

const withGlobalActEnvironment =
    (actImplementation: ActImplementation) =>
    <T>(callback: () => T | Promise<T>): PromiseLike<T> => {
        const previousActEnvironment = getIsReactActEnvironment();
        setIsReactActEnvironment(true);
        try {
            let callbackNeedsToBeAwaited = false;
            const actResult = actImplementation<T>(() => {
                const result = callback();
                if (isThenable(result)) callbackNeedsToBeAwaited = true;
                return result;
            });
            if (callbackNeedsToBeAwaited) {
                return new Promise<T>((resolve, reject) => {
                    actResult.then(
                        (returnValue) => {
                            setIsReactActEnvironment(previousActEnvironment);
                            resolve(returnValue);
                        },
                        (error) => {
                            setIsReactActEnvironment(previousActEnvironment);
                            reject(error);
                        },
                    );
                });
            }
            setIsReactActEnvironment(previousActEnvironment);
            return actResult;
        } catch (error) {
            setIsReactActEnvironment(previousActEnvironment);
            throw error;
        }
    };

/**
 * GTK-flavored mirror of `@testing-library/react`'s `act`.
 *
 * Sets `IS_REACT_ACT_ENVIRONMENT` for the duration of the call and runs the
 * callback inside a single React `act` scope. Sync callbacks execute and
 * commit synchronously; the returned thenable carries any remaining work and
 * may be awaited if the caller needs to observe its result. Async callbacks
 * return a thenable that resolves after React has settled and the previous
 * environment value has been restored.
 *
 * Mirrors {@link https://github.com/testing-library/react-testing-library/blob/main/src/act-compat.js | RTL's act-compat} almost verbatim: it is a transparent wrapper around the React `act`
 * implementation that only manages the act-environment flag — it does not
 * drive the GLib runloop, schedule timers, or wait on frame-clock callbacks.
 * Asynchronous settlement is the responsibility of {@link waitFor} and the
 * `findBy*` queries that use it.
 *
 * @example
 * ```tsx
 * await act(() => widget.setSensitive(false));
 *
 * await act(async () => {
 *     widget.activate();
 *     await screen.findByText("Done");
 * });
 * ```
 */
export const act = withGlobalActEnvironment(reactAct as ActImplementation);
