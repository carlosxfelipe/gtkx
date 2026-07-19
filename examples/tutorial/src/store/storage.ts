import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const directory = join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "com.gtkx.tutorial");
const file = join(directory, "tasks.json");

export const fileStorage = {
    getItem: (): string | null => {
        try {
            return readFileSync(file, "utf8");
        } catch {
            return null;
        }
    },
    setItem: (_name: string, value: string): void => {
        mkdirSync(directory, { recursive: true });
        writeFileSync(`${file}.tmp`, value);
        renameSync(`${file}.tmp`, file);
    },
    removeItem: (): void => rmSync(file, { force: true }),
};
