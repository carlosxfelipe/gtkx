import type * as Gtk from "@gtkx/ffi/gtk";
import { isStackPageContainer, type StackPageContainer, type StackPageProps } from "../container-interfaces.js";
import type { Props } from "../factory.js";
import { Node } from "../node.js";
import { PagedStackNode } from "./paged-stack.js";
import { applyStackPageProps } from "./stack-page-props.js";

export class StackNode extends PagedStackNode<Gtk.Stack> {
    static matches(type: string): boolean {
        return type === "Stack" || type === "Stack.Root";
    }

    addStackPage(child: Gtk.Widget, props: StackPageProps): void {
        const { name, title } = props;
        let stackPage: Gtk.StackPage;

        if (title !== undefined) {
            stackPage = this.widget.addTitled(child, title, name ?? null);
        } else if (name !== undefined) {
            stackPage = this.widget.addNamed(child, name);
        } else {
            stackPage = this.widget.addChild(child);
        }

        applyStackPageProps(stackPage, props);
        this.applyPendingVisibleChild();
    }

    protected override addChildToWidget(child: Gtk.Widget): void {
        this.widget.addChild(child);
    }
}

export class StackPageNode extends Node {
    static matches(type: string): boolean {
        return type === "Stack.Page" || type === "AdwViewStack.Page";
    }

    protected override isVirtual(): boolean {
        return true;
    }

    private pageProps: StackPageProps = {};
    private childWidget: Gtk.Widget | null = null;
    private parentContainer: (Node & StackPageContainer) | null = null;

    override initialize(props: Props): void {
        this.pageProps = this.extractPageProps(props);
        super.initialize(props);
    }

    private extractPageProps(props: Props): StackPageProps {
        return {
            name: typeof props.name === "string" ? props.name : undefined,
            title: typeof props.title === "string" ? props.title : undefined,
            iconName: typeof props.iconName === "string" ? props.iconName : undefined,
            needsAttention: typeof props.needsAttention === "boolean" ? props.needsAttention : undefined,
            visible: typeof props.visible === "boolean" ? props.visible : undefined,
            useUnderline: typeof props.useUnderline === "boolean" ? props.useUnderline : undefined,
            badgeNumber: typeof props.badgeNumber === "number" ? props.badgeNumber : undefined,
        };
    }

    getChildWidget(): Gtk.Widget | null {
        return this.childWidget;
    }

    override appendChild(child: Node): void {
        const childWidget = child.getWidget();
        if (childWidget) {
            this.childWidget = childWidget;
        }
    }

    override attachToParent(parent: Node): void {
        if (isStackPageContainer(parent) && this.childWidget) {
            this.parentContainer = parent;
            parent.addStackPage(this.childWidget, this.pageProps);
        }
    }

    override attachToParentBefore(parent: Node, before: Node): void {
        if (isStackPageContainer(parent) && this.childWidget) {
            this.parentContainer = parent;
            const beforePage = before instanceof StackPageNode ? before.getChildWidget() : before.getWidget();

            if (beforePage) {
                parent.insertStackPageBefore(this.childWidget, this.pageProps, beforePage);
            } else {
                parent.addStackPage(this.childWidget, this.pageProps);
            }
        }
    }

    override detachFromParent(parent: Node): void {
        if (isStackPageContainer(parent) && this.childWidget) {
            parent.removeStackPage(this.childWidget);
            this.parentContainer = null;
        }
    }

    protected override consumedProps(): Set<string> {
        const consumed = super.consumedProps();
        consumed.add("name");
        consumed.add("title");
        consumed.add("iconName");
        consumed.add("needsAttention");
        consumed.add("visible");
        consumed.add("useUnderline");
        consumed.add("badgeNumber");
        return consumed;
    }

    override updateProps(oldProps: Props, newProps: Props): void {
        const newPageProps = this.extractPageProps(newProps);
        const propsChanged =
            oldProps.name !== newProps.name ||
            oldProps.title !== newProps.title ||
            oldProps.iconName !== newProps.iconName ||
            oldProps.needsAttention !== newProps.needsAttention ||
            oldProps.visible !== newProps.visible ||
            oldProps.useUnderline !== newProps.useUnderline ||
            oldProps.badgeNumber !== newProps.badgeNumber;

        if (propsChanged) {
            this.pageProps = newPageProps;

            if (this.parentContainer && this.childWidget) {
                this.parentContainer.updateStackPageProps(this.childWidget, this.pageProps);
            }
        }

        super.updateProps(oldProps, newProps);
    }
}
