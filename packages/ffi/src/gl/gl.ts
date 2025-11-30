/**
 * OpenGL function bindings via libGL.
 * These wrap raw OpenGL calls for use in GtkGLArea render handlers.
 */

import { call, createRef } from "@gtkx/native";

const LIB = "libGL.so.1";

// ============================================================================
// Basic Operations
// ============================================================================

/**
 * Clear buffers to preset values.
 * @param mask - Bitwise OR of masks indicating buffers to clear (GL_COLOR_BUFFER_BIT, GL_DEPTH_BUFFER_BIT, etc.)
 */
export function glClear(mask: number): void {
    call(LIB, "glClear", [{ type: { type: "int", size: 32, unsigned: true }, value: mask }], { type: "undefined" });
}

/**
 * Specify clear values for the color buffers.
 */
export function glClearColor(red: number, green: number, blue: number, alpha: number): void {
    call(
        LIB,
        "glClearColor",
        [
            { type: { type: "float", size: 32 }, value: red },
            { type: { type: "float", size: 32 }, value: green },
            { type: { type: "float", size: 32 }, value: blue },
            { type: { type: "float", size: 32 }, value: alpha },
        ],
        { type: "undefined" },
    );
}

/**
 * Set the viewport.
 */
export function glViewport(x: number, y: number, width: number, height: number): void {
    call(
        LIB,
        "glViewport",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: x },
            { type: { type: "int", size: 32, unsigned: false }, value: y },
            { type: { type: "int", size: 32, unsigned: false }, value: width },
            { type: { type: "int", size: 32, unsigned: false }, value: height },
        ],
        { type: "undefined" },
    );
}

/**
 * Enable server-side GL capabilities.
 */
export function glEnable(cap: number): void {
    call(LIB, "glEnable", [{ type: { type: "int", size: 32, unsigned: true }, value: cap }], { type: "undefined" });
}

/**
 * Disable server-side GL capabilities.
 */
export function glDisable(cap: number): void {
    call(LIB, "glDisable", [{ type: { type: "int", size: 32, unsigned: true }, value: cap }], { type: "undefined" });
}

/**
 * Specify the clear value for the depth buffer.
 */
export function glClearDepth(depth: number): void {
    call(LIB, "glClearDepth", [{ type: { type: "float", size: 64 }, value: depth }], { type: "undefined" });
}

/**
 * Specify the value used for depth buffer comparisons.
 */
export function glDepthFunc(func: number): void {
    call(LIB, "glDepthFunc", [{ type: { type: "int", size: 32, unsigned: true }, value: func }], { type: "undefined" });
}

// ============================================================================
// Shader Operations
// ============================================================================

/**
 * Creates a shader object.
 * @param type - GL_VERTEX_SHADER or GL_FRAGMENT_SHADER
 * @returns Shader object ID
 */
export function glCreateShader(type: number): number {
    return call(LIB, "glCreateShader", [{ type: { type: "int", size: 32, unsigned: true }, value: type }], {
        type: "int",
        size: 32,
        unsigned: true,
    }) as number;
}

/**
 * Replaces the source code in a shader object.
 * Note: This simplified version passes a single null-terminated string.
 */
export function glShaderSource(shader: number, source: string): void {
    // glShaderSource takes (shader, count, string**, length*)
    // We pass the source as an array of strings, which the FFI will convert to char**
    call(
        LIB,
        "glShaderSource",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: shader },
            { type: { type: "int", size: 32, unsigned: false }, value: 1 },
            { type: { type: "array", itemType: { type: "string" } }, value: [source] },
            { type: { type: "int", size: 64, unsigned: true }, value: 0 }, // NULL for length (null-terminated)
        ],
        { type: "undefined" },
    );
}

/**
 * Compiles a shader object.
 */
export function glCompileShader(shader: number): void {
    call(LIB, "glCompileShader", [{ type: { type: "int", size: 32, unsigned: true }, value: shader }], {
        type: "undefined",
    });
}

