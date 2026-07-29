import type * as Gdk from "@gtkx/gi/gdk";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton, GtkTextBuffer, GtkTextChildAnchor, GtkTextTag, GtkTextView } from "@gtkx/jsx/gtk";
import { render, screen } from "@gtkx/testing";
import { createRef, type ReactNode, type RefObject } from "react";
import { describe, expect, it } from "vitest";
import { getBufferText, getTextBuffer } from "../helpers/buffer-text.js";
import { countPaintables, lookupIconPaintable } from "../helpers/icon-paintable.js";

type AnchorFixture = {
    icon: Gtk.IconPaintable;
    buffer: Gtk.TextBuffer;
    rerender: (content: ReactNode) => Promise<void>;
};

const buildPaintableView = (viewRef: RefObject<Gtk.TextView | null>) => (content: ReactNode) => (
    <GtkTextView ref={viewRef} buffer={<GtkTextBuffer>{content}</GtkTextBuffer>} />
);

const buildInlineContent = (paintable: Gdk.Paintable | null, trailing: string): ReactNode => (
    <>
        {"before "}
        {paintable === null ? null : <GtkTextChildAnchor paintable={paintable} />}
        {trailing}
    </>
);

const buildTaggedContent = (prefix: string, paintable: Gdk.Paintable): ReactNode => (
    <>
        {prefix}
        <GtkTextTag name="logo" pixelsAboveLines={200}>
            <GtkTextChildAnchor paintable={paintable} />
        </GtkTextTag>
    </>
);

const buildAnchorContent = (label: string): ReactNode => (
    <>
        {"before "}
        <GtkTextChildAnchor>
            <GtkButton label={label} />
        </GtkTextChildAnchor>
        {" after"}
    </>
);

const buildRefAnchorContent = (anchorRef: RefObject<Gtk.TextChildAnchor | null>): ReactNode => (
    <>
        {"before "}
        <GtkTextChildAnchor ref={anchorRef}>
            <GtkButton label="Embedded" />
        </GtkTextChildAnchor>
        {" after"}
    </>
);

const buildMixedContent = (paintable: Gdk.Paintable): ReactNode => (
    <GtkTextChildAnchor paintable={paintable}>
        <GtkButton label="Nope" />
    </GtkTextChildAnchor>
);

const hasTagAtOffset = (buffer: Gtk.TextBuffer, tagName: string, offset: number): boolean => {
    const tag = buffer.getTagTable().lookup(tagName);

    return tag !== null && buffer.getIterAtOffset(offset).hasTag(tag);
};

const paintableAtOffset = (buffer: Gtk.TextBuffer, offset: number): Gdk.Paintable | null =>
    buffer.getIterAtOffset(offset).getPaintable();

const anchorAtOffset = (buffer: Gtk.TextBuffer, offset: number): Gtk.TextChildAnchor | null =>
    buffer.getIterAtOffset(offset).getChildAnchor();

const renderAnchorContent = async (build: (icon: Gtk.IconPaintable) => ReactNode): Promise<AnchorFixture> => {
    const icon = lookupIconPaintable("image-x-generic-symbolic");
    const viewRef = createRef<Gtk.TextView>();
    const buildView = buildPaintableView(viewRef);
    const { rerender } = await render(buildView(build(icon)));

    return {
        icon,
        buffer: getTextBuffer(viewRef),
        rerender: async (content) => {
            await rerender(buildView(content));
        },
    };
};

const buildInlineIcon = (icon: Gtk.IconPaintable): ReactNode => buildInlineContent(icon, " after");

describe("render - TextChildAnchor paintables", () => {
    it("inserts a paintable at its position in the content", async () => {
        const { icon, buffer } = await renderAnchorContent(buildInlineIcon);
        expect(countPaintables(buffer)).toBe(1);
        expect(paintableAtOffset(buffer, 7)).toBe(icon);
        expect(getBufferText(buffer)).toBe("before  after");
    });

    it("replaces the paintable when the prop changes", async () => {
        const { buffer, rerender } = await renderAnchorContent(buildInlineIcon);
        const other = lookupIconPaintable("folder-symbolic");
        await rerender(buildInlineContent(other, " after"));
        expect(countPaintables(buffer)).toBe(1);
        expect(paintableAtOffset(buffer, 7)).toBe(other);
    });

    it("removes the paintable on unmount, preserving surrounding text", async () => {
        const { buffer, rerender } = await renderAnchorContent(buildInlineIcon);
        await rerender(buildInlineContent(null, " after"));
        expect(countPaintables(buffer)).toBe(0);
        expect(getBufferText(buffer)).toBe("before  after");
    });
});

describe("render - TextChildAnchor paintable offsets", () => {
    it("keeps offsets of following text correct when it updates", async () => {
        const { icon, buffer, rerender } = await renderAnchorContent(buildInlineIcon);
        await rerender(buildInlineContent(icon, " a much longer trailing run"));
        expect(countPaintables(buffer)).toBe(1);
        expect(paintableAtOffset(buffer, 7)).toBe(icon);
        expect(getBufferText(buffer)).toBe("before  a much longer trailing run");
    });

    it("applies an enclosing tag to the paintable", async () => {
        const { icon, buffer, rerender } = await renderAnchorContent((item) => buildTaggedContent("short", item));
        expect(hasTagAtOffset(buffer, "logo", 5)).toBe(true);
        await rerender(buildTaggedContent("a much longer prefix", icon));
        expect(countPaintables(buffer)).toBe(1);
        expect(hasTagAtOffset(buffer, "logo", 20)).toBe(true);
    });
});

describe("render - TextChildAnchor identity", () => {
    it("inserts the element's own anchor into the buffer", async () => {
        const anchorRef = createRef<Gtk.TextChildAnchor>();
        const { buffer } = await renderAnchorContent(() => buildRefAnchorContent(anchorRef));
        expect(anchorAtOffset(buffer, 7)).toBe(anchorRef.current);
        expect(anchorRef.current?.getDeleted()).toBe(false);
    });

    it("keeps the anchor usable across a buffer rebuild", async () => {
        const { buffer, rerender } = await renderAnchorContent(() => buildAnchorContent("First"));
        await rerender(buildAnchorContent("Second"));
        expect(anchorAtOffset(buffer, 7)).not.toBeNull();
        expect(await screen.findByRole(Gtk.AccessibleRole.BUTTON)).toBeDefined();
        expect(getBufferText(buffer)).toBe("before  after");
    });
});

describe("render - TextChildAnchor content model", () => {
    it("throws when an anchor mixes a paintable prop with a child widget", async () => {
        const icon = lookupIconPaintable("image-x-generic-symbolic");
        const viewRef = createRef<Gtk.TextView>();
        const view = buildPaintableView(viewRef)(buildMixedContent(icon));
        await expect(render(view)).rejects.toThrow(/cannot mix a `paintable` prop with a child widget/);
    });
});
