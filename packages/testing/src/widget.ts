type WidgetWithSetText = { setText: (text: string) => void };
type WidgetWithGetText = { getText: () => string };

export const hasSetText = (widget: unknown): widget is WidgetWithSetText =>
    typeof (widget as WidgetWithSetText).setText === "function";

export const hasGetText = (widget: unknown): widget is WidgetWithGetText =>
    typeof (widget as WidgetWithGetText).getText === "function";
