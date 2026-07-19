import { describe, expect, it } from "vitest";
import { extractPathFromURL, getInitialURLFromArgv } from "../src/index.js";
import { schemeFromApplicationId } from "../src/linking/default-prefix.js";

const CUSTOM = ["myapp://"];
const HOSTED = ["https://example.com"];

describe("extractPathFromURL", () => {
    it("keeps the first segment for a bare custom scheme", () => {
        expect(extractPathFromURL(CUSTOM, "myapp://tasks/42")).toBe("/tasks/42");
    });

    it("strips the host for an http prefix", () => {
        expect(extractPathFromURL(HOSTED, "https://example.com/tasks/42")).toBe("/tasks/42");
    });

    it("returns undefined when no prefix scheme matches", () => {
        expect(extractPathFromURL(CUSTOM, "other://tasks/42")).toBeUndefined();
        expect(extractPathFromURL(HOSTED, "https://other.example/tasks/42")).toBeUndefined();
    });

    it("preserves the query string", () => {
        expect(extractPathFromURL(CUSTOM, "myapp://tasks/42?done=true&sort=name")).toBe(
            "/tasks/42?done=true&sort=name",
        );
    });

    it("matches the scheme case-insensitively", () => {
        expect(extractPathFromURL(CUSTOM, "MyApp://tasks/42")).toBe("/tasks/42");
        expect(extractPathFromURL(["MYAPP://"], "myapp://tasks/42")).toBe("/tasks/42");
    });

    it("tolerates a trailing slash on the prefix", () => {
        expect(extractPathFromURL(["myapp:///"], "myapp://tasks/42")).toBe("/tasks/42");
        expect(extractPathFromURL(["https://example.com/"], "https://example.com/tasks/42")).toBe("/tasks/42");
    });

    it("picks the first matching prefix", () => {
        expect(extractPathFromURL(["other://", "myapp://"], "myapp://tasks/42")).toBe("/tasks/42");
    });

    it("returns the root path for a bare url", () => {
        expect(extractPathFromURL(CUSTOM, "myapp://")).toBe("/");
        expect(extractPathFromURL(HOSTED, "https://example.com")).toBe("/");
    });
});

describe("getInitialURLFromArgv", () => {
    it("picks the matching entry out of argv", () => {
        expect(getInitialURLFromArgv(CUSTOM, ["/usr/bin/node", "/app/index.js", "myapp://tasks/42"])).toBe(
            "myapp://tasks/42",
        );
    });

    it("returns undefined when nothing in argv matches", () => {
        expect(getInitialURLFromArgv(CUSTOM, ["/usr/bin/node", "/app/index.js", "--verbose"])).toBeUndefined();
    });
});

describe("schemeFromApplicationId", () => {
    it.each([
        ["lowercases a reverse-DNS application ID", "org.gtkx.Example", "org.gtkx.example"],
        ["keeps hyphens, which are valid in a URI scheme", "org.gtkx.my-app", "org.gtkx.my-app"],
        ["keeps digits", "com.example.app2", "com.example.app2"],
    ])("%s", (_label, id, expected) => {
        expect(schemeFromApplicationId(id)).toBe(expected);
    });

    it.each([
        ["an underscore, which GLib allows in an application ID but RFC 3986 forbids", "org.gtkx.my_app"],
        ["a leading digit, which cannot start a scheme", "2go.example.app"],
        ["a space", "org.gtkx.my app"],
    ])("returns undefined for %s", (_label, id) => {
        expect(schemeFromApplicationId(id)).toBeUndefined();
    });
});
