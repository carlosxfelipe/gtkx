import type { RawNode } from "./parse.js";
import type { PrimitiveCategory } from "./primitives.js";

export type TypeId = { nsId: number; id: number };

export const LIST_FLAVOR_BY_NAME = {
    "GLib.List": "glist",
    "GLib.SList": "gslist",
    "GLib.PtrArray": "gptrarray",
    "GLib.Array": "garray",
    "GLib.ByteArray": "gbytearray",
} as const;

export type ListFlavor = (typeof LIST_FLAVOR_BY_NAME)[keyof typeof LIST_FLAVOR_BY_NAME];

type PrimitiveType = { kind: "primitive"; category: PrimitiveCategory };

type VarargsType = { kind: "varargs" };

export type CArrayType = {
    kind: "carray";
    element: TypeId;
    elementCType: string | undefined;
    lengthParameterIndex: number | undefined;
    fixedSize: number | undefined;
};

export type ListType = {
    kind: "list";
    flavor: ListFlavor;
    element: TypeId;
};

export type HashTableType = {
    kind: "hashtable";
    key: TypeId;
    value: TypeId;
};

export type StructuralType = PrimitiveType | VarargsType | CArrayType | ListType | HashTableType;

export type ParseContext = {
    nsId: number;
    findType(name: string): TypeId;
    addPrimitive(category: PrimitiveCategory): TypeId;
    addVarargs(): TypeId;
    addContainer(type: CArrayType | ListType | HashTableType): TypeId;
    addAnonymousCallback(node: RawNode): TypeId;
};
