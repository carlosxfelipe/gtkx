declare global {
    var $RefreshReg$: (type: unknown, id: string) => void;
    var $RefreshSig$: () => (type: unknown) => unknown;
}

export {};
