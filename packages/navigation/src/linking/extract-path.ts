const matchPrefix = (prefix: string, url: string): string | undefined => {
    const separator = prefix.indexOf("://");
    if (separator === -1) return undefined;
    const scheme = prefix.slice(0, separator);
    const host = prefix.slice(separator + 3).replace(/\/+$/, "");
    if (!url.toLowerCase().startsWith(`${scheme.toLowerCase()}://`)) return undefined;

    const remainder = url.slice(scheme.length + 3);
    if (host !== "") {
        if (!remainder.toLowerCase().startsWith(host.toLowerCase())) return undefined;
        return `/${remainder.slice(host.length).replace(/^\/+/, "")}`;
    }
    return `/${remainder.replace(/^\/+/, "")}`;
};

export const extractPathFromURL = (prefixes: string[], url: string): string | undefined => {
    for (const prefix of prefixes) {
        const path = matchPrefix(prefix, url);
        if (path !== undefined) return path;
    }
    return undefined;
};
