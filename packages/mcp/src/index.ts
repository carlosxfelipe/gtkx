export { ConnectionManager } from "./connection-manager.js";
export {
    McpError,
    McpErrorCode,
    methodNotFoundError,
    widgetNotFoundError,
} from "./protocol/errors.js";
export {
    type AppInfo,
    DEFAULT_SOCKET_PATH,
    type IpcError,
    type IpcMethod,
    type IpcRequest,
    type IpcResponse,
    type QueryOptions,
    type SerializedWidget,
} from "./protocol/types.js";
export { type AppConnection, SocketServer } from "./socket-server.js";