/**
 * Returns a parameter from a shader object.
 */
export function glGetShaderiv(shader: number, pname: number): number {
    const params = createRef(0);
    call(
        LIB,
        "glGetShaderiv",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: shader },
            { type: { type: "int", size: 32, unsigned: true }, value: pname },
            { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: params },
        ],
        { type: "undefined" },
    );
    return params.value;
}

/**
 * Returns the information log for a shader object.
 */
export function glGetShaderInfoLog(shader: number, _maxLength: number): string {
    // For now, we'll use a simplified approach - just get the length
    // and return an empty string if there's no log
    // This is a limitation we may need to address with native code
    const logLength = glGetShaderiv(shader, 0x8b84); // GL_INFO_LOG_LENGTH
    if (logLength <= 0) {
        return "";
    }

    // Unfortunately, getting the actual log string requires more complex memory handling
    // For now, return a generic message
    return `Shader info log length: ${logLength} (use console.error for details)`;
}

/**
 * Deletes a shader object.
 */
export function glDeleteShader(shader: number): void {
    call(LIB, "glDeleteShader", [{ type: { type: "int", size: 32, unsigned: true }, value: shader }], {
        type: "undefined",
    });
}

// ============================================================================
// Program Operations
// ============================================================================

/**
 * Creates a program object.
 */
export function glCreateProgram(): number {
    return call(LIB, "glCreateProgram", [], { type: "int", size: 32, unsigned: true }) as number;
}

/**
 * Attaches a shader object to a program object.
 */
export function glAttachShader(program: number, shader: number): void {
    call(
        LIB,
        "glAttachShader",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: program },
            { type: { type: "int", size: 32, unsigned: true }, value: shader },
        ],
        { type: "undefined" },
    );
}

/**
 * Links a program object.
 */
export function glLinkProgram(program: number): void {
    call(LIB, "glLinkProgram", [{ type: { type: "int", size: 32, unsigned: true }, value: program }], {
        type: "undefined",
    });
}

/**
 * Installs a program object as part of current rendering state.
 */
export function glUseProgram(program: number): void {
    call(LIB, "glUseProgram", [{ type: { type: "int", size: 32, unsigned: true }, value: program }], {
        type: "undefined",
    });
}

/**
 * Returns a parameter from a program object.
 */
export function glGetProgramiv(program: number, pname: number): number {
    const params = createRef(0);
    call(
        LIB,
        "glGetProgramiv",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: program },
            { type: { type: "int", size: 32, unsigned: true }, value: pname },
            { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: false } }, value: params },
        ],
        { type: "undefined" },
    );
    return params.value;
}

/**
 * Returns the information log for a program object.
 */
export function glGetProgramInfoLog(program: number, _maxLength: number): string {
    const logLength = glGetProgramiv(program, 0x8b84); // GL_INFO_LOG_LENGTH
    if (logLength <= 0) {
        return "";
    }
    return `Program info log length: ${logLength} (use console.error for details)`;
}

/**
 * Deletes a program object.
 */
export function glDeleteProgram(program: number): void {
    call(LIB, "glDeleteProgram", [{ type: { type: "int", size: 32, unsigned: true }, value: program }], {
        type: "undefined",
    });
}

// ============================================================================
// Uniform Operations
// ============================================================================

/**
 * Returns the location of a uniform variable.
 */
export function glGetUniformLocation(program: number, name: string): number {
    return call(
        LIB,
        "glGetUniformLocation",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: program },
            { type: { type: "string" }, value: name },
        ],
        { type: "int", size: 32, unsigned: false },
    ) as number;
}

/**
 * Specify the value of a uniform variable (1 float).
 */
export function glUniform1f(location: number, v0: number): void {
    call(
        LIB,
        "glUniform1f",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: location },
            { type: { type: "float", size: 32 }, value: v0 },
        ],
        { type: "undefined" },
    );
}

/**
 * Specify the value of a uniform variable (2 floats).
 */
