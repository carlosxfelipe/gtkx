//! Field writing to native objects.

use anyhow::bail;
use neon::prelude::*;

use crate::{
    gtk_dispatch,
    object::ObjectId,
    types::Type,
    value::Value,
};

/// Writes a field to a native object at the given offset.
///
/// JavaScript signature: `write(objectId: ObjectId, type: Type, offset: number, value: Value) => void`
///
/// Writes a value of the specified type to the object's memory at the given
/// byte offset.
pub fn write(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let object_id = cx.argument::<JsBox<ObjectId>>(0)?;
    let js_type = cx.argument::<JsObject>(1)?;
    let offset = cx.argument::<JsNumber>(2)?.value(&mut cx) as usize;
    let js_value = cx.argument::<JsValue>(3)?;
    let type_ = Type::from_js_value(&mut cx, js_type.upcast())?;
    let value = Value::from_js_value(&mut cx, js_value)?;
    let object_id = *object_id.as_inner();

    gtk_dispatch::schedule_and_wait(move || handle_write(object_id, &type_, offset, &value))
        .or_else(|err| cx.throw_error(format!("Error during write: {err}")))?;

    Ok(cx.undefined())
}

fn handle_write(
    object_id: ObjectId,
    type_: &Type,
    offset: usize,
    value: &Value,
) -> anyhow::Result<()> {
    let ptr = object_id
        .as_ptr()
        .ok_or_else(|| anyhow::anyhow!("Object has been garbage collected"))?;

    if ptr.is_null() {
        bail!("Cannot write field to null pointer");
    }

    let field_ptr = unsafe { (ptr as *mut u8).add(offset) };

    match (type_, value) {
        (Type::Integer(int_type), Value::Number(n)) => {
            unsafe { int_type.write_to_ptr(field_ptr, *n) };
        }
        (Type::Float(float_type), Value::Number(n)) => {
            unsafe { float_type.write_to_ptr(field_ptr, *n) };
        }
        (Type::Boolean, Value::Boolean(b)) => unsafe {
            field_ptr.cast::<u8>().write_unaligned(u8::from(*b));
        },
        _ => bail!("Unsupported field type for write: {:?}", type_),
    }

    Ok(())
}
