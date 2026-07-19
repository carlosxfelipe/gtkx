import * as Adw from "@gtkx/gi/adw";
import * as Gio from "@gtkx/gi/gio";
import type * as Gtk from "@gtkx/gi/gtk";
import { AdwApplicationWindow } from "@gtkx/jsx/adw";
import { GtkApplication, GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import type { InitialState } from "@react-navigation/core";
import { createRef, type ReactNode, type RefObject, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
    createNavigationContainerRef,
    createStackNavigator,
    NavigationContainer,
    type NavigationContainerRefWithCurrent,
    type NavigationState,
    type StackScreenOptions,
    usePreventRemove,
} from "../src/index.js";
import { liveTags, requireView } from "./fixtures.js";

let nextAppId = 0;
const uniqueAppId = (): string => `org.gtkx.stackmodaltest${nextAppId++}`;

const InApp = ({ children }: { children: ReactNode }): ReactNode => {
    const [appId] = useState(uniqueAppId);
    return (
        <GtkApplication applicationId={appId} flags={Gio.ApplicationFlags.NON_UNIQUE}>
            <AdwApplicationWindow defaultWidth={800} defaultHeight={600}>
                {children}
            </AdwApplicationWindow>
        </GtkApplication>
    );
};

const findDialog = async (text: string): Promise<Adw.Dialog> => {
    const content = await screen.findByText(text);
    for (let node: Gtk.Widget | null = content; node !== null; node = node.getParent()) {
        if (node instanceof Adw.Dialog) return node;
    }
    throw new Error(`No Adw.Dialog ancestor found for text "${text}"`);
};

type ModalParams = { List: undefined; Details: undefined; Task: undefined };

const ModalStack = createStackNavigator<ModalParams>();

const ListScreen = (): ReactNode => <GtkLabel>List Content</GtkLabel>;
const DetailsScreen = (): ReactNode => <GtkLabel>Details Content</GtkLabel>;
const TaskScreen = (): ReactNode => <GtkLabel>Task Content</GtkLabel>;

type ModalHarness = {
    viewRef: RefObject<Adw.NavigationView | null>;
    navigationRef: NavigationContainerRefWithCurrent<ModalParams>;
    view: () => Adw.NavigationView;
    routeKey: (name: keyof ModalParams) => string | undefined;
    routeNames: () => string[];
};

type RenderModalOptions = {
    detailsOptions?: StackScreenOptions;
    detailsComponent?: () => ReactNode;
    initialState?: InitialState;
    onStateChange?: (state: NavigationState | undefined) => void;
};

const renderModalStack = async (options: RenderModalOptions = {}): Promise<ModalHarness> => {
    const viewRef = createRef<Adw.NavigationView>();
    const navigationRef = createNavigationContainerRef<ModalParams>();
    const detailsOptions: StackScreenOptions = { presentation: "modal", ...options.detailsOptions };

    await render(
        <InApp>
            <NavigationContainer
                ref={navigationRef}
                {...(options.initialState !== undefined && { initialState: options.initialState })}
                {...(options.onStateChange !== undefined && { onStateChange: options.onStateChange })}
            >
                <ModalStack.Navigator ref={viewRef}>
                    <ModalStack.Screen name="List" component={ListScreen} />
                    <ModalStack.Screen
                        name="Details"
                        component={options.detailsComponent ?? DetailsScreen}
                        options={detailsOptions}
                    />
                    <ModalStack.Screen name="Task" component={TaskScreen} />
                </ModalStack.Navigator>
            </NavigationContainer>
        </InApp>,
    );

    await screen.findByText("List Content");

    return {
        viewRef,
        navigationRef,
        view: () => requireView(viewRef),
        routeKey: (name) => navigationRef.getRootState().routes.find((route) => route.name === name)?.key,
        routeNames: () => navigationRef.getRootState().routes.map((route) => route.name),
    };
};

const openDetails = async (harness: ModalHarness): Promise<Adw.Dialog> => {
    await act(() => {
        harness.navigationRef.navigate("Details");
    });
    return findDialog("Details Content");
};

describe("stack modal - presentation", () => {
    it("presents an Adw.Dialog titled from the title option", async () => {
        const harness = await renderModalStack({ detailsOptions: { title: "Task details" } });

        const dialog = await openDetails(harness);

        expect(dialog).toBeInstanceOf(Adw.Dialog);
        expect(dialog.getTitle()).toBe("Task details");
    });

    it("falls back to the route name when no title option is given", async () => {
        const harness = await renderModalStack();

        const dialog = await openDetails(harness);

        expect(dialog.getTitle()).toBe("Details");
    });

    it("keeps the modal route out of the navigation view stack", async () => {
        const harness = await renderModalStack();
        const listKey = harness.routeKey("List");

        await openDetails(harness);

        expect(harness.routeNames()).toEqual(["List", "Details"]);
        expect(liveTags(harness.view())).toEqual(listKey === undefined ? [] : [listKey]);
        expect(harness.view().getVisiblePageTag()).toBe(listKey);
    });

    it("maps presentation modal to AUTO", async () => {
        const harness = await renderModalStack();

        const dialog = await openDetails(harness);

        expect(dialog.getPresentationMode()).toBe(Adw.DialogPresentationMode.AUTO);
    });

    it("maps presentation bottomSheet to BOTTOM_SHEET", async () => {
        const harness = await renderModalStack({ detailsOptions: { presentation: "bottomSheet" } });

        const dialog = await openDetails(harness);

        expect(dialog.getPresentationMode()).toBe(Adw.DialogPresentationMode.BOTTOM_SHEET);
    });

    it("forwards sizing options to the dialog", async () => {
        const harness = await renderModalStack({
            detailsOptions: { contentWidth: 420, contentHeight: 310, followsContentSize: true },
        });

        const dialog = await openDetails(harness);

        expect(dialog.getContentWidth()).toBe(420);
        expect(dialog.getContentHeight()).toBe(310);
        expect(dialog.getFollowsContentSize()).toBe(true);
    });

    it("maps canPop false onto the dialog close ability", async () => {
        const harness = await renderModalStack({ detailsOptions: { canPop: false } });

        const dialog = await openDetails(harness);

        expect(dialog.getCanClose()).toBe(false);
    });
});

describe("stack modal - dismissal", () => {
    it("reduces a dialog close into a pop of exactly that route, once", async () => {
        const onStateChange = vi.fn();
        const harness = await renderModalStack({ onStateChange });

        const dialog = await openDetails(harness);
        onStateChange.mockClear();

        await act(() => {
            dialog.close();
        });

        expect(onStateChange).toHaveBeenCalledTimes(1);
        expect(harness.routeNames()).toEqual(["List"]);
        expect(screen.queryByText("Details Content")).toBeNull();
    });

    it("dismisses the dialog when React navigates away without an echoed dispatch", async () => {
        const onStateChange = vi.fn();
        const harness = await renderModalStack({ onStateChange });

        await openDetails(harness);
        onStateChange.mockClear();

        await act(() => {
            harness.navigationRef.goBack();
        });

        expect(onStateChange).toHaveBeenCalledTimes(1);
        expect(harness.routeNames()).toEqual(["List"]);
        expect(screen.queryByText("Details Content")).toBeNull();
    });

    it("dismisses a modal sitting beneath the top route without touching the top route", async () => {
        const onStateChange = vi.fn();
        const harness = await renderModalStack({
            initialState: { index: 2, routes: [{ name: "List" }, { name: "Details" }, { name: "Task" }] },
            onStateChange,
        });
        await screen.findByText("Task Content");
        const taskKey = harness.routeKey("Task");
        const dialog = await findDialog("Details Content");
        onStateChange.mockClear();

        await act(() => {
            dialog.close();
        });

        expect(onStateChange).toHaveBeenCalledTimes(1);
        expect(harness.routeNames()).toEqual(["List", "Task"]);
        expect(harness.view().getVisiblePageTag()).toBe(taskKey);
        expect(screen.queryByText("Details Content")).toBeNull();
    });
});

describe("stack modal - prevent remove", () => {
    it("blocks the close attempt and keeps the route alive", async () => {
        const onBeforeRemove = vi.fn();
        const GuardedDetails = (): ReactNode => {
            usePreventRemove(true, onBeforeRemove);
            return <GtkLabel>Details Content</GtkLabel>;
        };
        const harness = await renderModalStack({ detailsComponent: GuardedDetails });

        const dialog = await openDetails(harness);
        expect(dialog.getCanClose()).toBe(false);

        await act(() => {
            dialog.emit("close-attempt");
        });

        expect(onBeforeRemove).toHaveBeenCalledTimes(1);
        expect(harness.routeNames()).toEqual(["List", "Details"]);
        await screen.findByText("Details Content");
    });
});

describe("stack modal - guards", () => {
    it("throws when every route is a modal", async () => {
        const OnlyModal = createStackNavigator<{ Details: undefined }>();

        await expect(
            render(
                <InApp>
                    <NavigationContainer>
                        <OnlyModal.Navigator>
                            <OnlyModal.Screen
                                name="Details"
                                component={DetailsScreen}
                                options={{ presentation: "modal" }}
                            />
                        </OnlyModal.Navigator>
                    </NavigationContainer>
                </InApp>,
            ),
        ).rejects.toThrow('The stack navigator requires at least one route with presentation "page"');
    });
});
