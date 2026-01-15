import { batch } from "@gtkx/ffi";
import * as Gtk from "@gtkx/ffi/gtk";
import type * as Pango from "@gtkx/ffi/pango";
import { registerNodeClass } from "../registry.js";
import { VirtualNode } from "./virtual.js";

/**
 * Props for the TextTag virtual element.
 *
 * Used to declaratively define and apply text formatting tags to a GtkTextBuffer.
 *
 * @example
 * ```tsx
 * <GtkTextView>
 *     <x.TextBuffer text="Hello bold world">
 *         <x.TextTag id="bold" weight={Pango.Weight.BOLD} start={6} end={10} />
 *         <x.TextTag id="red" foreground="red" start={11} end={16} />
 *     </x.TextBuffer>
 * </GtkTextView>
 * ```
 */
export type TextTagProps = {
    /** Unique identifier for this tag in the tag table */
    id: string;
    /** Start offset (character index) to apply the tag. If omitted, tag is only defined, not applied. */
    start?: number;
    /** End offset (character index) to apply the tag. If omitted, tag is only defined, not applied. */
    end?: number;
    /** Priority of this tag (higher wins when multiple tags affect same property) */
    priority?: number;

    /** Background color as a string (e.g., "red", "#ff0000") */
    background?: string;
    /** Whether the background fills the entire line height */
    backgroundFullHeight?: boolean;
    /** Foreground (text) color as a string */
    foreground?: string;

    /** Font family name (e.g., "Sans", "Monospace") */
    family?: string;
    /** Font description string (e.g., "Sans Italic 12") */
    font?: string;
    /** Font size in points */
    sizePoints?: number;
    /** Font size in Pango units */
    size?: number;
    /** Font size scale factor relative to default */
    scale?: number;
    /** Font weight (use Pango.Weight constants) */
    weight?: Pango.Weight | number;
    /** Font style (use Pango.Style constants) */
    style?: Pango.Style;
    /** Font stretch (use Pango.Stretch constants) */
    stretch?: Pango.Stretch;
    /** Font variant (use Pango.Variant constants) */
    variant?: Pango.Variant;

    /** Whether to strike through the text */
    strikethrough?: boolean;
    /** Underline style (use Pango.Underline constants) */
    underline?: Pango.Underline;
    /** Overline style (use Pango.Overline constants) */
    overline?: Pango.Overline;

    /** Offset of text above baseline in Pango units (negative = below) */
    rise?: number;
    /** Extra spacing between characters in Pango units */
    letterSpacing?: number;
    /** Factor to scale line height by */
    lineHeight?: number;

    /** Left margin in pixels */
    leftMargin?: number;
    /** Right margin in pixels */
    rightMargin?: number;
    /** Paragraph indent in pixels (negative = hanging) */
    indent?: number;
    /** Pixels of blank space above paragraphs */
    pixelsAboveLines?: number;
    /** Pixels of blank space below paragraphs */
    pixelsBelowLines?: number;
    /** Pixels of blank space between wrapped lines */
    pixelsInsideWrap?: number;

    /** Text justification */
    justification?: Gtk.Justification;
    /** Text direction */
    direction?: Gtk.TextDirection;
    /** Wrap mode for line breaks */
    wrapMode?: Gtk.WrapMode;

    /** Whether the text can be modified */
    editable?: boolean;
    /** Whether the text is invisible/hidden */
    invisible?: boolean;
    /** Whether breaks are allowed */
    allowBreaks?: boolean;
    /** Whether to insert hyphens at breaks */
    insertHyphens?: boolean;
    /** Whether font fallback is enabled */
    fallback?: boolean;
    /** Whether margins accumulate */
    accumulativeMargin?: boolean;

    /** Paragraph background color as a string */
    paragraphBackground?: string;
    /** How to render invisible characters */
    showSpaces?: Pango.ShowFlags;
    /** How to transform text for display */
    textTransform?: Pango.TextTransform;

    /** OpenType font features as a string */
    fontFeatures?: string;
    /** Language code (e.g., "en-US") */
    language?: string;
};

type TagStyleProps = Omit<TextTagProps, "name" | "start" | "end" | "priority">;

export class TextTagNode extends VirtualNode<TextTagProps> {
    public static override priority = 1;

    private buffer?: Gtk.TextBuffer;
    private tag?: Gtk.TextTag;

    public static override matches(type: string): boolean {
        return type === "TextTag";
    }

    public setBuffer(buffer: Gtk.TextBuffer): void {
        this.buffer = buffer;
        this.setupTag();
    }

    private setupTag(): void {
        if (!this.buffer) return;

        const tagTable = this.buffer.getTagTable();
        this.tag = new Gtk.TextTag(this.props.id);

        this.applyStyleProps(this.props);

        tagTable.add(this.tag);

        if (this.props.priority !== undefined) {
            this.tag.setPriority(this.props.priority);
        }

        this.applyTagToRange();
    }

