import "../motion-env.js";
import { Feature, type VisualElement } from "motion-dom";
import { WidgetProxy } from "../bridge/widget-proxy.js";

export abstract class WidgetFeature extends Feature<unknown> {
    constructor(node: unknown) {
        super(node as VisualElement<unknown>);
    }

    protected currentProxy(): WidgetProxy | null {
        const current = this.node.current;
        return current instanceof WidgetProxy ? current : null;
    }
}
