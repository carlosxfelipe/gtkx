import * as Gtk from "@gtkx/gi/gtk";
import { GtkShortcut, GtkShortcutController } from "@gtkx/jsx/gtk";
import { useStore } from "../store/index.js";
import { useRequestDeleteTask } from "./dialogs.js";

const shortcut = (accelerator: string, run: () => void, enabled: boolean) => (
    <GtkShortcut
        trigger={enabled ? Gtk.ShortcutTrigger.parseString(accelerator) : Gtk.NeverTrigger.get()}
        action={Gtk.CallbackAction.new(() => {
            run();
            return true;
        })}
    />
);

export const AppShortcuts = () => {
    const requestDeleteTask = useRequestDeleteTask();
    const selectedTaskId = useStore((state) => state.selectedTaskId);
    const closeTask = useStore((state) => state.closeTask);

    const toggleSearch = (): void => {
        const { searchMode, setSearchMode } = useStore.getState();
        setSearchMode(!searchMode);
    };

    const deleteSelected = (): void => {
        const { tasks, selectedTaskId: id } = useStore.getState();
        const task = tasks.find((candidate) => candidate.id === id);
        if (task) requestDeleteTask(task);
    };

    return (
        <GtkShortcutController
            scope={Gtk.ShortcutScope.GLOBAL}
            shortcuts={
                <>
                    {shortcut("<Control>f", toggleSearch, true)}
                    {shortcut("Escape", closeTask, selectedTaskId !== null)}
                    {shortcut("Delete", deleteSelected, selectedTaskId !== null)}
                </>
            }
        />
    );
};
