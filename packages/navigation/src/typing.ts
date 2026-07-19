export interface RootParamList {}

export interface Theme {}

type GtkxRootParamList = RootParamList;

type GtkxTheme = Theme;

declare global {
    namespace ReactNavigation {
        interface RootParamList extends GtkxRootParamList {}

        interface Theme extends GtkxTheme {}
    }
}
