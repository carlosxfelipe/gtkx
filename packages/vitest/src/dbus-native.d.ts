import "@homebridge/dbus-native";

declare module "@homebridge/dbus-native" {
    export type InterfaceDescriptor = {
        name: string;
        methods: { [member: string]: [string, string, string[], string[]] };
        signals?: { [member: string]: [string, ...string[]] };
        properties?: { [name: string]: string };
    };

    export interface MessageBus {
        exportInterface(implementation: object, path: string, descriptor: InterfaceDescriptor): void;
        requestName(name: string, flags: number, callback: (error: Error | null, result?: number) => void): void;
    }

    export function sessionBus(options?: { busAddress?: string }): MessageBus;
}
