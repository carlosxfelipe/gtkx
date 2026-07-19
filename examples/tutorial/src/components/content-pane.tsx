import { AdwHeaderBar, AdwToggle, AdwToggleGroup, AdwToolbarView, AdwWindowTitle } from "@gtkx/jsx/adw";
import { GtkButton, GtkToggleButton } from "@gtkx/jsx/gtk";
import { useStore } from "../store/index.js";
import { selectionKey } from "../store/selectors.js";
import { requestDeleteTask } from "./dialogs.js";
import { MainMenu } from "./main-menu.js";
import { TaskDetail } from "./task-detail.js";
import { TaskList } from "./task-list.js";

export const ContentPane = () => {
    const tasks = useStore((state) => state.tasks);
    const selection = useStore((state) => state.selection);
    const selectedTaskId = useStore((state) => state.selectedTaskId);
    const closeTask = useStore((state) => state.closeTask);
    const setImportant = useStore((state) => state.setImportant);
    const filter = useStore((state) => state.filter);
    const setFilter = useStore((state) => state.setFilter);
    const searchMode = useStore((state) => state.searchMode);
    const setSearchMode = useStore((state) => state.setSearchMode);
    const task = tasks.find((candidate) => candidate.id === selectedTaskId);

    if (task) {
        return (
            <AdwToolbarView
                topBar={
                    <AdwHeaderBar
                        titleWidget={<AdwWindowTitle title={task.title} />}
                        start={
                            <GtkButton
                                iconName="go-previous-symbolic"
                                tooltipText="Back (Escape)"
                                onClicked={closeTask}
                            />
                        }
                        end={
                            <>
                                <GtkToggleButton
                                    iconName={task.important ? "starred-symbolic" : "non-starred-symbolic"}
                                    active={task.important}
                                    tooltipText="Important"
                                    onToggled={(self) => setImportant(task.id, self.active)}
                                />
                                <GtkButton
                                    iconName="user-trash-symbolic"
                                    tooltipText="Delete (Delete)"
                                    onClicked={() => requestDeleteTask(task)}
                                />
                            </>
                        }
                    />
                }
            >
                <TaskDetail key={task.id} task={task} />
            </AdwToolbarView>
        );
    }

    return (
        <AdwToolbarView
            topBar={
                <AdwHeaderBar
                    titleWidget={
                        <AdwToggleGroup
                            activeName={filter}
                            cssClasses={["round"]}
                            onNotifyActiveName={(name) => {
                                if (name === "all" || name === "open" || name === "done") setFilter(name);
                            }}
                        >
                            <AdwToggle name="all" label="All" />
                            <AdwToggle name="open" label="Open" />
                            <AdwToggle name="done" label="Done" />
                        </AdwToggleGroup>
                    }
                    start={
                        <>
                            <GtkButton
                                iconName="list-add-symbolic"
                                tooltipText="New Task (Ctrl+N)"
                                actionName="win.new"
                            />
                            <GtkButton
                                iconName="system-search-symbolic"
                                tooltipText="Search (Ctrl+F)"
                                onClicked={() => setSearchMode(!searchMode)}
                            />
                        </>
                    }
                    end={<MainMenu />}
                />
            }
        >
            <TaskList key={selectionKey(selection)} />
        </AdwToolbarView>
    );
};
