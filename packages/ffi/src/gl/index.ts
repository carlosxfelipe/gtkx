/**
 * OpenGL bindings via libGL for use with GtkGLArea.
 *
 * Example usage:
 * ```typescript
 * import * as GL from "@gtkx/ffi/gl";
 *
 * // In a render handler:
 * GL.glClearColor(0.5, 0.5, 0.5, 1.0);
 * GL.glClear(GL.GL_COLOR_BUFFER_BIT | GL.GL_DEPTH_BUFFER_BIT);
 * ```
 */

export * from "./constants.js";
export * from "./gl.js";
