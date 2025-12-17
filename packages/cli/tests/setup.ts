import { stop } from "@gtkx/ffi";
import { render } from "@gtkx/react";
import { createElement } from "react";
import { beforeAll } from "vitest";

const APP_ID = "com.gtkx.test.cli";

const DummyApp = () => null;

const setupTests = () => {
    beforeAll(() => {
        render(createElement(DummyApp), APP_ID);
    });
};

const teardown = () => {
    stop();
};

setupTests();

export default async function globalSetup() {
    return async () => {
        teardown();
    };
}
