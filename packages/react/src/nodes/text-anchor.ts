import * as Gtk from "@gtkx/ffi/gtk";
import type { ReactNode } from "react";
import type { Node } from "../node.js";
import { registerNodeClass } from "../registry.js";
import { VirtualNode } from "./virtual.js";
import { WidgetNode } from "./widget.js";

const OBJECT_REPLACEMENT_CHAR = "\uFFFC";

/**
 * Props for the TextAnchor virtual element.
 *
 * Used to declaratively embed widgets at placeholder positions in a TextBuffer.
 * Use the Unicode object replacement character (\uFFFC) in your text as placeholders.
 *
 * @example
 * ```tsx
 * <GtkTextView>
 *     <x.TextBuffer text="Click here: \uFFFC and here: \uFFFC">
 *         <x.TextAnchor index={0}>
 *             <GtkButton label="First" />
 *         </x.TextAnchor>
 *         <x.TextAnchor index={1}>
 *             <GtkButton label="Second" />
 *         </x.TextAnchor>
 *     </x.TextBuffer>
 * </GtkTextView>
 * ```
 */
export type TextAnchorProps = {
    /** Index of the \uFFFC placeholder character to anchor to (0-based) */
    index: number;
    /** The widget to embed at this anchor position */
    children?: ReactNode;
};

export class TextAnchorNode extends VirtualNode<TextAnchorProps> {
    public static override priority = 1;

    private textView?: Gtk.TextView;
    private buffer?: Gtk.TextBuffer;
    private anchor?: Gtk.TextChildAnchor;
    private child?: Gtk.Widget;

    public static override matches(type: string): boolean {
        return type === "TextAnchor";
    }

    public setTextViewAndBuffer(textView: Gtk.TextView, buffer: Gtk.TextBuffer): void {
        this.textView = textView;
        this.buffer = buffer;
        this.setupAnchor();
    }

    private setupAnchor(): void {
        if (!this.textView || !this.buffer || !this.child) return;

        const text = this.getBufferText();
        const position = this.findPlaceholderPosition(text, this.props.index);

        if (position === -1) {
            console.warn(`TextAnchor: Could not find placeholder at index ${this.props.index}`);
            return;
        }

        const iter = new Gtk.TextIter();
        this.buffer.getIterAtOffset(iter, position);

        this.anchor = this.buffer.createChildAnchor(iter);
        if (this.anchor) {
            this.textView.addChildAtAnchor(this.child, this.anchor);
        }
    }

    private getBufferText(): string {
        if (!this.buffer) return "";

        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();
        this.buffer.getStartIter(startIter);
        this.buffer.getEndIter(endIter);

        return this.buffer.getText(startIter, endIter, true) ?? "";
    }

    private findPlaceholderPosition(text: string, index: number): number {
        let count = 0;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === OBJECT_REPLACEMENT_CHAR) {
                if (count === index) {
                    return i;
                }
                count++;
            }
        }
        return -1;
    }

    public override appendChild(child: Node): void {
        if (!(child instanceof WidgetNode)) {
            throw new Error(`TextAnchor can only contain widget children, got '${child.typeName}'`);
        }

        this.child = child.container;

        if (this.textView && this.buffer) {
            this.setupAnchor();
        }
    }

    public override removeChild(): void {
        this.child = undefined;
    }

    public override unmount(): void {
        this.anchor = undefined;
        this.child = undefined;
        this.buffer = undefined;
        this.textView = undefined;
        super.unmount();
    }
}

registerNodeClass(TextAnchorNode);
