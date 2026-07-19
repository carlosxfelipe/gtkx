import { animated } from "@gtkx/animated";
import { css, cx } from "@gtkx/css";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { useState } from "react";
import { EventLog } from "../../components/event-log.js";
import { Slider } from "../../components/slider.js";
import { Stage } from "../../components/stage.js";
import { useEventLog } from "../../hooks/use-event-log.js";
import type { Scene } from "../types.js";
import sourceCode from "./css-variables.tsx?raw";

const cardStyle = css`
    background-color: var(--gallery-accent);
    border-radius: var(--gallery-radius);
    color: var(--gallery-ink);
    min-width: 320px;
`;

const badgeStyle = css`
    background-color: var(--gallery-ink);
    color: var(--gallery-accent);
    border-radius: var(--gallery-radius);
    padding: 4px 14px;
    font-family: monospace;
    font-size: 0.85em;
`;

const COOL = {
    "--gallery-accent": "#3584e4",
    "--gallery-radius": "10px",
    "--gallery-ink": "#ffffff",
    padding: 24,
};

const WARM = {
    "--gallery-accent": "#e66100",
    "--gallery-radius": "34px",
    "--gallery-ink": "#241f31",
    padding: 34,
};

type ThemedCardProps = {
    theme: typeof COOL | typeof WARM;
    duration: number;
    onSettled: () => void;
};

const ThemedCard = ({ theme, duration, onSettled }: ThemedCardProps) => (
    <animated.GtkBox
        name="themed-card"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={12}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        cssClasses={[cardStyle]}
        style={COOL}
        animate={theme}
        transition={{ duration, ease: "easeInOut" }}
        onAnimationComplete={onSettled}
    >
        <GtkLabel cssClasses={["title-2"]} label="Themed by variables" />
        <GtkLabel cssClasses={[badgeStyle]} halign={Gtk.Align.CENTER} label="var(--gallery-accent)" />
    </animated.GtkBox>
);

const CssVariables = () => {
    const [warm, setWarm] = useState(false);
    const [duration, setDuration] = useState(0.6);
    const { entries, log } = useEventLog();
    const theme = warm ? WARM : COOL;

    const toggle = () => {
        setWarm((value) => !value);
        log(warm ? "target cool" : "target warm");
    };

    return (
        <Stage
            controls={
                <>
                    <GtkButton
                        name="toggle-theme"
                        label={warm ? "Cool" : "Warm"}
                        cssClasses={cx("pill", warm && "suggested-action")}
                        onClicked={toggle}
                    />
                    <Slider
                        label="Duration (s)"
                        initialValue={0.6}
                        lower={0.1}
                        upper={2}
                        step={0.1}
                        digits={1}
                        onChange={setDuration}
                    />
                </>
            }
            aside={<EventLog entries={entries} />}
            readout={`accent ${theme["--gallery-accent"]}, radius ${theme["--gallery-radius"]}`}
        >
            <ThemedCard theme={theme} duration={duration} onSettled={() => log("settled")} />
        </Stage>
    );
};

export const cssVariablesScene: Scene = {
    id: "css-variables",
    section: "Values",
    title: "CSS Variables",
    summary: "Animate custom properties and let static css() classes resolve them through var().",
    features: ["--* custom properties", "css()", "cx()", "var() inheritance", "onAnimationComplete"],
    notes: [
        "Custom properties pass through the bridge untouched, so an animated rule can set them and a static css() class on the same widget resolves them.",
        "The card writes the variables, and the badge inside it reads them through its own css() class because GTK inherits custom properties down the widget tree.",
        "Both themes are named targets and the base values live in style, so every custom property has a from keyframe to animate away from.",
        "The animation provider sits one priority above the css() provider, so an animated value always wins over a static declaration for the same property.",
    ],
    component: CssVariables,
    sourceCode,
};
