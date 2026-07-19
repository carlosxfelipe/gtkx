import { GtkLabel } from "@gtkx/jsx/gtk";
import { render, screen } from "@gtkx/testing";
import type { StaticScreenProps } from "@react-navigation/core";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createStackNavigator, createTabNavigator } from "../src/index.js";
import { createStaticNavigation } from "../src/static/create-static-navigation.js";
import type { StaticParamList } from "../src/static/param-list.js";
import { ListScreen, TaskScreen } from "./fixtures.js";

const SettingsScreen = (): ReactNode => <GtkLabel>Settings Content</GtkLabel>;

const DetailScreen = ({ route }: StaticScreenProps<{ id: string }>): ReactNode => (
    <GtkLabel>{`Detail ${route.params.id}`}</GtkLabel>
);

const RootStack = createStackNavigator({
    initialRouteName: "List",
    screens: {
        List: ListScreen,
        Task: { screen: TaskScreen, linking: "tasks/:id" },
        Detail: { screen: DetailScreen, linking: "detail/:id" },
    },
});

type RootParamList = StaticParamList<typeof RootStack>;

const detailParams = (params: RootParamList["Detail"]): { id: string } => params;

describe("static navigation", () => {
    it("renders the initial screen of a static stack config", async () => {
        const Navigation = createStaticNavigation(RootStack);

        await render(<Navigation />);

        await screen.findByText("List Content");
    });

    it("infers the param list from the static config", () => {
        expect(detailParams({ id: "7" })).toEqual({ id: "7" });
    });

    it("renders screens declared in groups", async () => {
        const Grouped = createStackNavigator({
            groups: {
                Main: { screens: { Home: ListScreen } },
                Extra: { screens: { Settings: SettingsScreen } },
            },
        });

        const Navigation = createStaticNavigation(Grouped);

        await render(<Navigation />);

        await screen.findByText("List Content");
    });

    it("skips screens whose 'if' returns false", async () => {
        const Conditional = createStackNavigator({
            screens: {
                Hidden: { screen: SettingsScreen, if: () => false },
                Shown: { screen: ListScreen },
            },
        });

        const Navigation = createStaticNavigation(Conditional);

        await render(<Navigation />);

        await screen.findByText("List Content");
    });

    it("mounts on a deep-linked route using the generated path config", async () => {
        const Navigation = createStaticNavigation(RootStack);

        await render(<Navigation linking={{ prefixes: ["myapp://"], getInitialURL: () => "myapp://detail/9" }} />);

        await screen.findByText("Detail 9");
    });

    it("generates paths automatically when linking is enabled as 'auto'", async () => {
        const Auto = createStackNavigator({
            initialRouteName: "List",
            screens: { List: ListScreen, Settings: SettingsScreen },
        });

        const Navigation = createStaticNavigation(Auto);

        await render(
            <Navigation
                linking={{ prefixes: ["myapp://"], enabled: "auto", getInitialURL: () => "myapp://settings" }}
            />,
        );

        await screen.findByText("Settings Content");
    });

    it("wraps the navigator through 'with'", async () => {
        const Wrapped = createTabNavigator({
            screens: { Home: ListScreen, Settings: SettingsScreen },
        }).with(({ Navigator }) => <Navigator />);

        const Navigation = createStaticNavigation(Wrapped);

        await render(<Navigation />);

        await screen.findByText("List Content");
    });
});
