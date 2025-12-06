import * as Gtk from "@gtkx/ffi/gtk";
import { Box, GridView, Label, ScrolledWindow } from "@gtkx/react";
import { useState } from "react";

interface ColorItem {
    id: number;
    name: string;
    icon: string;
}

const colors: ColorItem[] = [
    { id: 1, name: "Red", icon: "\u{1F534}" },
    { id: 2, name: "Orange", icon: "\u{1F7E0}" },
    { id: 3, name: "Yellow", icon: "\u{1F7E1}" },
    { id: 4, name: "Green", icon: "\u{1F7E2}" },
    { id: 5, name: "Blue", icon: "\u{1F535}" },
    { id: 6, name: "Purple", icon: "\u{1F7E3}" },
    { id: 7, name: "Brown", icon: "\u{1F7E4}" },
    { id: 8, name: "Black", icon: "\u26AB" },
    { id: 9, name: "White", icon: "\u26AA" },
    { id: 10, name: "Heart", icon: "\u2764\uFE0F" },
    { id: 11, name: "Star", icon: "\u2B50" },
    { id: 12, name: "Sun", icon: "\u2600\uFE0F" },
];

export const GridViewDemo = () => {
    const [items] = useState(colors);

    return (
        <Box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
            marginStart={16}
            marginEnd={16}
            marginTop={16}
            marginBottom={16}
        >
            <Label.Root label="GridView - Icon Grid" cssClasses={["title-2"]} halign={Gtk.Align.START} />
            <Label.Root
                label="A grid layout displaying icons. Great for galleries, icon views, and tile-based UIs."
                cssClasses={["dim-label"]}
                halign={Gtk.Align.START}
                wrap
            />
            <ScrolledWindow vexpand>
                <GridView.Root
                    renderItem={(color: ColorItem | null, ref) => (
                        <Label.Root
                            ref={ref}
                            label={color ? `${color.icon}\n${color.name}` : ""}
                            cssClasses={["title-1"]}
                            marginStart={8}
                            marginEnd={8}
                            marginTop={8}
                            marginBottom={8}
                        />
                    )}
                >
                    {items.map((color) => (
                        <GridView.Item key={color.id} item={color} />
                    ))}
                </GridView.Root>
            </ScrolledWindow>
        </Box>
    );
};
