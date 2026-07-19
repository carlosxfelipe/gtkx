import * as GtkSource from "@gtkx/gi/gtksource";
import { GtkScrolledWindow } from "@gtkx/jsx/gtk";
import { GtkSourceBuffer, GtkSourceView } from "@gtkx/jsx/gtksource";
import type { Scene } from "../scenes/types.js";

export const SourceViewer = ({ scene }: { scene: Scene }) => {
    const handleRef = (view: GtkSource.View | null) => {
        if (view) view.getBuffer().setText(scene.sourceCode, -1);
    };

    return (
        <GtkScrolledWindow vexpand hexpand>
            <GtkSourceView
                name="source-view"
                ref={handleRef}
                editable={false}
                showLineNumbers
                tabWidth={4}
                leftMargin={20}
                rightMargin={20}
                topMargin={20}
                bottomMargin={20}
                monospace
                buffer={
                    <GtkSourceBuffer
                        language={GtkSource.LanguageManager.getDefault().getLanguage("typescript-jsx")}
                        styleScheme={GtkSource.StyleSchemeManager.getDefault().getScheme("Adwaita-dark")}
                    />
                }
            />
        </GtkScrolledWindow>
    );
};
