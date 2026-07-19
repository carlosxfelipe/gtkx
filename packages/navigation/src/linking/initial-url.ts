import * as Gio from "@gtkx/gi/gio";
import { extractPathFromURL } from "./extract-path.js";

export const getInitialURLFromArgv = (prefixes: string[], argv: string[] = process.argv): string | undefined =>
    argv.find((entry) => extractPathFromURL(prefixes, entry) !== undefined);

export const uriFilesFromArgv = (prefixes: string[], argv: string[] = process.argv): Gio.File[] =>
    argv.filter((entry) => extractPathFromURL(prefixes, entry) !== undefined).map((uri) => Gio.File.newForUri(uri));
