import type * as Adw from "@gtkx/gi/adw";
import type { AdwNavigationViewProps } from "@gtkx/jsx/adw";
import type { EventMapCore, ParamListBase } from "@react-navigation/core";
import type { StackActionHelpers, StackNavigationState } from "@react-navigation/routers";
import type { Ref } from "react";
import type {
    NavigatorComponents,
    NavigatorNavigationProp,
    NavigatorOptions,
    NavigatorScreenProps,
} from "../navigator-types.js";

export type StackPresentation = "page" | "modal" | "bottomSheet";

export type StackScreenOptions = {
    title?: string;
    tag?: string;
    canPop?: boolean;
    freezeOnBlur?: boolean;
    presentation?: StackPresentation;
    contentWidth?: number;
    contentHeight?: number;
    followsContentSize?: boolean;
};

export type StackTransitionEventData = { closing: boolean };

export type StackNavigationEventMap = EventMapCore<StackNavigationState<ParamListBase>> & {
    transitionStart: { data: StackTransitionEventData };
    transitionEnd: { data: StackTransitionEventData };
};

export type StackNavigationProp<
    ParamList extends ParamListBase = ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigatorNavigationProp<
    ParamList,
    RouteName,
    NavigatorID,
    StackNavigationState<ParamList>,
    StackScreenOptions,
    StackNavigationEventMap,
    StackActionHelpers<ParamList>
>;

export type StackScreenProps<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = keyof ParamList,
    NavigatorID extends string | undefined = undefined,
> = NavigatorScreenProps<StackNavigationProp<ParamList, RouteName, NavigatorID>, ParamList, RouteName>;

export type StackNavigatorProps<ParamList extends ParamListBase = ParamListBase> = Omit<
    AdwNavigationViewProps,
    | "children"
    | "ref"
    | "onPopped"
    | "onPushed"
    | "onReplaced"
    | "onNotifyNavigationStack"
    | "onNotifyVisiblePage"
    | "onNotifyVisiblePageTag"
> &
    NavigatorOptions<
        ParamList,
        StackNavigationState<ParamList>,
        StackScreenOptions,
        StackNavigationEventMap,
        StackActionHelpers<ParamList>
    > & {
        ref?: Ref<Adw.NavigationView | null>;
        onPushed?: () => void;
        onReplaced?: () => void;
    };

export type StackNavigatorComponents<ParamList extends ParamListBase> = NavigatorComponents<
    ParamList,
    StackNavigatorProps<ParamList>,
    StackNavigationState<ParamList>,
    StackScreenOptions,
    StackNavigationEventMap,
    StackActionHelpers<ParamList>
>;
