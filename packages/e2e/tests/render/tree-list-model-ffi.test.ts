import { start } from "@gtkx/ffi";
import * as Gio from "@gtkx/ffi/gio";
import * as Gtk from "@gtkx/ffi/gtk";
import { beforeAll, describe, expect, it } from "vitest";

describe("TreeListModel FFI", () => {
    beforeAll(() => {
        start("org.gtkx.test.treelist", Gio.ApplicationFlags.NON_UNIQUE);
    });

    it("calls createChildModel callback and receives children", () => {
        const rootModel = new Gtk.StringList(["parent1", "parent2"]);

        const childrenMap = new Map<string, string[]>([
            ["parent1", ["child1", "child2"]],
            ["parent2", ["child3"]],
        ]);

        let callbackCallCount = 0;
        const callbackArgs: string[] = [];
        const returnedModels: (Gtk.StringList | null)[] = [];

        const createChildModel = (item: unknown): Gtk.StringList | null => {
            callbackCallCount++;
            if (!(item instanceof Gtk.StringObject)) {
                returnedModels.push(null);
                return null;
            }

            const parentId = item.getString();
            callbackArgs.push(parentId);

            const children = childrenMap.get(parentId);
            if (!children || children.length === 0) {
                returnedModels.push(null);
                return null;
            }

            const model = new Gtk.StringList(children);
            returnedModels.push(model);
            return model;
        };

        const treeListModel = new Gtk.TreeListModel(rootModel, false, true, createChildModel);

        console.log("callbackCallCount:", callbackCallCount);
        console.log("callbackArgs:", callbackArgs);
        console.log("returnedModels count:", returnedModels.length);
        console.log("returnedModels[0] id:", returnedModels[0]?.id);
        console.log("returnedModels[0] getNItems:", returnedModels[0]?.getNItems());

        expect(treeListModel.getNItems()).toBeGreaterThan(0);
        expect(callbackCallCount).toBeGreaterThan(0);
        expect(callbackArgs).toContain("parent1");

        const row0 = treeListModel.getRow(0);
        console.log("row0:", row0);
        console.log("row0.isExpandable():", row0?.isExpandable());
        console.log("row0.getChildren():", row0?.getChildren());

        expect(row0).not.toBeNull();
        expect(row0?.isExpandable()).toBe(true);
    });

    it("returns correct item count with autoexpand", () => {
        const rootModel = new Gtk.StringList(["parent"]);

        const createChildModel = (item: unknown): Gtk.StringList | null => {
            if (!(item instanceof Gtk.StringObject)) return null;
            const parentId = item.getString();
            if (parentId === "parent") {
                return new Gtk.StringList(["child1", "child2"]);
            }
            return null;
        };

        const treeListModel = new Gtk.TreeListModel(rootModel, false, true, createChildModel);

        expect(treeListModel.getNItems()).toBe(3);
    });

    it("row is expandable when createChildModel returns non-null", () => {
        const rootModel = new Gtk.StringList(["expandable", "not-expandable"]);

        const createChildModel = (item: unknown): Gtk.StringList | null => {
            if (!(item instanceof Gtk.StringObject)) return null;
            const id = item.getString();
            if (id === "expandable") {
                return new Gtk.StringList(["child"]);
            }
            return null;
        };

        const treeListModel = new Gtk.TreeListModel(rootModel, false, false, createChildModel);

        const row0 = treeListModel.getRow(0);
        const row1 = treeListModel.getRow(1);

        expect(row0?.isExpandable()).toBe(true);
        expect(row1?.isExpandable()).toBe(false);
    });
});
