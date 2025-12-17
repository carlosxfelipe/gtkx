import { start, stop } from "../index.js";

export const GTK_LIB = "libgtk-4.so.1";
export const GDK_LIB = "libgtk-4.so.1";
export const GOBJECT_LIB = "libgobject-2.0.so.0";
export const GLIB_LIB = "libglib-2.0.so.0";
export const GIO_LIB = "libgio-2.0.so.0";

const APP_ID = "com.gtkx.test.native";

let isInitialized = false;

export const initGtk = () => {
    if (isInitialized) return;
    start(APP_ID);
    isInitialized = true;
};

export const cleanupGtk = () => {
    if (isInitialized) {
        stop();
        isInitialized = false;
    }
};

initGtk();

export default async function globalSetup() {
    return async () => {
        cleanupGtk();
    };
}
