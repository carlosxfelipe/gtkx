import { start, stop } from "@gtkx/ffi";
import { beforeAll } from "vitest";

const APP_ID = "com.gtkx.test.css";

let isInitialized = false;

const setup = () => {
    beforeAll(() => {
        if (!isInitialized) {
            start(APP_ID);
            isInitialized = true;
        }
    });
};

const teardown = () => {
    if (isInitialized) {
        stop();
        isInitialized = false;
    }
};

setup();

export default async function globalSetup() {
    return async () => {
        teardown();
    };
}
