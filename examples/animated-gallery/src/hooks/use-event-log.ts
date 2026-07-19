import { useCallback, useState } from "react";

export const useEventLog = (): { entries: string[]; log: (entry: string) => void } => {
    const [entries, setEntries] = useState<string[]>([]);

    const log = useCallback((entry: string) => {
        setEntries((current) => [entry, ...current].slice(0, 8));
    }, []);

    return { entries, log };
};
