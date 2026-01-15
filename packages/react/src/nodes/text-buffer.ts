import { batch } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { signalStore } from "./internal/signal-store.js";
import { TextAnchorNode } from "./text-anchor.js";
import { TextTagNode } from "./text-tag.js";
import { VirtualNode } from "./virtual.js";

/**
 * Props for the TextBuffer virtual element.
 *
 * Used to declaratively configure the text buffer for a GtkTextView.
 * For GtkSourceView with syntax highlighting, use {@link SourceBufferProps} instead.
 *
 * @example
 * ```tsx
 * <GtkTextView>
 *     <x.TextBuffer
 *         text="Hello, World!"
 *         enableUndo
 *         onTextChanged={(text) => console.log("Text:", text)}
 *     />
 * </GtkTextView>
 * ```
 */
export type TextBufferProps = {
    /** Text content */
    text?: string;
    /** Whether to enable undo/redo */
    enableUndo?: boolean;
    /** Callback when the text content changes */
    onTextChanged?: (text: string) => void;
    /** Callback when can-undo state changes */
    onCanUndoChanged?: (canUndo: boolean) => void;
    /** Callback when can-redo state changes */
    onCanRedoChanged?: (canRedo: boolean) => void;
    /** TextTag children for declarative text formatting */
    children?: ReactNode;
};

export class TextBufferNode extends VirtualNode<TextBufferProps> {
    public static override priority = 1;

    private textView?: Gtk.TextView;
    private buffer?: Gtk.TextBuffer;
    private tagChildren: TextTagNode[] = [];
    private anchorChildren: TextAnchorNode[] = [];

    public static override matches(type: string): boolean {
        return type === "TextBuffer";
    }

    public setTextView(textView: Gtk.TextView): void {
        this.textView = textView;
        this.setupBuffer();
    }

    private setupBuffer(): void {
        if (!this.textView) return;

        this.buffer = new Gtk.TextBuffer();
        this.textView.setBuffer(this.buffer);

        if (this.props.enableUndo !== undefined) {
            this.buffer.setEnableUndo(this.props.enableUndo);
        }

        if (this.props.text !== undefined) {
            this.buffer.setText(this.props.text, -1);
        }

        this.updateSignalHandlers();

        for (const tagChild of this.tagChildren) {
            tagChild.setBuffer(this.buffer);
        }

        for (const anchorChild of this.anchorChildren) {
            anchorChild.setTextViewAndBuffer(this.textView, this.buffer);
        }
    }

    public override appendChild(child: Node): void {
        if (child instanceof TextTagNode) {
            this.tagChildren.push(child);
            if (this.buffer) {
                child.setBuffer(this.buffer);
            }
            return;
        }
        if (child instanceof TextAnchorNode) {
            this.anchorChildren.push(child);
            if (this.textView && this.buffer) {
                child.setTextViewAndBuffer(this.textView, this.buffer);
            }
            return;
        }
        super.appendChild(child);
    }

    public override removeChild(child: Node): void {
        if (child instanceof TextTagNode) {
            const index = this.tagChildren.indexOf(child);
            if (index !== -1) {
                this.tagChildren.splice(index, 1);
            }
            return;
        }
        if (child instanceof TextAnchorNode) {
            const index = this.anchorChildren.indexOf(child);
            if (index !== -1) {
                this.anchorChildren.splice(index, 1);
            }
            return;
        }
        super.removeChild(child);
    }

    public override insertBefore(child: Node, before: Node): void {
        if (child instanceof TextTagNode) {
            const index = before instanceof TextTagNode ? this.tagChildren.indexOf(before) : -1;
            if (index !== -1) {
                this.tagChildren.splice(index, 0, child);
            } else {
                this.tagChildren.push(child);
            }
            if (this.buffer) {
                child.setBuffer(this.buffer);
            }
            return;
        }
        if (child instanceof TextAnchorNode) {
            const index = before instanceof TextAnchorNode ? this.anchorChildren.indexOf(before) : -1;
            if (index !== -1) {
                this.anchorChildren.splice(index, 0, child);
            } else {
                this.anchorChildren.push(child);
            }
            if (this.textView && this.buffer) {
                child.setTextViewAndBuffer(this.textView, this.buffer);
            }
            return;
        }
        super.insertBefore(child, before);
    }

    private getBufferText(): string {
        const buffer = this.buffer;
        if (!buffer) return "";
        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();
        batch(() => {
            buffer.getStartIter(startIter);
            buffer.getEndIter(endIter);
        });
        return buffer.getText(startIter, endIter, true);
    }

    private updateSignalHandlers(): void {
        if (!this.buffer) return;

        const buffer = this.buffer;
        const { onTextChanged, onCanUndoChanged, onCanRedoChanged } = this.props;

        signalStore.set(this, buffer, "changed", onTextChanged ? () => onTextChanged(this.getBufferText()) : null);

        signalStore.set(
            this,
            buffer,
            "notify::can-undo",
            onCanUndoChanged ? () => onCanUndoChanged(buffer.getCanUndo()) : null,
        );

        signalStore.set(
            this,
            buffer,
            "notify::can-redo",
            onCanRedoChanged ? () => onCanRedoChanged(buffer.getCanRedo()) : null,
        );
    }

    public override updateProps(oldProps: TextBufferProps | null, newProps: TextBufferProps): void {
        super.updateProps(oldProps, newProps);

        if (!this.buffer) return;

        if (!oldProps || oldProps.enableUndo !== newProps.enableUndo) {
            if (newProps.enableUndo !== undefined) {
                this.buffer.setEnableUndo(newProps.enableUndo);
            }
        }

        if (!oldProps || oldProps.text !== newProps.text) {
            if (newProps.text !== undefined) {
                const currentText = this.getBufferText();
                if (currentText !== newProps.text) {
                    this.buffer.setText(newProps.text, -1);
                }
            }
        }

        if (
            !oldProps ||
            oldProps.onTextChanged !== newProps.onTextChanged ||
            oldProps.onCanUndoChanged !== newProps.onCanUndoChanged ||
            oldProps.onCanRedoChanged !== newProps.onCanRedoChanged
        ) {
            this.updateSignalHandlers();
        }
    }

    public override unmount(): void {
        this.tagChildren = [];
        this.anchorChildren = [];
        this.buffer = undefined;
        this.textView = undefined;
        super.unmount();
    }
}

registerNodeClass(TextBufferNode);
