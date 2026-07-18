import * as Gio from "@gtkx/gi/gio";
import type * as GObject from "@gtkx/gi/gobject";
import { toKebabCase } from "@gtkx/utils";
import type { ObjectProp } from "../utils/object-prop.js";
import { useObjectAttachment } from "./use-object-attachment.js";
import { type SchemaRef, useSettingsInstance } from "./use-setting.js";

export function useBindSetting<K extends object, P extends keyof K & string>(
    schema: SchemaRef<K>,
    key: P,
    object: ObjectProp<GObject.Object>,
    property: string,
    flags?: Gio.SettingsBindFlags,
): void;
export function useBindSetting(
    schema: SchemaRef,
    key: string,
    object: ObjectProp<GObject.Object>,
    property: string,
    flags: Gio.SettingsBindFlags = Gio.SettingsBindFlags.DEFAULT,
): void {
    const settings = useSettingsInstance(schema);
    const propertyName = toKebabCase(property);

    useObjectAttachment<GObject.Object, GObject.Object>(object, {
        attach: (obj) => {
            settings.bind(key, obj, propertyName, flags);
            return obj;
        },
        detach: (obj) => {
            Gio.Settings.unbind(obj, propertyName);
        },
        isSame: (attachment, current) => attachment === current,
    });
}
