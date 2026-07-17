import { afterEach, beforeEach, vi } from "vitest";

export type LogState = { stderrSpy: ReturnType<typeof vi.spyOn> };

export const setupLogState = (): LogState => {
    const state = {} as LogState;
    beforeEach(() => {
        vi.clearAllMocks();
        state.stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    });
    afterEach(() => {
        state.stderrSpy.mockRestore();
    });
    return state;
};

export const collectLogged = (stderrSpy: ReturnType<typeof vi.spyOn>): string =>
    stderrSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("");
