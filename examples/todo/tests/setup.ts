import { cleanup } from "@gtkx/testing";

export default async function globalSetup() {
    return async () => {
        await cleanup();
    };
}
