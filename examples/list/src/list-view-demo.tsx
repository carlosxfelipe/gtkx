import * as Gtk from "@gtkx/ffi/gtk";
import { Box, Label, ListView, ScrolledWindow } from "@gtkx/react";
import { useState } from "react";

interface Task {
    id: number;
    title: string;
    completed: boolean;
}

const initialTasks: Task[] = [
    { id: 1, title: "Learn GTK4", completed: true },
    { id: 2, title: "Build a React app", completed: true },
    { id: 3, title: "Try ListView", completed: false },
    { id: 4, title: "Explore GridView", completed: false },
    { id: 5, title: "Master ColumnView", completed: false },
    { id: 6, title: "Write tests", completed: false },
    { id: 7, title: "Deploy to production", completed: false },
    { id: 8, title: "Celebrate success", completed: false },
];

export const ListViewDemo = () => {
    const [tasks] = useState(initialTasks);

    return (
        <Box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
            marginStart={16}
            marginEnd={16}
            marginTop={16}
            marginBottom={16}
        >
            <Label.Root label="ListView - Task List" cssClasses={["title-2"]} halign={Gtk.Align.START} />
            <Label.Root
                label="A simple vertical list displaying tasks with checkmarks."
                cssClasses={["dim-label"]}
                halign={Gtk.Align.START}
                wrap
            />
            <ScrolledWindow vexpand hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                <ListView.Root
                    renderItem={(task: Task | null) => (
                        <Label.Root
                            label={task ? (task.completed ? "[x] " : "[ ] ") + task.title : ""}
                            cssClasses={task?.completed ? ["dim-label"] : []}
                            halign={Gtk.Align.START}
                            marginStart={8}
                            marginEnd={8}
                            marginTop={4}
                            marginBottom={4}
                        />
                    )}
                >
                    {tasks.map((task) => (
                        <ListView.Item key={task.id} item={task} />
                    ))}
                </ListView.Root>
            </ScrolledWindow>
        </Box>
    );
};
