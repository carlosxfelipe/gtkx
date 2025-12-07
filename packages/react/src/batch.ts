type FlushCallback = () => void;

const pendingFlushes = new Set<FlushCallback>();
let inCommit = false;

export const beginCommit = (): void => {
    inCommit = true;
};

export const endCommit = (): void => {
    inCommit = false;
    for (const callback of pendingFlushes) {
        callback();
    }
    pendingFlushes.clear();
};

export const scheduleFlush = (callback: FlushCallback): void => {
    if (inCommit) {
        pendingFlushes.add(callback);
    } else {
        callback();
    }
};
