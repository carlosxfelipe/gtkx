import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export type ListedFile = {
    absPath: string;
    rel: string;
};

export const listFilesRecursive = (dir: string, predicate?: (name: string) => boolean): ListedFile[] => {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && (predicate === undefined || predicate(entry.name)))
        .map((entry) => {
            const absPath = join(entry.parentPath, entry.name);
            return { absPath, rel: relative(dir, absPath) };
        });
};
