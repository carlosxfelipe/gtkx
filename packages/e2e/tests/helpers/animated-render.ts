import { render as baseRender, type RenderResult } from "@gtkx/testing";
import type { ReactNode } from "react";

export const render = (element: ReactNode): Promise<RenderResult> => baseRender(element, { animations: true });
