import type { ReactNode } from "react";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, type GtkBoxProps, GtkConstraint } from "@gtkx/jsx/gtk";
import { type ChildButtonHandlers, ConstraintChildButtons } from "./child-buttons.js";

type ConstraintContainerProps = {
    layoutManager: GtkBoxProps["layoutManager"];
    handlers: ChildButtonHandlers;
    controllers?: GtkBoxProps["controllers"];
};

const A = Gtk.ConstraintAttribute;

const topEdgeConstraint = (target: Gtk.ConstraintTarget): ReactNode => (
    <GtkConstraint target={target} targetAttribute={A.TOP} sourceAttribute={A.TOP} constant={8} />
);

const bottomEdgeConstraint = (target: Gtk.ConstraintTarget): ReactNode => (
    <GtkConstraint target={target} targetAttribute={A.BOTTOM} sourceAttribute={A.BOTTOM} constant={-8} />
);

const startEdgeConstraint = (target: Gtk.ConstraintTarget): ReactNode => (
    <GtkConstraint target={target} targetAttribute={A.START} sourceAttribute={A.START} constant={8} />
);

const endEdgeConstraint = (target: Gtk.ConstraintTarget): ReactNode => (
    <GtkConstraint target={target} targetAttribute={A.END} sourceAttribute={A.END} constant={-8} />
);

const ConstraintContainer = ({ layoutManager, handlers, controllers }: ConstraintContainerProps): ReactNode => (
    <GtkBox name="container" hexpand vexpand layoutManager={layoutManager} controllers={controllers}>
        <ConstraintChildButtons {...handlers} />
    </GtkBox>
);

export { bottomEdgeConstraint, ConstraintContainer, endEdgeConstraint, startEdgeConstraint, topEdgeConstraint };
