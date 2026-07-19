import type {
    InitialState,
    NavigationState,
    ParamListBase,
    PartialState,
    PathConfigMap,
    useStateForPath,
} from "@react-navigation/core";

export type LinkingConfig<ParamList extends ParamListBase> = {
    path?: string;
    initialRouteName?: keyof ParamList & string;
    screens: PathConfigMap<ParamList>;
};

export type LinkingPathState = NonNullable<ReturnType<typeof useStateForPath>>;

export type LinkingOptions<ParamList extends ParamListBase = ParamListBase> = {
    enabled?: boolean;
    prefixes?: string[];
    config?: LinkingConfig<ParamList>;
    getInitialURL?: () => string | undefined | Promise<string | undefined>;
    subscribe?: (listener: (url: string) => void) => (() => void) | undefined;
    getStateFromPath?: (path: string, options?: LinkingConfig<ParamList>) => PartialState<NavigationState> | undefined;
    getPathFromState?: (state: LinkingPathState, options?: LinkingConfig<ParamList>) => string;
};

export type LinkingResult = { isReady: boolean; initialState: InitialState | undefined };