    private applyStyleProps(props: TagStyleProps): void {
        if (!this.tag) return;

        if (props.background !== undefined) this.tag.setBackground(props.background);
        if (props.backgroundFullHeight !== undefined) this.tag.setBackgroundFullHeight(props.backgroundFullHeight);
        if (props.foreground !== undefined) this.tag.setForeground(props.foreground);

        if (props.family !== undefined) this.tag.setFamily(props.family);
        if (props.font !== undefined) this.tag.setFont(props.font);
        if (props.sizePoints !== undefined) this.tag.setSizePoints(props.sizePoints);
        if (props.size !== undefined) this.tag.setSize(props.size);
        if (props.scale !== undefined) this.tag.setScale(props.scale);
        if (props.weight !== undefined) this.tag.setWeight(props.weight);
        if (props.style !== undefined) this.tag.setStyle(props.style);
        if (props.stretch !== undefined) this.tag.setStretch(props.stretch);
        if (props.variant !== undefined) this.tag.setVariant(props.variant);

        if (props.strikethrough !== undefined) this.tag.setStrikethrough(props.strikethrough);
        if (props.underline !== undefined) this.tag.setUnderline(props.underline);
        if (props.overline !== undefined) this.tag.setOverline(props.overline);

        if (props.rise !== undefined) this.tag.setRise(props.rise);
        if (props.letterSpacing !== undefined) this.tag.setLetterSpacing(props.letterSpacing);
        if (props.lineHeight !== undefined) this.tag.setLineHeight(props.lineHeight);

        if (props.leftMargin !== undefined) this.tag.setLeftMargin(props.leftMargin);
        if (props.rightMargin !== undefined) this.tag.setRightMargin(props.rightMargin);
        if (props.indent !== undefined) this.tag.setIndent(props.indent);
        if (props.pixelsAboveLines !== undefined) this.tag.setPixelsAboveLines(props.pixelsAboveLines);
        if (props.pixelsBelowLines !== undefined) this.tag.setPixelsBelowLines(props.pixelsBelowLines);
        if (props.pixelsInsideWrap !== undefined) this.tag.setPixelsInsideWrap(props.pixelsInsideWrap);

        if (props.justification !== undefined) this.tag.setJustification(props.justification);
        if (props.direction !== undefined) this.tag.setDirection(props.direction);
        if (props.wrapMode !== undefined) this.tag.setWrapMode(props.wrapMode);

        if (props.editable !== undefined) this.tag.setEditable(props.editable);
        if (props.invisible !== undefined) this.tag.setInvisible(props.invisible);
        if (props.allowBreaks !== undefined) this.tag.setAllowBreaks(props.allowBreaks);
        if (props.insertHyphens !== undefined) this.tag.setInsertHyphens(props.insertHyphens);
        if (props.fallback !== undefined) this.tag.setFallback(props.fallback);
        if (props.accumulativeMargin !== undefined) this.tag.setAccumulativeMargin(props.accumulativeMargin);

        if (props.paragraphBackground !== undefined) this.tag.setParagraphBackground(props.paragraphBackground);
        if (props.showSpaces !== undefined) this.tag.setShowSpaces(props.showSpaces);
        if (props.textTransform !== undefined) this.tag.setTextTransform(props.textTransform);

        if (props.fontFeatures !== undefined) this.tag.setFontFeatures(props.fontFeatures);
        if (props.language !== undefined) this.tag.setLanguage(props.language);
    }

    private applyTagToRange(): void {
        const buffer = this.buffer;
        const tag = this.tag;
        if (!buffer || !tag) return;

        const { start, end } = this.props;
        if (start === undefined || end === undefined) return;

        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();

        batch(() => {
            buffer.getIterAtOffset(startIter, start);
            buffer.getIterAtOffset(endIter, end);
        });

        buffer.applyTag(tag, startIter, endIter);
    }

    private removeTagFromRange(): void {
        const buffer = this.buffer;
        const tag = this.tag;
        if (!buffer || !tag) return;

        const startIter = new Gtk.TextIter();
        const endIter = new Gtk.TextIter();

        batch(() => {
            buffer.getStartIter(startIter);
            buffer.getEndIter(endIter);
        });

        buffer.removeTag(tag, startIter, endIter);
    }

    public override updateProps(oldProps: TextTagProps | null, newProps: TextTagProps): void {
        super.updateProps(oldProps, newProps);

        if (!this.buffer || !this.tag) return;

        if (oldProps?.id !== newProps.id) {
            throw new Error("TextTag id cannot be changed after creation");
        }

        this.applyStyleProps(newProps);

        if (newProps.priority !== undefined) {
            this.tag.setPriority(newProps.priority);
        }

        const rangeChanged = oldProps?.start !== newProps.start || oldProps?.end !== newProps.end;

        if (rangeChanged) {
            this.removeTagFromRange();
            this.applyTagToRange();
        }
    }

    public override unmount(): void {
        if (this.buffer && this.tag) {
            this.removeTagFromRange();
            const tagTable = this.buffer.getTagTable();
            tagTable.remove(this.tag);
        }
        this.tag = undefined;
        this.buffer = undefined;
        super.unmount();
    }
}

registerNodeClass(TextTagNode);
