export enum McpErrorCode {
    INTERNAL_ERROR = 1000,
    NO_APP_CONNECTED = 1001,
    APP_NOT_FOUND = 1002,
    WIDGET_NOT_FOUND = 1003,
    WIDGET_NOT_INTERACTABLE = 1004,
    QUERY_TIMEOUT = 1005,
    INVALID_WIDGET_TYPE = 1006,
    SCREENSHOT_FAILED = 1007,
    IPC_TIMEOUT = 1008,
    SERIALIZATION_ERROR = 1009,
    INVALID_REQUEST = 1010,
    METHOD_NOT_FOUND = 1011,
}

export class McpError extends Error {
    readonly code: McpErrorCode;
    readonly data?: unknown;

    constructor(code: McpErrorCode, message: string, data?: unknown) {
        super(message);
        this.code = code;
        this.data = data;
        this.name = "McpError";

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, McpError);
        }
    }

    toIpcError(): { code: number; message: string; data?: unknown } {
        return {
            code: this.code,
            message: this.message,
            ...(this.data !== undefined && { data: this.data }),
        };
    }
}

export function noAppConnectedError(): McpError {
    return new McpError(
        McpErrorCode.NO_APP_CONNECTED,
        "No GTKX application connected. Start an app with 'gtkx dev' to connect.",
        { hint: "Run 'gtkx dev src/app.tsx' in your project directory" },
    );
}

export function appNotFoundError(appId: string): McpError {
    return new McpError(McpErrorCode.APP_NOT_FOUND, `Application '${appId}' not found`, { appId });
}

export function widgetNotFoundError(widgetId: string): McpError {
    return new McpError(McpErrorCode.WIDGET_NOT_FOUND, `Widget '${widgetId}' not found`, { widgetId });
}

export function ipcTimeoutError(timeout: number): McpError {
    return new McpError(McpErrorCode.IPC_TIMEOUT, `IPC request timed out after ${timeout}ms`, { timeout });
}

export function invalidRequestError(reason: string): McpError {
    return new McpError(McpErrorCode.INVALID_REQUEST, `Invalid request: ${reason}`, { reason });
}

export function methodNotFoundError(method: string): McpError {
    return new McpError(McpErrorCode.METHOD_NOT_FOUND, `Method '${method}' not found`, { method });
}
