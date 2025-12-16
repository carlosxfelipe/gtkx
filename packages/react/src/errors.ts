export class GTKXError extends Error {
    constructor(
        message: string,
        public widgetType?: string,
        public componentStack?: string,
    ) {
        super(message);
        this.name = "GTKXError";

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GTKXError);
        }
    }

    override toString(): string {
        const parts = [`GTKXError: ${this.message}`];

        if (this.widgetType) {
            parts.push(`Widget Type: ${this.widgetType}`);
        }

        if (this.componentStack) {
            parts.push(`Component Stack:\n${this.componentStack}`);
        }

        return parts.join("\n");
    }
}

export function formatRenderError(error: unknown, widgetType?: string): GTKXError {
    if (error instanceof GTKXError) {
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const formattedMessage = widgetType ? `Failed to render ${widgetType}: ${message}` : `Render error: ${message}`;

    return new GTKXError(formattedMessage, widgetType);
}

export function formatBoundaryError(error: unknown): GTKXError {
    if (error instanceof GTKXError) {
        return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new GTKXError(`Error caught by boundary: ${message}`);
}
