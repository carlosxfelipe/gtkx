import { wrapPtr } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import { Box, ColumnView, Label, ScrolledWindow } from "@gtkx/react";
import { useState } from "react";

interface Person {
    id: number;
    name: string;
    email: string;
    department: string;
    status: "active" | "away" | "offline";
}

const people: Person[] = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", department: "Engineering", status: "active" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", department: "Design", status: "away" },
    { id: 3, name: "Carol Williams", email: "carol@example.com", department: "Marketing", status: "active" },
    { id: 4, name: "David Brown", email: "david@example.com", department: "Engineering", status: "offline" },
    { id: 5, name: "Eva Martinez", email: "eva@example.com", department: "Sales", status: "active" },
    { id: 6, name: "Frank Lee", email: "frank@example.com", department: "Engineering", status: "active" },
    { id: 7, name: "Grace Chen", email: "grace@example.com", department: "Design", status: "away" },
    { id: 8, name: "Henry Wilson", email: "henry@example.com", department: "Marketing", status: "active" },
];

const setupLabel = (): Gtk.Label => {
    const label = new Gtk.Label();
    label.setHalign(Gtk.Align.START);
    label.setMarginStart(8);
    label.setMarginEnd(8);
    label.setMarginTop(4);
    label.setMarginBottom(4);
    return label;
};

const bindName = (widget: Gtk.Widget, person: Person): void => {
    const label = wrapPtr(widget.ptr, Gtk.Label);
    label.setLabel(person.name);
};

const bindEmail = (widget: Gtk.Widget, person: Person): void => {
    const label = wrapPtr(widget.ptr, Gtk.Label);
    label.setLabel(person.email);
    label.setCssClasses(["dim-label"]);
};

const bindDepartment = (widget: Gtk.Widget, person: Person): void => {
    const label = wrapPtr(widget.ptr, Gtk.Label);
    label.setLabel(person.department);
};

const bindStatus = (widget: Gtk.Widget, person: Person): void => {
    const label = wrapPtr(widget.ptr, Gtk.Label);
    const statusConfig = {
        active: { icon: "\u25cf", text: "Active" },
        away: { icon: "\u25cf", text: "Away" },
        offline: { icon: "\u25cb", text: "Offline" },
    };

    const config = statusConfig[person.status];
    label.setLabel(`${config.icon} ${config.text}`);

    if (person.status === "offline") {
        label.setCssClasses(["dim-label"]);
    } else {
        label.setCssClasses([]);
    }
};

export const ColumnViewDemo = () => {
    const [items] = useState(people);

    return (
        <Box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
            marginStart={16}
            marginEnd={16}
            marginTop={16}
            marginBottom={16}
        >
            <Label.Root label="ColumnView - Team Directory" cssClasses={["title-2"]} halign={Gtk.Align.START} />
            <Label.Root
                label="A multi-column table view. Perfect for data tables and directories."
                cssClasses={["dim-label"]}
                halign={Gtk.Align.START}
                wrap
            />
            <ScrolledWindow vexpand>
                <ColumnView.Root>
                    <ColumnView.Column title="Name" setup={setupLabel} bind={bindName} expand />
                    <ColumnView.Column title="Email" setup={setupLabel} bind={bindEmail} expand />
                    <ColumnView.Column title="Department" setup={setupLabel} bind={bindDepartment} fixedWidth={120} />
                    <ColumnView.Column title="Status" setup={setupLabel} bind={bindStatus} fixedWidth={100} />
                    {items.map((person) => (
                        <ColumnView.Item key={person.id} item={person} />
                    ))}
                </ColumnView.Root>
            </ScrolledWindow>
        </Box>
    );
};
