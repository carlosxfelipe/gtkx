import * as Gtk from "@gtkx/ffi/gtk";
import { Box, Button, CheckButton, Label, ListBoxRow } from "@gtkx/react";
import type { Todo } from "./types.js";

type TodoRowProps = {
    todo: Todo;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
};

export const TodoRow = ({ todo, onToggle, onDelete }: TodoRowProps) => {
    return (
        <ListBoxRow activatable={false} name={`todo-${todo.id}`}>
            <Box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={12}
                marginTop={8}
                marginBottom={8}
                marginStart={12}
                marginEnd={12}
            >
                <CheckButton.Root
                    active={todo.completed}
                    onToggled={() => onToggle(todo.id)}
                    name={`toggle-${todo.id}`}
                    valign={Gtk.Align.CENTER}
                />
                <Label
                    label={todo.text}
                    hexpand
                    xalign={0}
                    name={`text-${todo.id}`}
                    cssClasses={todo.completed ? ["dim-label"] : []}
                    valign={Gtk.Align.CENTER}
                />
                <Button
                    iconName="edit-delete-symbolic"
                    tooltipText="Delete task"
                    cssClasses={["flat", "circular"]}
                    onClicked={() => onDelete(todo.id)}
                    name={`delete-${todo.id}`}
                    valign={Gtk.Align.CENTER}
                />
            </Box>
        </ListBoxRow>
    );
};
