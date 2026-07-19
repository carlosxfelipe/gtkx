/// <reference types="@gtkx/config/env" />
import { applicationId } from "virtual:gtkx-config";

const URI_SCHEME = /^[a-z][a-z0-9+.-]*$/;

export const schemeFromApplicationId = (id: string): string | undefined => {
    const scheme = id.toLowerCase();
    return URI_SCHEME.test(scheme) ? scheme : undefined;
};

export const defaultPrefixes = (): string[] => {
    if (applicationId === null || applicationId === undefined) return [];
    const scheme = schemeFromApplicationId(applicationId);
    return scheme === undefined ? [] : [`${scheme}://`];
};

export const resolvePrefixes = (prefixes: string[] | undefined): string[] => prefixes ?? defaultPrefixes();
