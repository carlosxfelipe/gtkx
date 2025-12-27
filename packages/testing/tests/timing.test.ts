import { describe, expect, it } from "vitest";
import { tick } from "../src/index.js";

describe("tick", () => {
    it("returns a promise", () => {
        const result = tick();
        expect(result).toBeInstanceOf(Promise);
    });

    it("resolves on the next event loop tick", async () => {
        let resolved = false;
        const promise = tick().then(() => {
            resolved = true;
        });

        expect(resolved).toBe(false);
        await promise;
        expect(resolved).toBe(true);
    });

    it("can be used to yield control", async () => {
        const order: number[] = [];

        const first = async () => {
            order.push(1);
            await tick();
            order.push(3);
        };

        const second = async () => {
            order.push(2);
        };

        const p1 = first();
        await second();
        await p1;

        expect(order).toEqual([1, 2, 3]);
    });
});
