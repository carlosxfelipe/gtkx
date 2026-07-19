import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Status = "green" | "red";
type Baseline = Record<string, Status>;

const PROJECT = "animated";
const BASELINE_PATH = join(import.meta.dirname, "..", "packages", "animated", "tests", "baseline.json");

type VitestAssertion = { fullName?: string; title?: string; status?: string };
type VitestSuite = { name?: string; assertionResults?: VitestAssertion[] };
type VitestReport = { testResults?: VitestSuite[] };

const runSuite = (): VitestReport => {
    const root = join(import.meta.dirname, "..");
    const reportPath = join(tmpdir(), `gtkx-spec-report-${process.pid}.json`);
    try {
        execFileSync("npx", ["vitest", "run", "--project", PROJECT, "--reporter=json", `--outputFile=${reportPath}`], {
            cwd: root,
            encoding: "utf8",
            stdio: "ignore",
            maxBuffer: 64 * 1024 * 1024,
        });
    } catch {
        if (!existsSync(reportPath)) throw new Error("vitest produced no JSON report");
    }
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as VitestReport;
    rmSync(reportPath, { force: true });
    return report;
};

const SKIP_STATUSES = new Set(["pending", "skipped", "todo"]);

const allAssertions = (report: VitestReport): VitestAssertion[] =>
    (report.testResults ?? []).flatMap((suite) => suite.assertionResults ?? []);

const collect = (report: VitestReport): { observed: Baseline; skipped: string[] } => {
    const observed: Baseline = {};
    const skipped: string[] = [];
    for (const assertion of allAssertions(report)) {
        const name = assertion.fullName ?? assertion.title;
        if (!name) continue;
        if (SKIP_STATUSES.has(assertion.status ?? "")) {
            skipped.push(name);
            continue;
        }
        observed[name] = assertion.status === "passed" ? "green" : "red";
    }
    return { observed, skipped };
};

const readBaseline = (): Baseline =>
    existsSync(BASELINE_PATH) ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline) : {};

const record = (observed: Baseline): void => {
    const sorted = Object.fromEntries(Object.entries(observed).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 4)}\n`);
    const red = Object.values(sorted).filter((status) => status === "red").length;
    process.stdout.write(`Recorded ${Object.keys(sorted).length} specs (${red} red) to ${BASELINE_PATH}\n`);
};

const check = (observed: Baseline, skipped: string[]): void => {
    const baseline = readBaseline();
    const removed = Object.keys(baseline).filter((name) => !(name in observed));
    const regressed = Object.entries(observed).filter(
        ([name, status]) => baseline[name] === "green" && status === "red",
    );
    const fixed = Object.entries(observed).filter(([name, status]) => baseline[name] === "red" && status === "green");

    const failures: string[] = [];
    for (const name of removed) failures.push(`removed spec: ${name}`);
    for (const name of skipped) failures.push(`skipped spec: ${name}`);
    for (const [name] of regressed) failures.push(`regressed green to red: ${name}`);

    for (const [name] of fixed) process.stdout.write(`fixed: ${name}\n`);

    if (failures.length > 0) {
        for (const failure of failures) process.stderr.write(`${failure}\n`);
        process.stderr.write(
            `\nThe spec baseline is frozen. Specs may only move red to green.\n` +
                `Deleting, skipping, or weakening a spec is not a valid way to make the suite pass.\n` +
                `After implementing a behavior, re-record with: pnpm spec:record\n`,
        );
        process.exit(1);
    }

    process.stdout.write(
        `Baseline holds: ${Object.keys(observed).length} specs, ${fixed.length} newly green, none removed or skipped.\n`,
    );
};

const { observed, skipped } = collect(runSuite());
if (process.argv.includes("--record")) {
    record(observed);
} else {
    check(observed, skipped);
}
