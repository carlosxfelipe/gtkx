import {
    animated,
    anticipate,
    backOut,
    circOut,
    cubicBezier,
    type Easing,
    easeInOut,
    type RepeatType,
} from "@gtkx/animated";
import * as Gtk from "@gtkx/gi/gtk";
import { GtkBox, GtkButton, GtkLabel } from "@gtkx/jsx/gtk";
import { type ReactNode, useState } from "react";
import { Stage } from "../../components/stage.js";
import { monoStyle, trackStyle } from "../../theme.js";
import type { Scene } from "../types.js";
import sourceCode from "./easing-and-repeat.tsx?raw";

const TRAVEL = 280;

const CURVES: { label: string; ease: Easing }[] = [
    { label: '"linear"', ease: "linear" },
    { label: '"easeIn"', ease: "easeIn" },
    { label: '"easeOut"', ease: "easeOut" },
    { label: "easeInOut", ease: easeInOut },
    { label: "anticipate", ease: anticipate },
    { label: "backOut", ease: backOut },
    { label: "circOut", ease: circOut },
    { label: "cubicBezier(0.17, 0.67, 0.83, 0.17)", ease: cubicBezier(0.17, 0.67, 0.83, 0.17) },
];

const REPEATS: RepeatType[] = ["loop", "reverse", "mirror"];

const CurveRow = ({ label, ease, index, run }: { label: string; ease: Easing; index: number; run: boolean }) => (
    <GtkBox spacing={12}>
        <GtkLabel cssClasses={["dim-label", monoStyle]} widthRequest={330} xalign={0} label={label} />
        <GtkBox cssClasses={[trackStyle]} widthRequest={340} valign={Gtk.Align.CENTER}>
            <animated.GtkBox
                widthRequest={24}
                heightRequest={24}
                marginTop={10}
                marginBottom={10}
                marginStart={10}
                style={{ backgroundColor: "#3584e4", borderRadius: 12 }}
                initial={false}
                animate={{ x: run ? TRAVEL : 0 }}
                transition={{ type: "tween", duration: 1, ease, delay: index * 0.03 }}
            />
        </GtkBox>
    </GtkBox>
);

const DotColumn = ({ caption, children }: { caption: string; children: ReactNode }) => (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER} valign={Gtk.Align.END}>
        {children}
        <GtkLabel cssClasses={["dim-label", monoStyle]} label={caption} />
    </GtkBox>
);

const RepeatDot = ({ repeatType }: { repeatType: RepeatType }) => (
    <DotColumn caption={`"${repeatType}"`}>
        <animated.GtkBox
            widthRequest={36}
            heightRequest={36}
            style={{ backgroundColor: "#9141ac", borderRadius: 18 }}
            animate={{ y: -70 }}
            transition={{
                duration: 0.6,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType,
                repeatDelay: 0.25,
            }}
        />
    </DotColumn>
);

const PulseDot = () => (
    <DotColumn caption="repeat: 3">
        <animated.GtkBox
            widthRequest={36}
            heightRequest={36}
            style={{ backgroundColor: "#e01b24", borderRadius: 18 }}
            animate={{ scale: 1.6 }}
            transition={{ type: "tween", duration: 0.25, repeat: 3, repeatType: "reverse" }}
        />
    </DotColumn>
);

const RepeatRow = ({ pulses }: { pulses: number }) => (
    <GtkBox spacing={48} halign={Gtk.Align.CENTER} marginTop={96}>
        {REPEATS.map((repeatType) => (
            <RepeatDot key={repeatType} repeatType={repeatType} />
        ))}
        <PulseDot key={`pulse-${pulses}`} />
    </GtkBox>
);

const EasingAndRepeat = () => {
    const [run, setRun] = useState(false);
    const [pulses, setPulses] = useState(0);

    return (
        <Stage
            controls={
                <>
                    <GtkButton
                        label={run ? "Send back" : "Send across"}
                        cssClasses={["pill", "suggested-action"]}
                        onClicked={() => setRun((value) => !value)}
                    />
                    <GtkButton label="Pulse" cssClasses={["pill"]} onClicked={() => setPulses((count) => count + 1)} />
                </>
            }
            readout={`target x: ${run ? TRAVEL : 0}, duration: 1, delay: 0.03 per row`}
        >
            <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                {CURVES.map((curve, index) => (
                    <CurveRow key={curve.label} label={curve.label} ease={curve.ease} index={index} run={run} />
                ))}
                <RepeatRow pulses={pulses} />
            </GtkBox>
        </Stage>
    );
};

export const easingAndRepeatScene: Scene = {
    id: "easing-and-repeat",
    section: "Basics",
    title: "Easing and Repeat",
    summary:
        "Tween timing in full: named and functional easing curves, staggered delays, and finite or infinite repeats.",
    features: [
        'type: "tween"',
        "duration",
        "delay",
        "ease",
        "easeInOut",
        "anticipate",
        "backOut",
        "circOut",
        "cubicBezier",
        "repeat",
        "repeatType",
        "repeatDelay",
    ],
    notes: [
        "The ease option accepts a name such as easeInOut, an easing function such as anticipate, backOut or circOut, or the curve returned by cubicBezier().",
        "Each row starts a little after the one above it, so delay is what turns a set of identical tweens into a staggered sweep.",
        "repeat counts the passes after the first, so repeat: 3 plays four times. An even number of passes with repeatType reverse settles back on the starting keyframe.",
        'repeatDelay pauses between passes. "loop" restarts from the start value, "reverse" plays the keyframes backward, and "mirror" also flips the easing curve.',
        "Without an explicit transition each value takes a motion default: transforms run on a spring, everything else on a 0.3 second tween, and a keyframe array longer than two values on a 0.8 second tween.",
    ],
    component: EasingAndRepeat,
    sourceCode,
};
