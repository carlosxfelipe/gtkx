export type Token = { t: string; c?: string };

const KEYWORDS = new Set([
    "import",
    "from",
    "export",
    "default",
    "function",
    "return",
    "const",
    "let",
    "var",
    "async",
    "await",
    "new",
    "if",
    "else",
    "for",
    "of",
    "in",
    "while",
    "switch",
    "case",
    "break",
    "continue",
    "class",
    "extends",
    "implements",
    "interface",
    "type",
    "enum",
    "typeof",
    "instanceof",
    "as",
    "yield",
    "true",
    "false",
    "null",
    "undefined",
    "void",
    "this",
]);

const isIdentStart = (ch: string): boolean => /[A-Za-z_$]/.test(ch);
const isIdent = (ch: string): boolean => /[A-Za-z0-9_$]/.test(ch);

const tokenizeLine = (line: string): Token[] => {
    const toks: Token[] = [];
    const push = (t: string, c?: string): void => {
        if (t) toks.push(c ? { t, c } : { t });
    };
    const n = line.length;
    let i = 0;
    let plain = "";
    const flush = (): void => {
        if (plain) {
            push(plain);
            plain = "";
        }
    };

    while (i < n) {
        const ch = line[i];
        const next = line[i + 1] ?? "";

        if (ch === "/" && next === "/") {
            flush();
            push(line.slice(i), "comment");
            break;
        }

        if (ch === '"' || ch === "'" || ch === "`") {
            flush();
            let j = i + 1;
            while (j < n && line[j] !== ch) {
                if (line[j] === "\\") j++;
                j++;
            }
            push(line.slice(i, Math.min(j + 1, n)), "str");
            i = j + 1;
            continue;
        }

        if (ch === "<" && (next === "/" || isIdentStart(next))) {
            flush();
            if (next === "/") {
                push("</", "punct");
                i += 2;
            } else {
                push("<", "punct");
                i += 1;
            }
            let j = i;
            while (j < n && (isIdent(line[j]) || line[j] === ".")) j++;
            push(line.slice(i, j), "tag");
            i = j;
            continue;
        }

        if (ch === "/" && next === ">") {
            flush();
            push("/>", "punct");
            i += 2;
            continue;
        }

        if (ch === ">") {
            flush();
            push(">", "punct");
            i += 1;
            continue;
        }

        if (isIdentStart(ch)) {
            flush();
            let j = i;
            while (j < n && isIdent(line[j])) j++;
            const word = line.slice(i, j);
            let k = j;
            while (k < n && line[k] === " ") k++;
            if (KEYWORDS.has(word)) push(word, "kw");
            else if (line[k] === "(") push(word, "fn");
            else push(word);
            i = j;
            continue;
        }

        plain += ch;
        i++;
    }
    flush();
    return toks;
};

export const tokenizeCode = (code: string): Token[][] =>
    String(code)
        .replace(/\n$/, "")
        .split("\n")
        .map(tokenizeLine);
