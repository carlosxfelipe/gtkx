import * as Gtk from "@gtkx/ffi/gtk";
import { ApplicationWindow, Box, Button, css, injectGlobal, Label, quit, render } from "@gtkx/gtkx";

injectGlobal`
    window {
        background: #3584e4;
    }
`;

const buttonStyle = css`
    padding: 16px 32px;
    border-radius: 12px;
    font-weight: bold;
`;

const labelStyle = css`
    font-size: 24px;
    margin-bottom: 16px;
`;

render(
    <ApplicationWindow title="GTK + Emotion CSS Demo" defaultWidth={400} defaultHeight={300} onCloseRequest={quit}>
        <Box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} spacing={12}>
            <Label.Root cssClasses={[labelStyle]} label="Hello, Styled GTK!" />
            <Button
                cssClasses={[buttonStyle]}
                label="Styled Button"
                onClicked={() => {
                    console.log("Button clicked!");
                }}
            />
            <Button
                cssClasses={["suggested-action"]}
                label="System Style"
                onClicked={() => {
                    console.log("System styled button clicked!");
                }}
            />
        </Box>
    </ApplicationWindow>,
    "com.gtkx.demo",
);
