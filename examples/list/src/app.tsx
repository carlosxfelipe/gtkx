import { ApplicationWindow, Notebook, quit } from "@gtkx/react";
import { ColumnViewDemo } from "./column-view-demo.js";
import { GridViewDemo } from "./grid-view-demo.js";
import { ListViewDemo } from "./list-view-demo.js";

export const App = () => {
    return (
        <ApplicationWindow title="List Widgets Showcase" defaultWidth={800} defaultHeight={600} onCloseRequest={quit}>
            <Notebook.Root>
                <Notebook.Page label="ListView">
                    <ListViewDemo />
                </Notebook.Page>
                <Notebook.Page label="GridView">
                    <GridViewDemo />
                </Notebook.Page>
                <Notebook.Page label="ColumnView">
                    <ColumnViewDemo />
                </Notebook.Page>
            </Notebook.Root>
        </ApplicationWindow>
    );
};
