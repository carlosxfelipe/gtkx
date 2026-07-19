import { GSimpleAction } from "@gtkx/jsx/gio";
import { useStore } from "../store/index.js";
import { addListId } from "../store/selectors.js";

export const WindowActions = () => {
    const showDialog = useStore((state) => state.showDialog);

    const newTask = (): void => {
        const { selection, lists, addTask, openTask } = useStore.getState();
        const id = addTask(addListId(selection, lists), "New Task");
        if (id) openTask(id);
    };

    return (
        <>
            <GSimpleAction name="new" onActivate={newTask} />
            <GSimpleAction name="preferences" onActivate={() => showDialog("preferences")} />
            <GSimpleAction name="shortcuts" onActivate={() => showDialog("shortcuts")} />
            <GSimpleAction name="about" onActivate={() => showDialog("about")} />
        </>
    );
};
