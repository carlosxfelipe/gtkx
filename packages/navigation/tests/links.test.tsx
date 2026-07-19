import * as Gio from "@gtkx/gi/gio";
import * as Gtk from "@gtkx/gi/gtk";
import { AdwApplicationWindow } from "@gtkx/jsx/adw";
import { GtkApplication, GtkBox, GtkLabel, GtkToggleButton } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import { createRef, type ReactNode, type RefObject, useState } from "react";
import { describe, expect, it } from "vitest";
import {
    createNavigationContainerRef,
    createStackNavigator,
    type LinkingOptions,
    NavigationContainer,
    type NavigationContainerRefWithCurrent,
} from "../src/index.js";
import { Link } from "../src/links/link.js";
import type { ActivatableLinkProps, LinkBuilder } from "../src/links/types.js";
import { useLinkBuilder } from "../src/links/use-link-builder.js";
import { useLinkProps } from "../src/links/use-link-props.js";
import { useLinkTo } from "../src/links/use-link-to.js";
import { useScrollToTop, type VerticallyScrollable } from "../src/links/use-scroll-to-top.js";
import { useWindowTitle } from "../src/links/use-window-title.js";

type LinksParams = { Home: undefined; Details: undefined; Settings: undefined };

const LinksStack = createStackNavigator<LinksParams>();

const LINKING: LinkingOptions<LinksParams> = {
    prefixes: ["myapp://"],
    config: { screens: { Home: "Home", Details: "Details", Settings: "Settings" } },
};

const CUSTOM_PATH_LINKING: LinkingOptions<LinksParams> = {
    prefixes: ["myapp://"],
    config: { screens: { Home: "", Details: "the-details", Settings: "prefs" } },
};

let nextAppId = 0;
const uniqueAppId = (): string => `org.gtkx.linkstest${nextAppId++}`;

const InApp = ({ children }: { children: ReactNode }): ReactNode => {
    const [appId] = useState(uniqueAppId);
    return (
        <GtkApplication applicationId={appId} flags={Gio.ApplicationFlags.NON_UNIQUE}>
            <AdwApplicationWindow defaultWidth={640} defaultHeight={480}>
                {children}
            </AdwApplicationWindow>
        </GtkApplication>
    );
};

const HomeScreen = (): ReactNode => <GtkLabel>Home Content</GtkLabel>;
const DetailsScreen = (): ReactNode => <GtkLabel>Details Content</GtkLabel>;
const SettingsScreen = (): ReactNode => <GtkLabel>Settings Content</GtkLabel>;

type LinksHarness = {
    navigationRef: NavigationContainerRefWithCurrent<LinksParams>;
    routeNames: () => string[];
    focused: () => string | undefined;
};

type RenderLinksOptions = {
    withoutLinking?: boolean;
    probe?: ReactNode;
    homeComponent?: () => ReactNode;
    wrapper?: (children: ReactNode) => ReactNode;
    linking?: LinkingOptions<LinksParams>;
};

const renderLinks = async (options: RenderLinksOptions = {}): Promise<LinksHarness> => {
    const navigationRef = createNavigationContainerRef<LinksParams>();

    const tree = (
        <NavigationContainer
            ref={navigationRef}
            {...(options.withoutLinking !== true && { linking: options.linking ?? LINKING })}
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL}>
                <LinksStack.Navigator>
                    <LinksStack.Screen name="Home" component={options.homeComponent ?? HomeScreen} />
                    <LinksStack.Screen name="Details" component={DetailsScreen} options={{ title: "The details" }} />
                    <LinksStack.Screen name="Settings" component={SettingsScreen} />
                </LinksStack.Navigator>
                {options.probe}
            </GtkBox>
        </NavigationContainer>
    );

    await render(options.wrapper ? options.wrapper(tree) : tree);
    await screen.findByText("Home Content");

    return {
        navigationRef,
        routeNames: () => navigationRef.getRootState().routes.map((route) => route.name),
        focused: () => navigationRef.getCurrentRoute()?.name,
    };
};

type Captured<T> = { current: T | undefined };

const probeFor = <T,>(useHook: () => T): [Captured<T>, ReactNode] => {
    const captured: Captured<T> = { current: undefined };
    const Probe = (): ReactNode => {
        captured.current = useHook();
        return null;
    };
    return [captured, <Probe />];
};

describe("useLinkBuilder", () => {
    it.each([
        ["builds an href for a sibling route of the current navigator", false, "/Details"],
        ["returns no href when linking is not configured", true, undefined],
    ])("%s", async (_label, withoutLinking, expected) => {
        const [builder, probe] = probeFor<LinkBuilder>(useLinkBuilder);

        await renderLinks({ withoutLinking, probe });

        expect(builder.current?.buildHref("Details")).toBe(expected);
    });

    it("builds a navigate action from an href", async () => {
        const [builder, probe] = probeFor<LinkBuilder>(useLinkBuilder);

        await renderLinks({ probe });

        expect(builder.current?.buildAction("/Details")).toMatchObject({
            type: "NAVIGATE",
            payload: { name: "Details" },
        });
    });

    it("resolves an href through the app's path config rather than the route name", async () => {
        const [builder, probe] = probeFor<LinkBuilder>(useLinkBuilder);

        await renderLinks({ probe, linking: CUSTOM_PATH_LINKING });

        expect(builder.current?.buildAction("/the-details")).toMatchObject({
            type: "NAVIGATE",
            payload: { name: "Details" },
        });
        expect(builder.current?.buildAction("/Details")).toBeUndefined();
    });
});

