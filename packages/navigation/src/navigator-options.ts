type NavigatorBuilderInput<Name, Layout, Listeners, Options, ScreenLayout> = {
    initialRouteName: Name | undefined;
    layout: Layout | undefined;
    screenListeners: Listeners | undefined;
    screenOptions: Options | undefined;
    screenLayout: ScreenLayout | undefined;
};

type NavigatorBuilderOutput<Name, Layout, Listeners, Options, ScreenLayout> = {
    initialRouteName?: Name;
    layout?: Layout;
    screenListeners?: Listeners;
    screenOptions?: Options;
    screenLayout?: ScreenLayout;
};

export const definedNavigatorOptions = <Name, Layout, Listeners, Options, ScreenLayout>(
    input: NavigatorBuilderInput<Name, Layout, Listeners, Options, ScreenLayout>,
): NavigatorBuilderOutput<Name, Layout, Listeners, Options, ScreenLayout> => ({
    ...(input.initialRouteName !== undefined && { initialRouteName: input.initialRouteName }),
    ...(input.layout !== undefined && { layout: input.layout }),
    ...(input.screenListeners !== undefined && { screenListeners: input.screenListeners }),
    ...(input.screenOptions !== undefined && { screenOptions: input.screenOptions }),
    ...(input.screenLayout !== undefined && { screenLayout: input.screenLayout }),
});
