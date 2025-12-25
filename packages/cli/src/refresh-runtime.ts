import RefreshRuntime from "react-refresh/runtime";

type ComponentType = (...args: unknown[]) => unknown;

RefreshRuntime.injectIntoGlobalHook(globalThis);
globalThis.$RefreshReg$ = () => {};
globalThis.$RefreshSig$ = () => (type: unknown) => type;

export function createModuleRegistration(moduleId: string): {
    $RefreshReg$: (type: ComponentType, id: string) => void;
    $RefreshSig$: typeof RefreshRuntime.createSignatureFunctionForTransform;
} {
    return {
        $RefreshReg$: (type: ComponentType, id: string) => {
            RefreshRuntime.register(type, `${moduleId} ${id}`);
        },
        $RefreshSig$: RefreshRuntime.createSignatureFunctionForTransform,
    };
}

function isLikelyComponentType(value: unknown): boolean {
    if (typeof value !== "function") {
        return false;
    }

    const func = value as { $$typeof?: symbol };

    if (func.$$typeof === Symbol.for("react.memo") || func.$$typeof === Symbol.for("react.forward_ref")) {
        return true;
    }

    const name = (value as { name?: string }).name;
    if (typeof name === "string" && /^[A-Z]/.test(name)) {
        return true;
    }

    return false;
}

export function isReactRefreshBoundary(moduleExports: Record<string, unknown>): boolean {
    if (RefreshRuntime.isLikelyComponentType(moduleExports)) {
        return true;
    }

    for (const key in moduleExports) {
        if (key === "__esModule") {
            continue;
        }

        const value = moduleExports[key];

        if (!isLikelyComponentType(value)) {
            return false;
        }
    }

    return Object.keys(moduleExports).filter((k) => k !== "__esModule").length > 0;
}

export function performRefresh(): void {
    RefreshRuntime.performReactRefresh();
}
