import { read } from "@gtkx/native";
import { typeFromName, typeName } from "../generated/gobject/functions.js";
import type { GObject } from "../generated/gobject/object.js";
import { Value } from "../generated/gobject/value.js";
import type { NativeObject } from "../native/base.js";
import { Type } from "./types.js";

declare module "../generated/gobject/value.js" {
    interface Value {
        /**
         * Gets the Type of the value stored in this GValue.
         * This is equivalent to the C macro G_VALUE_TYPE(value).
         * @returns The Type identifier
         */
        getType(): number;

        /**
         * Gets the name of the Type stored in this GValue.
         * This is equivalent to G_VALUE_TYPE_NAME(value).
         * @returns The type name string
         */
        getTypeName(): string;

        /**
         * Checks if this GValue holds a value of the specified Type.
         * This is equivalent to G_VALUE_HOLDS(value, type).
         * @param gtype - The Type to check against
         * @returns true if the value holds the specified type
         */
        holds(gtype: number): boolean;
    }

    namespace Value {
        function newFromBoolean(value: boolean): Value;
        function newFromInt(value: number): Value;
        function newFromUint(value: number): Value;
        function newFromLong(value: number): Value;
        function newFromUlong(value: number): Value;
        function newFromInt64(value: number): Value;
        function newFromUint64(value: number): Value;
        function newFromFloat(value: number): Value;
        function newFromDouble(value: number): Value;
        function newFromString(value: string | null): Value;
        function newFromObject(value: GObject | null): Value;
        function newFromBoxed(value: NativeObject): Value;
        function newFromEnum(gtype: number, value: number): Value;
        function newFromFlags(gtype: number, value: number): Value;
    }
}

Value.prototype.getType = function (): number {
    return read(this.handle, { type: "int", size: 64, unsigned: true }, 0) as number;
};

Value.prototype.getTypeName = function (): string {
    const gtype = this.getType();
    return typeName(gtype) ?? "invalid";
};

Value.prototype.holds = function (gtype: number): boolean {
    return this.getType() === gtype;
};

interface ValueStatic {
    newFromBoolean(value: boolean): Value;
    newFromInt(value: number): Value;
    newFromUint(value: number): Value;
    newFromLong(value: number): Value;
    newFromUlong(value: number): Value;
    newFromInt64(value: number): Value;
    newFromUint64(value: number): Value;
    newFromFloat(value: number): Value;
    newFromDouble(value: number): Value;
    newFromString(value: string | null): Value;
    newFromObject(value: GObject | null): Value;
    newFromBoxed(value: NativeObject): Value;
    newFromEnum(gtype: number, value: number): Value;
    newFromFlags(gtype: number, value: number): Value;
}

const ValueWithStatics = Value as typeof Value & ValueStatic;

ValueWithStatics.newFromBoolean = (value: boolean): Value => {
    const v = new Value();
    v.init(Type.BOOLEAN);
    v.setBoolean(value);
    return v;
};

ValueWithStatics.newFromInt = (value: number): Value => {
    const v = new Value();
    v.init(Type.INT);
    v.setInt(value);
    return v;
};

ValueWithStatics.newFromUint = (value: number): Value => {
    const v = new Value();
    v.init(Type.UINT);
    v.setUint(value);
    return v;
};

ValueWithStatics.newFromLong = (value: number): Value => {
    const v = new Value();
    v.init(Type.LONG);
    v.setLong(value);
    return v;
};

ValueWithStatics.newFromUlong = (value: number): Value => {
    const v = new Value();
    v.init(Type.ULONG);
    v.setUlong(value);
    return v;
};

ValueWithStatics.newFromInt64 = (value: number): Value => {
    const v = new Value();
    v.init(Type.INT64);
    v.setInt64(value);
    return v;
};

ValueWithStatics.newFromUint64 = (value: number): Value => {
    const v = new Value();
    v.init(Type.UINT64);
    v.setUint64(value);
    return v;
};

ValueWithStatics.newFromFloat = (value: number): Value => {
    const v = new Value();
    v.init(Type.FLOAT);
    v.setFloat(value);
    return v;
};

ValueWithStatics.newFromDouble = (value: number): Value => {
    const v = new Value();
    v.init(Type.DOUBLE);
    v.setDouble(value);
    return v;
};

ValueWithStatics.newFromString = (value: string | null): Value => {
    const v = new Value();
    v.init(Type.STRING);
    v.setString(value);
    return v;
};

ValueWithStatics.newFromObject = (value: GObject | null): Value => {
    const v = new Value();
    if (value) {
        const gtype = typeFromName((value.constructor as typeof GObject).glibTypeName);
        v.init(gtype);
    } else {
        v.init(Type.OBJECT);
    }
    v.setObject(value);
    return v;
};

ValueWithStatics.newFromBoxed = (value: NativeObject): Value => {
    const v = new Value();
    const gtype = typeFromName((value.constructor as typeof NativeObject).glibTypeName);
    v.init(gtype);
    v.setBoxed(value.handle as unknown as number);
    return v;
};

ValueWithStatics.newFromEnum = (gtype: number, value: number): Value => {
    const v = new Value();
    v.init(gtype);
    v.setEnum(value);
    return v;
};

ValueWithStatics.newFromFlags = (gtype: number, value: number): Value => {
    const v = new Value();
    v.init(gtype);
    v.setFlags(value);
    return v;
};
