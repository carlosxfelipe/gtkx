import type * as Gtk from "@gtkx/ffi/gtk";
import ReactReconciler from "react-reconciler";
import packageJson from "../package.json" with { type: "json" };
import { createNode, type ROOT_NODE_CONTAINER } from "./factory.js";
import type { Node } from "./node.js";
import { createHostConfig, type ReconcilerInstance } from "./reconciler/host-config.js";

type Container = Gtk.Widget | typeof ROOT_NODE_CONTAINER;

class Reconciler {
    private instance: ReconcilerInstance;

    constructor() {
        const createNodeFromContainer = (container: Container): Node => {
            return createNode(container.constructor.name, {}, container);
        };

        this.instance = ReactReconciler(createHostConfig(createNodeFromContainer));
        this.injectDevTools();
    }

    getInstance(): ReconcilerInstance {
        return this.instance;
    }

    private injectDevTools(): void {
        if (process.env.NODE_ENV === "production") return;

        this.instance.injectIntoDevTools({
            bundleType: 1,
            version: packageJson.version,
            rendererPackageName: "@gtkx/react",
        });
    }
}

/**
 * The singleton GTKX React reconciler instance.
 * @private This is an internal API used only by @gtkx/testing. Do not use directly.
 */
export const reconciler = new Reconciler();
