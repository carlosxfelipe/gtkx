type CallbackAction = "connect" | "disconnect" | "none";

type CallbackChange<T> = {
    callback: T | undefined;
    action: CallbackAction;
};

export const getCallbackChange = <T>(oldCallback: T | undefined, newCallback: T | undefined): CallbackChange<T> => {
    if (oldCallback === newCallback) {
        return { callback: newCallback, action: "none" };
    }

    if (oldCallback && !newCallback) {
        return { callback: undefined, action: "disconnect" };
    }

    if (!oldCallback && newCallback) {
        return { callback: newCallback, action: "connect" };
    }

    return { callback: newCallback, action: "none" };
};
