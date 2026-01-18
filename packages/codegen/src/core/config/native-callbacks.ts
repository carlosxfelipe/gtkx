export const APPLICATION_PARAM_NAME = "application";

export type TrampolineName =
    | "animationTargetFunc"
    | "asyncReady"
    | "closure"
    | "destroy"
    | "drawFunc"
    | "pathIntersectionFunc"
    | "shortcutFunc"
    | "tickCallback"
    | "treeListModelCreateFunc";

const CALLBACK_TRAMPOLINES: Record<string, TrampolineName> = {
    "Adw.AnimationTargetFunc": "animationTargetFunc",
    "Gio.AsyncReadyCallback": "asyncReady",
    "GLib.DestroyNotify": "destroy",
    "Gsk.PathIntersectionFunc": "pathIntersectionFunc",
    "Gtk.DrawingAreaDrawFunc": "drawFunc",
    "Gtk.ShortcutFunc": "shortcutFunc",
    "Gtk.TickCallback": "tickCallback",
    "Gtk.TreeListModelCreateModelFunc": "treeListModelCreateFunc",
};

export const getTrampolineName = (qualifiedName: string): TrampolineName | null => {
    return CALLBACK_TRAMPOLINES[qualifiedName] ?? null;
};

export const isSupportedCallback = (typeName: string): boolean => {
    return typeName in CALLBACK_TRAMPOLINES;
};
