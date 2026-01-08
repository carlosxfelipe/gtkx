import { isObjectEqual } from "@gtkx/ffi";
import * as Adw from "@gtkx/ffi/adw";
import type * as Gtk from "@gtkx/ffi/gtk";
import type { NavigationPageProps } from "../jsx.js";
import { registerNodeClass } from "../registry.js";
import { SlotNode } from "./slot.js";

type Props = Partial<NavigationPageProps>;

export class NavigationPageNode extends SlotNode<Props> {
    public static override priority = 1;

    private page?: Adw.NavigationPage;

    public static override matches(type: string): boolean {
        return type === "NavigationPage";
    }

    public getPage(): Adw.NavigationPage | undefined {
        return this.page;
    }

    public override updateProps(oldProps: Props | null, newProps: Props): void {
        super.updateProps(oldProps, newProps);

        if (!this.page) {
            return;
        }

        if (newProps.id !== undefined && (!oldProps || oldProps.id !== newProps.id)) {
            this.page.setTag(newProps.id);
        }

        if (newProps.title !== undefined && (!oldProps || oldProps.title !== newProps.title)) {
            this.page.setTitle(newProps.title);
        }

        if (newProps.canPop !== undefined && (!oldProps || oldProps.canPop !== newProps.canPop)) {
            this.page.setCanPop(newProps.canPop);
        }
    }

    private addPage(): void {
        const child = this.getChild();
        const parent = this.getParent() as Adw.NavigationView;

        const title = this.props.title ?? "";
        const page = this.props.id
            ? Adw.NavigationPage.newWithTag(child, title, this.props.id)
            : new Adw.NavigationPage(child, title);

        parent.add(page);
        this.page = page;
        this.updateProps(null, this.props);
    }

    private removePage(oldChild: Gtk.Widget | null): void {
        const parent = this.getParent() as Adw.NavigationView;

        if (!oldChild || !this.page) {
            return;
        }

        const pageChild = this.page.getChild();

        if (pageChild && isObjectEqual(pageChild, oldChild)) {
            parent.remove(this.page);
            this.page = undefined;
        }
    }

    protected override onChildChange(oldChild: Gtk.Widget | null): void {
        this.removePage(oldChild);

        if (this.child) {
            this.addPage();
        }
    }
}

registerNodeClass(NavigationPageNode);
