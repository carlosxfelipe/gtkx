import * as Adw from "@gtkx/gi/adw";
import { GtkLabel } from "@gtkx/jsx/gtk";
import { act, render, screen } from "@gtkx/testing";
import type { InitialState } from "@react-navigation/core";
import { createRef, type ReactNode, type RefObject } from "react";
import {
    createNavigationContainerRef,
    createStackNavigator,
    NavigationContainer,
    type NavigationContainerRefWithCurrent,
    type NavigationState,
    type StackScreenOptions,
    useRoute,
} from "../src/index.js";

export type TasksParams = {
    List: undefined;
    Task: { id: string };
};

export const requireView = (ref: RefObject<Adw.NavigationView | null>): Adw.NavigationView => {
    const view = ref.current;
    if (!view) throw new Error("NavigationView ref was not populated");
    return view;
};

export const liveTags = (view: Adw.NavigationView): string[] => {
    const model = view.getNavigationStack();
    const tags: string[] = [];
    const count = model.getNItems();
    for (let index = 0; index < count; index++) {
        const item = model.getItem(index);
        if (item instanceof Adw.NavigationPage) {
            const tag = item.getTag();
            if (tag !== null) tags.push(tag);
        }
    }
    return tags;
};

export const ListScreen = (): ReactNode => <GtkLabel>List Content</GtkLabel>;

export const TaskScreen = (): ReactNode => {
    const route = useRoute();
    const { id } = route.params as TasksParams["Task"];
    return <GtkLabel>{`Task ${id}`}</GtkLabel>;
};

export const Stack = createStackNavigator<TasksParams>();

type RenderStackOptions = {
    onStateChange?: (state: NavigationState | undefined) => void;
    initialState?: InitialState;
    taskComponent?: () => ReactNode;
    taskOptions?: StackScreenOptions;
};

export type StackHarness = {
    viewRef: RefObject<Adw.NavigationView | null>;
    navigationRef: NavigationContainerRefWithCurrent<TasksParams>;
    view: () => Adw.NavigationView;
};

export const renderStack = async (options: RenderStackOptions = {}): Promise<StackHarness> => {
    const viewRef = createRef<Adw.NavigationView>();
    const navigationRef = createNavigationContainerRef<TasksParams>();

    await render(
        <NavigationContainer
            ref={navigationRef}
            {...(options.initialState !== undefined && { initialState: options.initialState })}
            {...(options.onStateChange !== undefined && { onStateChange: options.onStateChange })}
        >
            <Stack.Navigator ref={viewRef}>
                <Stack.Screen name="List" component={ListScreen} />
                <Stack.Screen
                    name="Task"
                    component={options.taskComponent ?? TaskScreen}
                    {...(options.taskOptions !== undefined && { options: options.taskOptions })}
                />
            </Stack.Navigator>
        </NavigationContainer>,
    );

    return { viewRef, navigationRef, view: () => requireView(viewRef) };
};

export const openTask = async (harness: StackHarness, id: string, expectedText: string): Promise<void> => {
    await act(() => {
        harness.navigationRef.navigate("Task", { id });
    });
    await screen.findByText(expectedText);
};
