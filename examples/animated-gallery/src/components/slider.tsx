import type * as Gtk from "@gtkx/gi/gtk";
import { GtkAdjustment, GtkBox, GtkLabel, GtkScale } from "@gtkx/jsx/gtk";

type SliderProps = {
    label: string;
    initialValue: number;
    lower: number;
    upper: number;
    step: number;
    digits?: number | undefined;
    onChange: (value: number) => void;
};

export const Slider = ({ label, initialValue, lower, upper, step, digits = 0, onChange }: SliderProps) => (
    <GtkBox spacing={10} widthRequest={320}>
        <GtkLabel cssClasses={["dim-label"]} widthRequest={110} xalign={0} label={label} />
        <GtkScale
            hexpand
            drawValue
            digits={digits}
            adjustment={
                <GtkAdjustment
                    value={initialValue}
                    lower={lower}
                    upper={upper}
                    stepIncrement={step}
                    pageIncrement={step * 10}
                />
            }
            onValueChanged={(scale: Gtk.Range) => onChange(scale.getValue())}
        />
    </GtkBox>
);
