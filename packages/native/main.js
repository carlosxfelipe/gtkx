import "./bootstrap.js";
import { addLogListener, removeLogListener } from "./index.js";

const onLog = (listener) => {
    const id = addLogListener(listener);

    return {
        unsubscribe: () => {
            removeLogListener(id);
        },
    };
};

export * from "./index.js";
export { onLog };
