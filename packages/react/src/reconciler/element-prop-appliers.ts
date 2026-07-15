import type { AppliedProp, Call, ControlledTextProp, LazyProp, ListProp, ValueProp } from "@gtkx/config";
import type { TypedClass } from "@gtkx/ffi";
import { callMethod, isShallowEqual } from "@gtkx/utils";
import { appliedPropsFor, runCall } from "./element-props.js";
import type { Props } from "./types.js";

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const itemsEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    return isRecord(a) && isRecord(b) && isShallowEqual(a, b);
};

const listValuesEqual = (oldValue: unknown, newValue: unknown): boolean => {
    if (oldValue === newValue) return true;
    const a = asArray(oldValue);
    const b = asArray(newValue);
    return a.length === b.length && a.every((item, index) => itemsEqual(item, b[index]));
};

const runAdd = (instance: object, add: Call | Call[], item: unknown): void => {
    if (Array.isArray(add)) {
        for (const call of add) runCall(instance, call, [item], { item });
        return;
    }
    runCall(instance, add, [item], { item });
};

const snapshotItems = (items: unknown[]): unknown[] => items.map((item) => (isRecord(item) ? { ...item } : item));

const appliedLists = new WeakMap<object, Map<string, unknown[]>>();

const rememberAppliedList = (instance: object, prop: string, items: unknown[]): void => {
    const byProp = appliedLists.get(instance) ?? new Map<string, unknown[]>();
    byProp.set(prop, snapshotItems(items));
    appliedLists.set(instance, byProp);
};

const applyList = (instance: object, prop: ListProp, newValue: unknown): void => {
    const applied = appliedLists.get(instance)?.get(prop.prop);
    const newItems = asArray(newValue);
    if (applied !== undefined && listValuesEqual(applied, newItems)) return;
    if (prop.clear !== undefined) {
        runCall(instance, prop.clear, [], {});
        for (const item of newItems) runAdd(instance, prop.add, item);
        rememberAppliedList(instance, prop.prop, newItems);
        return;
    }
    if (prop.remove !== undefined) {
        for (const item of asArray(applied)) runCall(instance, prop.remove, [item], { item });
        for (const item of newItems) runAdd(instance, prop.add, item);
        rememberAppliedList(instance, prop.prop, newItems);
        return;
    }
    if (asArray(applied).length !== 0) return;
    for (const item of newItems) runAdd(instance, prop.add, item);
    rememberAppliedList(instance, prop.prop, newItems);
};

const applyValue = (instance: object, prop: ValueProp, oldValue: unknown, newValue: unknown): void => {
    if (oldValue === newValue) return;
    runCall(instance, prop.call, [newValue], { item: newValue });
    if (prop.after !== undefined) callMethod(instance, prop.after, []);
};

const applyControlledText = (
    instance: object,
    prop: ControlledTextProp,
    oldValue: unknown,
    newValue: unknown,
): void => {
    if (oldValue === newValue || typeof newValue !== "string") return;
    if (oldValue !== undefined && Reflect.get(instance, prop.prop) !== oldValue) return;
    Reflect.set(instance, prop.prop, newValue);
};

const applyLazy = (instance: object, prop: LazyProp, props: Props): void => {
    const value = props[prop.prop];
    if (value == null || value === "") return;
    if (Reflect.get(instance, prop.prop) === value) return;
    if (prop.lookup !== undefined && !callMethod(instance, prop.lookup, [value])) return;
    Reflect.set(instance, prop.prop, value);
};

const applyProp = (instance: object, prop: AppliedProp, oldProps: Props | null, newProps: Props): void => {
    const oldValue = oldProps?.[prop.prop];
    const newValue = newProps[prop.prop];
    switch (prop.kind) {
        case "value":
            applyValue(instance, prop, oldValue, newValue);
            return;
        case "controlled-text":
            applyControlledText(instance, prop, oldValue, newValue);
            return;
        case "lazy":
            applyLazy(instance, prop, newProps);
            return;
        case "list":
            applyList(instance, prop, newValue);
            return;
    }
};

export const applyElementProps = (instance: TypedClass & object, oldProps: Props | null, newProps: Props): void => {
    for (const prop of appliedPropsFor(instance.__type__).values()) {
        applyProp(instance, prop, oldProps, newProps);
    }
};

export const reapplyLazyProps = (instance: TypedClass & object, props: Props): void => {
    for (const prop of appliedPropsFor(instance.__type__).values()) {
        if (prop.kind === "lazy") applyLazy(instance, prop, props);
    }
};