describe("useLinkTo", () => {
    it.each([
        ["a path", "/Details", "Details", "Details Content"],
        ["a full URI carrying a configured prefix", "myapp://Settings", "Settings", "Settings Content"],
    ])("navigates to %s", async (_label, href, expectedRoute, expectedText) => {
        const [linkTo, probe] = probeFor<(href: string) => void>(useLinkTo);

        const harness = await renderLinks({ probe });

        await act(() => {
            linkTo.current?.(href);
        });

        expect(harness.focused()).toBe(expectedRoute);
        await screen.findByText(expectedText);
    });
});

describe("useLinkProps", () => {
    it("resolves an href and navigates for a screen target", async () => {
        const [link, probe] = probeFor<ActivatableLinkProps>(() => useLinkProps({ screen: "Details" }));

        const harness = await renderLinks({ probe });

        expect(link.current?.href).toBe("/Details");

        await act(() => {
            link.current?.onClicked();
        });

        expect(harness.routeNames()).toEqual(["Home", "Details"]);
    });

    it("navigates for an href target", async () => {
        const [link, probe] = probeFor<ActivatableLinkProps>(() => useLinkProps({ href: "/Settings" }));

        const harness = await renderLinks({ probe });

        expect(link.current?.href).toBe("/Settings");

        await act(() => {
            link.current?.onClicked();
        });

        expect(harness.focused()).toBe("Settings");
    });
});

describe("Link", () => {
    it("renders a GtkButton and navigates when it is clicked", async () => {
        const buttonRef = createRef<Gtk.Button>();
        const harness = await renderLinks({
            probe: <Link screen="Details" label="Open details" ref={buttonRef} />,
        });

        const button = buttonRef.current;
        expect(button).toBeInstanceOf(Gtk.Button);

        await act(() => {
            button?.emit("clicked");
        });

        expect(harness.routeNames()).toEqual(["Home", "Details"]);
    });

    it("honors a component override", async () => {
        const toggleRef = createRef<Gtk.ToggleButton>();
        const harness = await renderLinks({
            probe: <Link component={GtkToggleButton} screen="Settings" label="Open settings" ref={toggleRef} />,
        });

        expect(toggleRef.current).toBeInstanceOf(Gtk.ToggleButton);

        await act(() => {
            toggleRef.current?.emit("clicked");
        });

        expect(harness.focused()).toBe("Settings");
    });
});

describe("useScrollToTop", () => {
    const makeScrollable = (adjustment: Gtk.Adjustment): VerticallyScrollable => ({
        getVadjustment: () => adjustment,
    });

    it("leaves the position alone on the first focus and resets it on re-focus", async () => {
        const adjustment = Gtk.Adjustment.new(0, 0, 1000, 10, 100, 100);
        const scrollableRef: RefObject<VerticallyScrollable | null> = { current: makeScrollable(adjustment) };

        const ScrollingHome = (): ReactNode => {
            useScrollToTop(scrollableRef);
            return <GtkLabel>Home Content</GtkLabel>;
        };

        const harness = await renderLinks({ homeComponent: ScrollingHome });

        adjustment.setValue(400);
        expect(adjustment.getValue()).toBe(400);

        await act(() => {
            harness.navigationRef.navigate("Details");
        });
        await screen.findByText("Details Content");
        expect(adjustment.getValue()).toBe(400);

        await act(() => {
            harness.navigationRef.goBack();
        });
        await screen.findByText("Home Content");

        expect(adjustment.getValue()).toBe(0);
    });

    it("ignores a ref that is not populated", async () => {
        const emptyRef: RefObject<VerticallyScrollable | null> = { current: null };
        const ScrollingHome = (): ReactNode => {
            useScrollToTop(emptyRef);
            return <GtkLabel>Home Content</GtkLabel>;
        };

        const harness = await renderLinks({ homeComponent: ScrollingHome });

        await act(() => {
            harness.navigationRef.navigate("Details");
        });
        await act(() => {
            harness.navigationRef.goBack();
        });

        expect(harness.focused()).toBe("Home");
    });
});

describe("useWindowTitle", () => {
    const TitleProbe = ({ format }: { format?: (title: string) => string }): ReactNode => {
        useWindowTitle(format);
        return null;
    };

    const windowFor = (): Gtk.Window => {
        const label = screen.getByText("Home Content");
        for (let node: Gtk.Widget | null = label; node !== null; node = node.getParent()) {
            if (node instanceof Gtk.Window) return node;
        }
        throw new Error("No Gtk.Window ancestor found");
    };

    it("mirrors the focused route options title onto the parent window", async () => {
        const harness = await renderLinks({
            probe: <TitleProbe />,
            wrapper: (children) => <InApp>{children}</InApp>,
        });

        expect(windowFor().getTitle()).toBe("Home");

        await act(() => {
            harness.navigationRef.navigate("Details");
        });
        await screen.findByText("Details Content");

        expect(windowFor().getTitle()).toBe("The details");
    });

    it("applies a formatter", async () => {
        await renderLinks({
            probe: <TitleProbe format={(title) => `${title} - MyApp`} />,
            wrapper: (children) => <InApp>{children}</InApp>,
        });

        expect(windowFor().getTitle()).toBe("Home - MyApp");
    });

    it("does nothing when there is no parent window", async () => {
        const harness = await renderLinks({ probe: <TitleProbe /> });

        expect(windowFor().getTitle()).not.toBe("Home");
        expect(harness.focused()).toBe("Home");
    });
});
