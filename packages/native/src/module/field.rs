//! Field access for boxed/structured memory.
//!
//! This module provides read and write access to fields in boxed types at given
//! byte offsets. This enables JavaScript to access struct fields that aren't
//! exposed via GTK property accessors.
//!
//! ## Read Types
//!
//! - `Integer` (all sizes and signs)
//! - `Float` (f32, f64)
//! - `Boolean`
//! - `String` (as pointer to C string)
//! - `GObject` (as pointer to object)
//! - `Boxed` (as pointer to boxed value)
//!
//! ## Write Types
//!
//! Currently limited to primitive types:
//! - `Integer` (all sizes and signs)
//! - `Float` (f32, f64)
//! - `Boolean`

use std::ffi::{CStr, c_void};

use anyhow::bail;
use gtk4::glib::{self, translate::FromGlibPtrNone as _};
use neon::prelude::*;

use crate::{
    gtk_dispatch,
    managed::{Boxed, ManagedValue, ObjectId},
    types::Type,
    value::Value,
};

pub fn read(mut cx: FunctionContext) -> JsResult<JsValue> {
    let object_id = cx.argument::<JsBox<ObjectId>>(0)?;
    let js_type = cx.argument::<JsObject>(1)?;
    let offset = cx.argument::<JsNumber>(2)?.value(&mut cx) as usize;
    let ty = Type::from_js_value(&mut cx, js_type.upcast())?;
    let object_id = *object_id.as_inner();

    let rx = gtk_dispatch::GtkDispatcher::global()
        .run_on_gtk_thread(move || handle_read(object_id, &ty, offset));

    let value = rx
        .recv()
        .or_else(|err| cx.throw_error(format!("Error receiving read result: {err}")))?
        .or_else(|err| cx.throw_error(format!("Error during read: {err}")))?;

    value.to_js_value(&mut cx)
}

fn handle_read(object_id: ObjectId, ty: &Type, offset: usize) -> anyhow::Result<Value> {
    let field_ptr = object_id.field_ptr_const(offset)?;

    match ty {
        Type::Integer(int_kind) => {
            let number = int_kind.read_ptr(field_ptr);
            Ok(Value::Number(number))
        }
        Type::Float(float_kind) => {
            let number = float_kind.read_ptr(field_ptr);
            Ok(Value::Number(number))
        }
        Type::Boolean => {
            let value = unsafe { field_ptr.cast::<u8>().read_unaligned() != 0 };
            Ok(Value::Boolean(value))
        }
        Type::String(_) => {
            let str_ptr = unsafe { field_ptr.cast::<*const i8>().read_unaligned() };

            if str_ptr.is_null() {
                return Ok(Value::Null);
            }

            let c_str = unsafe { CStr::from_ptr(str_ptr) };
            let string = c_str.to_str()?.to_string();
            Ok(Value::String(string))
        }
        Type::GObject(_) => {
            let obj_ptr = unsafe {
                field_ptr
                    .cast::<*mut glib::gobject_ffi::GObject>()
                    .read_unaligned()
            };

            if obj_ptr.is_null() {
                return Ok(Value::Null);
            }

            let object = unsafe { glib::Object::from_glib_none(obj_ptr) };
            Ok(Value::Object(ManagedValue::GObject(object).into()))
        }
        Type::Boxed(boxed_type) => {
            let boxed_ptr = unsafe { field_ptr.cast::<*mut c_void>().read_unaligned() };

            if boxed_ptr.is_null() {
                return Ok(Value::Null);
            }

            let gtype = boxed_type.gtype();
            let boxed = Boxed::from_glib_none(gtype, boxed_ptr)?;
            Ok(Value::Object(ManagedValue::Boxed(boxed).into()))
        }
        _ => bail!("Unsupported field type for read: {:?}", ty),
    }
}

pub fn write(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let object_id = cx.argument::<JsBox<ObjectId>>(0)?;
    let js_type = cx.argument::<JsObject>(1)?;
    let offset = cx.argument::<JsNumber>(2)?.value(&mut cx) as usize;
    let js_value = cx.argument::<JsValue>(3)?;
    let ty = Type::from_js_value(&mut cx, js_type.upcast())?;
    let value = Value::from_js_value(&mut cx, js_value)?;
    let object_id = *object_id.as_inner();

    let rx = gtk_dispatch::GtkDispatcher::global()
        .run_on_gtk_thread(move || handle_write(object_id, &ty, offset, &value));

    rx.recv()
        .or_else(|err| cx.throw_error(format!("Error receiving write result: {err}")))?
        .or_else(|err| cx.throw_error(format!("Error during write: {err}")))?;

    Ok(cx.undefined())
}

fn handle_write(
    object_id: ObjectId,
    ty: &Type,
    offset: usize,
    value: &Value,
) -> anyhow::Result<()> {
    let field_ptr = object_id.field_ptr(offset)?;

    match (ty, value) {
        (Type::Integer(int_kind), Value::Number(n)) => {
            int_kind.write_ptr(field_ptr, *n);
        }
        (Type::Float(float_kind), Value::Number(n)) => {
            float_kind.write_ptr(field_ptr, *n);
        }
        (Type::Boolean, Value::Boolean(b)) => unsafe {
            field_ptr.cast::<u8>().write_unaligned(u8::from(*b));
        },
        _ => bail!("Unsupported field type for write: {:?}", ty),
    }

    Ok(())
}
