import type * as Adw from "@gtkx/gi/adw";
import * as Gdk from "@gtkx/gi/gdk";
import * as Gio from "@gtkx/gi/gio";
import * as Gtk from "@gtkx/gi/gtk";

export type StackBackOutcome = "empty" | "blocked" | "popped" | "none";

export type StackBackPort = {
    dispatch: () => StackBackOutcome;
    popOnEscape: boolean;
};

const handledOutcome = (outcome: StackBackOutcome): boolean => outcome === "blocked" || outcome === "popped";

const isRtl = (widget: Gtk.Widget): boolean => widget.getDirection() === Gtk.TextDirection.RTL;

const popDirection = (widget: Gtk.Widget, isPop: boolean): boolean => (isRtl(widget) ? !isPop : isPop);

const directional = (view: Adw.NavigationView, port: () => StackBackPort, isPop: boolean): StackBackOutcome =>
    popDirection(view, isPop) ? port().dispatch() : "none";

const shortcutFor = (trigger: Gtk.ShortcutTrigger, run: Gtk.ShortcutFunc): Gtk.Shortcut =>
    Gtk.Shortcut.new(trigger, Gtk.CallbackAction.new(run));

const keyval = (value: number, modifiers: Gdk.ModifierType): Gtk.ShortcutTrigger =>
    Gtk.KeyvalTrigger.new(value, modifiers);

const eitherKeyval = (value: number, alternate: number, modifiers: Gdk.ModifierType): Gtk.ShortcutTrigger =>
    Gtk.AlternativeTrigger.new(keyval(value, Gdk.ModifierType.NO_MODIFIER_MASK), keyval(alternate, modifiers));

const escapeOutcome = (port: () => StackBackPort): StackBackOutcome => {
    const current = port();
    return current.popOnEscape ? current.dispatch() : "none";
};

const backShortcuts = (view: Adw.NavigationView, port: () => StackBackPort): Gtk.Shortcut[] => [
    shortcutFor(keyval(Gdk.KEY_Escape, Gdk.ModifierType.NO_MODIFIER_MASK), () => handledOutcome(escapeOutcome(port))),
    shortcutFor(eitherKeyval(Gdk.KEY_Back, Gdk.KEY_Left, Gdk.ModifierType.ALT_MASK), () =>
        handledOutcome(directional(view, port, true)),
    ),
    shortcutFor(eitherKeyval(Gdk.KEY_Forward, Gdk.KEY_Right, Gdk.ModifierType.ALT_MASK), () =>
        handledOutcome(directional(view, port, false)),
    ),
];

export const installBackShortcuts = (view: Adw.NavigationView, port: () => StackBackPort): (() => void) => {
    const controller = Gtk.ShortcutController.new();
    controller.setPropagationPhase(Gtk.PropagationPhase.BUBBLE);
    for (const shortcut of backShortcuts(view, port)) controller.addShortcut(shortcut);
    view.addController(controller);
    return () => view.removeController(controller);
};

const BUTTON_DIRECTIONS: Record<number, boolean> = { 8: true, 9: false };

const gesturePressed = (gesture: Gtk.GestureClick, view: Adw.NavigationView, port: () => StackBackPort): void => {
    const isPop = BUTTON_DIRECTIONS[gesture.getCurrentButton()];
    if (isPop === undefined) {
        gesture.setState(Gtk.EventSequenceState.DENIED);
        gesture.reset();
        return;
    }
    const claimed = handledOutcome(directional(view, port, isPop));
    gesture.setState(claimed ? Gtk.EventSequenceState.CLAIMED : Gtk.EventSequenceState.DENIED);
};

const clickGestures = (view: Adw.NavigationView): Gtk.GestureClick[] => {
    const controllers = view.observeControllers();
    const found: Gtk.GestureClick[] = [];
    for (let index = 0; index < controllers.getNItems(); index++) {
        const controller = controllers.getItem(index);
        if (controller instanceof Gtk.GestureClick) found.push(controller);
    }
    return found;
};

export const installBackGesture = (view: Adw.NavigationView, port: () => StackBackPort): (() => void) => {
    for (const existing of clickGestures(view)) view.removeController(existing);

    const gesture = Gtk.GestureClick.new();
    gesture.setPropagationPhase(Gtk.PropagationPhase.BUBBLE);
    gesture.setButton(0);
    gesture.on("pressed", () => gesturePressed(gesture, view, port));
    view.addController(gesture);
    return () => view.removeController(gesture);
};

const forwardToParent = (view: Adw.NavigationView): void => {
    const parent = view.getParent();
    if (parent) parent.activateAction("navigation.pop", null);
};

export const runHeaderBackAction = (view: Adw.NavigationView, port: () => StackBackPort): void => {
    if (handledOutcome(port().dispatch())) return;
    forwardToParent(view);
};

export const installPageBackAction = (page: Gtk.Widget, activate: () => void): (() => void) => {
    const group = new Gio.SimpleActionGroup();
    const action = Gio.SimpleAction.new("pop", null);
    action.on("activate", activate);
    group.addAction(action);
    page.insertActionGroup("navigation", group);
    return () => page.insertActionGroup("navigation", null);
};
