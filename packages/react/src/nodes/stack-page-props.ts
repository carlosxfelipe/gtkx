import type { StackPageProps } from "../container-interfaces.js";

export type StackPageLike = {
    setName(name: string): void;
    setTitle(title: string): void;
    setIconName(iconName: string): void;
    setNeedsAttention(needsAttention: boolean): void;
    setVisible(visible: boolean): void;
    setUseUnderline(useUnderline: boolean): void;
    setBadgeNumber?(badgeNumber: number): void;
};

export function applyStackPageProps(page: StackPageLike, props: StackPageProps): void {
    if (props.name !== undefined) {
        page.setName(props.name);
    }

    if (props.title !== undefined) {
        page.setTitle(props.title);
    }

    if (props.iconName !== undefined) {
        page.setIconName(props.iconName);
    }

    if (props.needsAttention !== undefined) {
        page.setNeedsAttention(props.needsAttention);
    }

    if (props.visible !== undefined) {
        page.setVisible(props.visible);
    }

    if (props.useUnderline !== undefined) {
        page.setUseUnderline(props.useUnderline);
    }

    if (props.badgeNumber !== undefined && page.setBadgeNumber) {
        page.setBadgeNumber(props.badgeNumber);
    }
}