export function glUniform2f(location: number, v0: number, v1: number): void {
    call(
        LIB,
        "glUniform2f",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: location },
            { type: { type: "float", size: 32 }, value: v0 },
            { type: { type: "float", size: 32 }, value: v1 },
        ],
        { type: "undefined" },
    );
}

/**
 * Specify the value of a uniform variable (3 floats).
 */
export function glUniform3f(location: number, v0: number, v1: number, v2: number): void {
    call(
        LIB,
        "glUniform3f",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: location },
            { type: { type: "float", size: 32 }, value: v0 },
            { type: { type: "float", size: 32 }, value: v1 },
            { type: { type: "float", size: 32 }, value: v2 },
        ],
        { type: "undefined" },
    );
}

/**
 * Specify the value of a uniform variable (4 floats).
 */
export function glUniform4f(location: number, v0: number, v1: number, v2: number, v3: number): void {
    call(
        LIB,
        "glUniform4f",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: location },
            { type: { type: "float", size: 32 }, value: v0 },
            { type: { type: "float", size: 32 }, value: v1 },
            { type: { type: "float", size: 32 }, value: v2 },
            { type: { type: "float", size: 32 }, value: v3 },
        ],
        { type: "undefined" },
    );
}

/**
 * Specify the value of a uniform variable (1 int).
 */
export function glUniform1i(location: number, v0: number): void {
    call(
        LIB,
        "glUniform1i",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: location },
            { type: { type: "int", size: 32, unsigned: false }, value: v0 },
        ],
        { type: "undefined" },
    );
}

/**
 * Specify the value of a 4x4 matrix uniform variable.
 */
export function glUniformMatrix4fv(location: number, count: number, transpose: boolean, value: number[]): void {
    call(
        LIB,
        "glUniformMatrix4fv",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: location },
            { type: { type: "int", size: 32, unsigned: false }, value: count },
            { type: { type: "boolean" }, value: transpose },
            { type: { type: "array", itemType: { type: "float", size: 32 } }, value },
        ],
        { type: "undefined" },
    );
}

// ============================================================================
// Vertex Array and Buffer Operations
// ============================================================================

/**
 * Generate a single vertex array object name.
 */
export function glGenVertexArray(): number {
    const array = createRef(0);
    call(
        LIB,
        "glGenVertexArrays",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: 1 },
            { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: true } }, value: array },
        ],
        { type: "undefined" },
    );
    return array.value;
}

/**
 * Bind a vertex array object.
 */
export function glBindVertexArray(array: number): void {
    call(LIB, "glBindVertexArray", [{ type: { type: "int", size: 32, unsigned: true }, value: array }], {
        type: "undefined",
    });
}

/**
 * Delete a vertex array object.
 */
export function glDeleteVertexArray(array: number): void {
    call(
        LIB,
        "glDeleteVertexArrays",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: 1 },
            { type: { type: "array", itemType: { type: "int", size: 32, unsigned: true } }, value: [array] },
        ],
        { type: "undefined" },
    );
}

/**
 * Generate a single buffer object name.
 */
export function glGenBuffer(): number {
    const buffer = createRef(0);
    call(
        LIB,
        "glGenBuffers",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: 1 },
            { type: { type: "ref", innerType: { type: "int", size: 32, unsigned: true } }, value: buffer },
        ],
        { type: "undefined" },
    );
    return buffer.value;
}

/**
 * Bind a named buffer object.
 */
export function glBindBuffer(target: number, buffer: number): void {
    call(
        LIB,
        "glBindBuffer",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: target },
            { type: { type: "int", size: 32, unsigned: true }, value: buffer },
        ],
        { type: "undefined" },
    );
}

/**
 * Delete a buffer object.
 */
export function glDeleteBuffer(buffer: number): void {
    call(
        LIB,
        "glDeleteBuffers",
        [
            { type: { type: "int", size: 32, unsigned: false }, value: 1 },
            { type: { type: "array", itemType: { type: "int", size: 32, unsigned: true } }, value: [buffer] },
        ],
        { type: "undefined" },
    );
}

