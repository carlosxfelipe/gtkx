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

const statusConfig = {
    active: { icon: "\u25cf", text: "Active" },
    away: { icon: "\u25cf", text: "Away" },
    offline: { icon: "\u25cb", text: "Offline" },
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
                    <ColumnView.Column
                        title="Name"
                        expand
                        renderCell={(person: Person | null) => (
                            <Label.Root
                                label={person?.name ?? ""}
                                halign={Gtk.Align.START}
                                marginStart={8}
                                marginEnd={8}
                                marginTop={4}
                                marginBottom={4}
                            />
                        )}
                    />
                    <ColumnView.Column
                        title="Email"
                        expand
                        renderCell={(person: Person | null) => (
                            <Label.Root
                                label={person?.email ?? ""}
                                cssClasses={["dim-label"]}
                                halign={Gtk.Align.START}
                                marginStart={8}
                                marginEnd={8}
                                marginTop={4}
                                marginBottom={4}
                            />
                        )}
                    />
                    <ColumnView.Column
                        title="Department"
                        fixedWidth={120}
                        renderCell={(person: Person | null) => (
                            <Label.Root
                                label={person?.department ?? ""}
                                halign={Gtk.Align.START}
                                marginStart={8}
                                marginEnd={8}
                                marginTop={4}
                                marginBottom={4}
                            />
                        )}
                    />
                    <ColumnView.Column
                        title="Status"
                        fixedWidth={100}
                        renderCell={(person: Person | null) => {
                            const config = person ? statusConfig[person.status] : null;
                            return (
                                <Label.Root
                                    label={config ? `${config.icon} ${config.text}` : ""}
                                    cssClasses={person?.status === "offline" ? ["dim-label"] : []}
                                    halign={Gtk.Align.START}
                                    marginStart={8}
                                    marginEnd={8}
                                    marginTop={4}
                                    marginBottom={4}
                                />
                            );
                        }}
                    />
                    {items.map((person) => (
                        <ColumnView.Item key={person.id} item={person} />
                    ))}
                </ColumnView.Root>
            </ScrolledWindow>
        </Box>
    );
};
