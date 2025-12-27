export abstract class NativeObject {
    static readonly glibTypeName: string;

    static readonly objectType: "gobject" | "interface" | "boxed" | "gvariant";

    id: unknown;

    // biome-ignore lint/complexity/noUselessConstructor: Required for NativeClass type compatibility
    // biome-ignore lint/suspicious/noExplicitAny: Required for NativeClass type compatibility
    constructor(..._args: any[]) {}
}

// biome-ignore lint/suspicious/noExplicitAny: Required for contravariant behavior
export type NativeClass<T extends NativeObject = NativeObject> = typeof NativeObject & (new (...args: any[]) => T);

export let isInstantiating = false;

export const setInstantiating = (value: boolean): void => {
    isInstantiating = value;
};
