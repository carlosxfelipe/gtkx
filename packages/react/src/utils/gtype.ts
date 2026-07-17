/// <reference types="@gtkx/config/env" />

import { CONSTRUCT_ONLY_PROPS, CONSTRUCT_PROPS, DEFAULT_PROPS, SIGNALS } from "virtual:gtkx-config";
import * as GObject from "@gtkx/gi/gobject";
import { getWrapperClass, type TypedClass } from "@gtkx/runtime";
import { NOTIFY_SIGNAL, propToNotifySignal } from "./notify-name.js";

const NOTIFY_PREFIX = "onNotify";

const resolveNotifySignal = (propName: string): string | null => {
    if (propName === NOTIFY_PREFIX) return NOTIFY_SIGNAL;
    if (!propName.startsWith(NOTIFY_PREFIX)) return null;
    const tail = propName.slice(NOTIFY_PREFIX.length);
    if (tail.charAt(0) !== tail.charAt(0).toUpperCase()) return null;
    return propToNotifySignal(tail);
};

const typeNameChainCache = new Map<bigint, string[]>();
const interfaceNamesCache = new Map<bigint, string[]>();
const typeNameSetCache = new Map<bigint, Set<string>>();
const signalCache = new Map<bigint, Map<string, string | null>>();
const constructOnlyCache = new Map<bigint, Map<string, boolean>>();
const defaultPropCache = new Map<bigint, Map<string, DefaultPropLookup>>();
const constructablePropsCache = new Map<bigint, Set<string>>();

const memoizeGtype = <T>(cache: Map<bigint, T>, gtype: bigint, compute: () => T): T => {
    const cached = cache.get(gtype);
    if (cached !== undefined) return cached;
    const result = compute();
    cache.set(gtype, result);
    return result;
};

const collectTypeNameChain = (gtype: bigint): string[] =>
    memoizeGtype(typeNameChainCache, gtype, () => {
        const chain: string[] = [];
        let current = gtype;
        while (current !== 0n) {
            const name = GObject.typeName(current);
            if (!name) break;
            chain.push(name);
            current = GObject.typeParent(current);
        }
        return chain;
    });

const collectInterfaceNames = (gtype: bigint): string[] =>
    memoizeGtype(interfaceNamesCache, gtype, () => {
        const names: string[] = [];
        for (const iface of GObject.typeInterfaces(gtype)) {
            const name = GObject.typeName(iface);
            if (name) names.push(name);
        }
        return names;
    });

const typeNamesWithInterfacesCache = new Map<bigint, string[]>();

export const collectTypeNamesWithInterfaces = (gtype: bigint): string[] =>
    memoizeGtype(typeNamesWithInterfacesCache, gtype, () => [
        ...collectTypeNameChain(gtype),
        ...collectInterfaceNames(gtype),
    ]);

const foldInheritedTable = <R, T>(
    gtype: bigint,
    table: Record<string, R>,
    fold: (accumulator: T, row: R) => T,
    seed: T,
): T => {
    let accumulator = seed;
    for (const name of collectTypeNameChain(gtype)) {
        const row = table[name];
        if (row !== undefined) accumulator = fold(accumulator, row);
    }
    return accumulator;
};

export const foldInheritedTableWithInterfaces = <R, T>(
    gtype: bigint,
    table: Record<string, R>,
    fold: (accumulator: T, row: R) => T,
    seed: T,
): T => {
    let accumulator = foldInheritedTable(gtype, table, fold, seed);
    for (const name of collectInterfaceNames(gtype)) {
        const row = table[name];
        if (row !== undefined) accumulator = fold(accumulator, row);
    }
    return accumulator;
};

export const typeChainIncludes = (gtype: bigint, name: string): boolean =>
    memoizeGtype(typeNameSetCache, gtype, () => new Set(collectTypeNameChain(gtype))).has(name);

const memoize = <T>(
    cache: Map<bigint, Map<string, T>>,
    instance: TypedClass,
    key: string,
    compute: (typeNames: string[]) => T,
): T => {
    const gtype = instance.__type__;
    const perGtype = memoizeGtype(cache, gtype, () => new Map<string, T>());
    const cached = perGtype.get(key);
    if (cached !== undefined) return cached;
    const result = compute(collectTypeNameChain(gtype));
    perGtype.set(key, result);
    return result;
};

export const collectConstructableProps = (gtype: bigint): Set<string> =>
    memoizeGtype(constructablePropsCache, gtype, () =>
        foldInheritedTable(
            gtype,
            CONSTRUCT_PROPS,
            (collected: Set<string>, props) => {
                for (const prop of props) collected.add(prop);
                return collected;
            },
            new Set<string>(),
        ),
    );

export const isConstructOnlyProp = (instance: TypedClass, key: string): boolean =>
    memoize(constructOnlyCache, instance, key, (typeNames) => {
        for (const name of typeNames) {
            if (CONSTRUCT_ONLY_PROPS[name]?.has(key)) return true;
        }
        return false;
    });

export const resolveSignal = (instance: TypedClass, propName: string): string | null => {
    const notify = resolveNotifySignal(propName);
    if (notify) return notify;
    return memoize(signalCache, instance, propName, (typeNames) => {
        for (const name of typeNames) {
            const result = SIGNALS[name]?.[propName];
            if (result) return result;
        }
        return null;
    });
};

type DefaultPropLookup = { has: boolean; value: unknown };

const NO_DEFAULT_PROP: DefaultPropLookup = { has: false, value: undefined };

export const resolveDefaultProp = (instance: TypedClass, key: string): DefaultPropLookup =>
    memoize(defaultPropCache, instance, key, (typeNames) => {
        for (const name of typeNames) {
            const table = DEFAULT_PROPS[name];
            if (table && key in table) return { has: true, value: table[key] };
        }
        return NO_DEFAULT_PROP;
    });

export const requireClassByName = (typeName: string): (new (props: Record<string, unknown>) => GObject.Object) => {
    const gtype = GObject.typeFromName(typeName);
    if (gtype === GObject.TYPE_INVALID)
        throw new Error(
            `${typeName} is not registered. Import its @gtkx/jsx namespace module (e.g. \`import "@gtkx/jsx/adw"\`) before use.`,
        );
    return getWrapperClass(gtype) as new (
        props: Record<string, unknown>,
    ) => GObject.Object;
};
