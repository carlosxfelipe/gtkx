export type { NavigationContainerRef, NavigationContainerRefWithCurrent } from "@react-navigation/core";
export {
    CommonActions,
    createNavigationContainerRef,
    type EventArg,
    type EventListenerCallback,
    type EventMapBase,
    type EventMapCore,
    type NavigationAction,
    NavigationIndependentTree,
    type NavigationProp,
    type NavigationState,
    type NavigatorScreenParams,
    type ParamListBase,
    type PartialState,
    type Route,
    type RouteProp,
    StackActions,
    type StackNavigationState,
    TabActions,
    type TabNavigationState,
    useFocusEffect,
    useIsFocused,
    useNavigation,
    useNavigationContainerRef,
    useNavigationState,
    usePreventRemove,
    useRoute,
} from "@react-navigation/core";
export { NavigationContainer, type NavigationContainerProps } from "./navigation-container.js";
export { createSplitViewNavigator } from "./split-view/create-split-view-navigator.js";
export type {
    SplitViewNavigationEventMap,
    SplitViewNavigationProp,
    SplitViewNavigatorComponents,
    SplitViewNavigatorProps,
    SplitViewScreenOptions,
    SplitViewScreenProps,
} from "./split-view/types.js";
export { createStackNavigator } from "./stack/create-stack-navigator.js";
export type {
    StackNavigationEventMap,
    StackNavigationProp,
    StackNavigatorComponents,
    StackNavigatorProps,
    StackScreenOptions,
    StackScreenProps,
} from "./stack/types.js";
