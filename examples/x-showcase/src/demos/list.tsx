import * as Gtk from "@gtkx/ffi/gtk";
import {
    AdwPreferencesGroup,
    GtkBox,
    GtkColumnView,
    GtkDropDown,
    GtkFrame,
    GtkLabel,
    GtkScrolledWindow,
    x,
} from "@gtkx/react";

type Person = {
    name: string;
    email: string;
    role: string;
};

type FileItem = {
    name: string;
    isFolder: boolean;
};

const people: Person[] = [
    { name: "Alice Johnson", email: "alice@example.com", role: "Developer" },
    { name: "Bob Smith", email: "bob@example.com", role: "Designer" },
    { name: "Charlie Brown", email: "charlie@example.com", role: "Manager" },
    { name: "Diana Ross", email: "diana@example.com", role: "Developer" },
    { name: "Eve Wilson", email: "eve@example.com", role: "QA Engineer" },
];

const files: FileItem[] = [
    { name: "Documents", isFolder: true },
    { name: "Pictures", isFolder: true },
    { name: "readme.txt", isFolder: false },
    { name: "report.pdf", isFolder: false },
    { name: "notes.md", isFolder: false },
];

export const ListDemo = () => {
    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginTop={24}
            marginBottom={24}
            marginStart={24}
            marginEnd={24}
        >
            <GtkLabel label="List Components" cssClasses={["title-1"]} halign={Gtk.Align.START} />

            <AdwPreferencesGroup
                title="x.SimpleListItem"
                description="String-based items for DropDown and simple lists"
            >
                <GtkFrame marginTop={12}>
                    <GtkBox
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={12}
                        marginTop={12}
                        marginBottom={12}
                        marginStart={12}
                        marginEnd={12}
                    >
                        <GtkLabel label="Select a fruit:" halign={Gtk.Align.START} />
                        <GtkDropDown>
                            <x.SimpleListItem id="apple" value="Apple" />
                            <x.SimpleListItem id="banana" value="Banana" />
                            <x.SimpleListItem id="cherry" value="Cherry" />
                            <x.SimpleListItem id="date" value="Date" />
                            <x.SimpleListItem id="elderberry" value="Elderberry" />
                        </GtkDropDown>
                    </GtkBox>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.ListView" description="Virtualized list with custom item rendering">
                <GtkFrame marginTop={12}>
                    <GtkScrolledWindow heightRequest={200} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <x.ListView<FileItem>
                            estimatedItemHeight={48}
                            renderItem={(item) => (
                                <GtkBox
                                    orientation={Gtk.Orientation.HORIZONTAL}
                                    spacing={12}
                                    marginTop={8}
                                    marginBottom={8}
                                    marginStart={8}
                                    marginEnd={8}
                                >
                                    <GtkLabel
                                        label={item?.isFolder ? "folder-symbolic" : "text-x-generic-symbolic"}
                                        useMarkup={false}
                                    />
                                    <GtkLabel label={item?.name ?? ""} hexpand halign={Gtk.Align.START} />
                                </GtkBox>
                            )}
                        >
                            {files.map((file) => (
                                <x.ListItem key={file.name} id={file.name} value={file} />
                            ))}
                        </x.ListView>
                    </GtkScrolledWindow>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.GridView" description="Virtualized grid with custom item rendering">
                <GtkFrame marginTop={12}>
                    <GtkScrolledWindow heightRequest={200} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <x.GridView<FileItem>
                            estimatedItemHeight={80}
                            renderItem={(item) => (
                                <GtkBox
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={6}
                                    marginTop={12}
                                    marginBottom={12}
                                    marginStart={12}
                                    marginEnd={12}
                                    halign={Gtk.Align.CENTER}
                                >
                                    <GtkLabel label={item?.isFolder ? "folder" : "file"} cssClasses={["title-3"]} />
                                    <GtkLabel label={item?.name ?? ""} ellipsize={3} maxWidthChars={12} />
                                </GtkBox>
                            )}
                        >
                            {files.map((file) => (
                                <x.ListItem key={file.name} id={file.name} value={file} />
                            ))}
                        </x.GridView>
                    </GtkScrolledWindow>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup
                title="x.TreeListView / x.TreeListItem"
                description="Hierarchical tree with expand/collapse"
            >
                <GtkFrame marginTop={12}>
                    <GtkScrolledWindow heightRequest={250} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <x.TreeListView<{ name: string }>
                            estimatedItemHeight={32}
                            renderItem={(item) => (
                                <GtkLabel
                                    label={item?.name ?? ""}
                                    halign={Gtk.Align.START}
                                    marginTop={4}
                                    marginBottom={4}
                                />
                            )}
                        >
                            <x.TreeListItem id="src" value={{ name: "src" }}>
                                <x.TreeListItem id="components" value={{ name: "components" }}>
                                    <x.TreeListItem id="button" value={{ name: "Button.tsx" }} />
                                    <x.TreeListItem id="input" value={{ name: "Input.tsx" }} />
                                    <x.TreeListItem id="modal" value={{ name: "Modal.tsx" }} />
                                </x.TreeListItem>
                                <x.TreeListItem id="utils" value={{ name: "utils" }}>
                                    <x.TreeListItem id="helpers" value={{ name: "helpers.ts" }} />
                                    <x.TreeListItem id="constants" value={{ name: "constants.ts" }} />
                                </x.TreeListItem>
                                <x.TreeListItem id="app" value={{ name: "App.tsx" }} />
                                <x.TreeListItem id="index" value={{ name: "index.tsx" }} />
                            </x.TreeListItem>
                            <x.TreeListItem id="public" value={{ name: "public" }}>
                                <x.TreeListItem id="favicon" value={{ name: "favicon.ico" }} />
                                <x.TreeListItem id="index-html" value={{ name: "index.html" }} />
                            </x.TreeListItem>
                            <x.TreeListItem id="package" value={{ name: "package.json" }} />
                            <x.TreeListItem id="readme" value={{ name: "README.md" }} />
                        </x.TreeListView>
                    </GtkScrolledWindow>
                </GtkFrame>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.ColumnViewColumn" description="Table columns with custom cell rendering">
                <GtkFrame marginTop={12}>
                    <GtkScrolledWindow heightRequest={200} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                        <GtkColumnView estimatedRowHeight={48}>
                            <x.ColumnViewColumn<Person>
                                id="name"
                                title="Name"
                                expand
                                renderCell={(item) => (
                                    <GtkLabel
                                        label={item?.name ?? ""}
                                        halign={Gtk.Align.START}
                                        marginTop={8}
                                        marginBottom={8}
                                        marginStart={8}
                                        marginEnd={8}
                                    />
                                )}
                            />
                            <x.ColumnViewColumn<Person>
                                id="email"
                                title="Email"
                                expand
                                renderCell={(item) => (
                                    <GtkLabel
                                        label={item?.email ?? ""}
                                        halign={Gtk.Align.START}
                                        marginTop={8}
                                        marginBottom={8}
                                        marginStart={8}
                                        marginEnd={8}
                                    />
                                )}
                            />
                            <x.ColumnViewColumn<Person>
                                id="role"
                                title="Role"
                                fixedWidth={120}
                                renderCell={(item) => (
                                    <GtkLabel
                                        label={item?.role ?? ""}
                                        halign={Gtk.Align.START}
                                        marginTop={8}
                                        marginBottom={8}
                                        marginStart={8}
                                        marginEnd={8}
                                    />
                                )}
                            />
                            {people.map((person) => (
                                <x.ListItem key={person.email} id={person.email} value={person} />
                            ))}
                        </GtkColumnView>
                    </GtkScrolledWindow>
                </GtkFrame>
            </AdwPreferencesGroup>
        </GtkBox>
    );
};
