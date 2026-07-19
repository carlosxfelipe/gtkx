import * as Gio from "@gtkx/gi/gio";
import { ApplicationContext } from "@gtkx/react/internal";
import type { ParamListBase } from "@react-navigation/core";
import { use, useEffect } from "react";
import { resolvePrefixes } from "./default-prefix.js";
import { uriFilesFromArgv } from "./initial-url.js";
import type { LinkingOptions } from "./types.js";

export const useDeliverArgvURIs = <ParamList extends ParamListBase>(
    options: LinkingOptions<ParamList> | undefined,
): void => {
    const application = use(ApplicationContext);

    useEffect(() => {
        if (!application || !options || options.enabled === false) return;
        if (!application.getIsRegistered()) return;
        if (!application.getIsRemote()) return;
        if ((application.getFlags() & Gio.ApplicationFlags.HANDLES_OPEN) === 0) return;
        const files = uriFilesFromArgv(resolvePrefixes(options.prefixes));
        if (files.length === 0) return;
        application.open(files, "");
    }, [application, options]);
};
