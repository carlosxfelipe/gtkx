import type { ComponentType } from "react";

type FlatType<T> = { [K in keyof T]: T[K] } & object;

type KeysOf<T> = T extends object ? keyof T : never;

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void
    ? I
    : never;

type UnknownToUndefined<T> = unknown extends T ? undefined : T;

export type StaticNavigationConfig = {
    config: {
        screens?: Record<string, unknown>;
        groups?: Record<string, { screens: Record<string, unknown> }>;
    };
};

type ParamsForComponent<T> = T extends ComponentType<{ route: { params: infer P } }> ? P : undefined;

export type NestedNavigatorParams<ParamList> = {
    [RouteName in keyof ParamList]: {
        screen: RouteName;
        params?: ParamList[RouteName];
        initial?: boolean;
        path?: string;
    };
}[keyof ParamList];

type ParamsForScreen<T> = T extends { screen: infer Screen }
    ? Screen extends StaticNavigationConfig
        ? NestedNavigatorParams<StaticParamList<Screen>> | undefined
        : UnknownToUndefined<ParamsForComponent<Screen>>
    : T extends StaticNavigationConfig
      ? NestedNavigatorParams<StaticParamList<T>> | undefined
      : UnknownToUndefined<ParamsForComponent<T>>;

type ParamListForScreens<Screens> = { [Key in KeysOf<Screens>]: ParamsForScreen<Screens[Key]> };

type ParamListForGroups<Groups> =
    Groups extends Record<string, { screens: Record<string, unknown> }>
        ? ParamListForScreens<UnionToIntersection<Groups[keyof Groups]["screens"]>>
        : object;

export type StaticParamList<T extends StaticNavigationConfig> = FlatType<
    ParamListForScreens<T["config"]["screens"]> & ParamListForGroups<T["config"]["groups"]>
>;
