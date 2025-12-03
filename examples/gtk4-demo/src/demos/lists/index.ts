import type { Demo } from "../types.js";
import { dropDownDemo } from "./drop-down.js";
import { flowBoxDemo } from "./flow-box.js";
import { listBoxDemo } from "./list-box.js";
import { listViewDemo } from "./list-view.js";

export const listsDemos: Demo[] = [listBoxDemo, listViewDemo, dropDownDemo, flowBoxDemo];