/**
 * Creates and initializes a buffer object's data store.
 * @param target - Buffer target (GL_ARRAY_BUFFER, GL_ELEMENT_ARRAY_BUFFER, etc.)
 * @param data - Array of float values
 * @param usage - Usage hint (GL_STATIC_DRAW, GL_DYNAMIC_DRAW, etc.)
 */
export function glBufferData(target: number, data: number[], usage: number): void {
    const size = data.length * 4; // 4 bytes per float
    call(
        LIB,
        "glBufferData",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: target },
            { type: { type: "int", size: 64, unsigned: false }, value: size },
            { type: { type: "array", itemType: { type: "float", size: 32 } }, value: data },
            { type: { type: "int", size: 32, unsigned: true }, value: usage },
        ],
        { type: "undefined" },
    );
}

/**
 * Define an array of generic vertex attribute data.
 */
export function glVertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
): void {
    call(
        LIB,
        "glVertexAttribPointer",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: index },
            { type: { type: "int", size: 32, unsigned: false }, value: size },
            { type: { type: "int", size: 32, unsigned: true }, value: type },
            { type: { type: "boolean" }, value: normalized },
            { type: { type: "int", size: 32, unsigned: false }, value: stride },
            { type: { type: "int", size: 64, unsigned: true }, value: offset },
        ],
        { type: "undefined" },
    );
}

/**
 * Enable a generic vertex attribute array.
 */
export function glEnableVertexAttribArray(index: number): void {
    call(LIB, "glEnableVertexAttribArray", [{ type: { type: "int", size: 32, unsigned: true }, value: index }], {
        type: "undefined",
    });
}

/**
 * Disable a generic vertex attribute array.
 */
export function glDisableVertexAttribArray(index: number): void {
    call(LIB, "glDisableVertexAttribArray", [{ type: { type: "int", size: 32, unsigned: true }, value: index }], {
        type: "undefined",
    });
}

// ============================================================================
// Drawing Operations
// ============================================================================

/**
 * Render primitives from array data.
 */
export function glDrawArrays(mode: number, first: number, count: number): void {
    call(
        LIB,
        "glDrawArrays",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: mode },
            { type: { type: "int", size: 32, unsigned: false }, value: first },
            { type: { type: "int", size: 32, unsigned: false }, value: count },
        ],
        { type: "undefined" },
    );
}

/**
 * Render primitives from array data with indices.
 */
export function glDrawElements(mode: number, count: number, type: number, offset: number): void {
    call(
        LIB,
        "glDrawElements",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: mode },
            { type: { type: "int", size: 32, unsigned: false }, value: count },
            { type: { type: "int", size: 32, unsigned: true }, value: type },
            { type: { type: "int", size: 64, unsigned: true }, value: offset },
        ],
        { type: "undefined" },
    );
}

// ============================================================================
// Attribute Operations
// ============================================================================

/**
 * Returns the location of an attribute variable.
 */
export function glGetAttribLocation(program: number, name: string): number {
    return call(
        LIB,
        "glGetAttribLocation",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: program },
            { type: { type: "string" }, value: name },
        ],
        { type: "int", size: 32, unsigned: false },
    ) as number;
}

/**
 * Associate a generic vertex attribute index with a named attribute variable.
 */
export function glBindAttribLocation(program: number, index: number, name: string): void {
    call(
        LIB,
        "glBindAttribLocation",
        [
            { type: { type: "int", size: 32, unsigned: true }, value: program },
            { type: { type: "int", size: 32, unsigned: true }, value: index },
            { type: { type: "string" }, value: name },
        ],
        { type: "undefined" },
    );
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Return error information.
 */
export function glGetError(): number {
    return call(LIB, "glGetError", [], { type: "int", size: 32, unsigned: true }) as number;
}
