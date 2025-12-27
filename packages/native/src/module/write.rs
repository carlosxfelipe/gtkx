//! Field writing to boxed/structured memory.
//!
//! The [`write`] function writes a value to a field in a boxed type at a
//! given byte offset. This enables JavaScript to modify struct fields that
//! aren't exposed via GTK property mutators.
//!
//! ## Supported Types
//!
//! Currently limited to primitive types:
//! - `Integer` (all sizes and signs)
//! - `Float` (f32, f64)
//! - `Boolean`

use std::sync::mpsc;

use anyhow::bail;
use neon::prelude::*;

use crate::{
    gtk_dispatch,
    object::ObjectId,
    types::{FloatSize, IntegerSign, IntegerSize, Type},
    value::Value,
};

pub fn write(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let object_id = cx.argument::<JsBox<ObjectId>>(0)?;
    let js_type = cx.argument::<JsObject>(1)?;
    let offset = cx.argument::<JsNumber>(2)?.value(&mut cx) as usize;
    let js_value = cx.argument::<JsValue>(3)?;
    let type_ = Type::from_js_value(&mut cx, js_type.upcast())?;
    let value = Value::from_js_value(&mut cx, js_value)?;
    let object_id = *object_id.as_inner();
    let (tx, rx) = mpsc::channel::<anyhow::Result<()>>();

    gtk_dispatch::schedule(move || {
        let _ = tx.send(handle_write(object_id, &type_, offset, &value));
    });

    rx.recv()
        .or_else(|err| cx.throw_error(format!("Error receiving write result: {err}")))?
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
            dispatch_integer_write!(int_type, field_ptr, *n);
        }
        (Type::Float(float_type), Value::Number(n)) => match float_type.size {
            FloatSize::_32 => unsafe { field_ptr.cast::<f32>().write_unaligned(*n as f32) },
            FloatSize::_64 => unsafe { field_ptr.cast::<f64>().write_unaligned(*n) },
        },
        (Type::Boolean, Value::Boolean(b)) => unsafe {
            field_ptr.cast::<u8>().write_unaligned(u8::from(*b));
        },
        _ => bail!("Unsupported field type for write: {:?}", type_),
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::boxed::Boxed;
    use crate::object::Object;
    use crate::test_utils;
    use crate::types::{FloatType, IntegerSign, IntegerType};
    use std::ffi::c_void;

    #[repr(C)]
    struct TestWriteStruct {
        int8_field: i8,
        uint8_field: u8,
        int16_field: i16,
        uint16_field: u16,
        int32_field: i32,
        uint32_field: u32,
        int64_field: i64,
        uint64_field: u64,
        float32_field: f32,
        float64_field: f64,
        bool_field: u8,
    }

    fn create_test_write_struct() -> Box<TestWriteStruct> {
        Box::new(TestWriteStruct {
            int8_field: 0,
            uint8_field: 0,
            int16_field: 0,
            uint16_field: 0,
            int32_field: 0,
            uint32_field: 0,
            int64_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
        })
    }

    #[test]
    fn handle_write_integer_i8() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_8,
            sign: IntegerSign::Signed,
        });

        let offset = std::mem::offset_of!(TestWriteStruct, int8_field);
        let result = handle_write(object_id, &int_type, offset, &Value::Number(-42.0));

        assert!(result.is_ok());
        assert_eq!(test_struct.int8_field, -42);
    }

    #[test]
    fn handle_write_integer_u8() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_8,
            sign: IntegerSign::Unsigned,
        });

        let offset = std::mem::offset_of!(TestWriteStruct, uint8_field);
        let result = handle_write(object_id, &int_type, offset, &Value::Number(200.0));

        assert!(result.is_ok());
        assert_eq!(test_struct.uint8_field, 200);
    }

    #[test]
    fn handle_write_integer_i16() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_16,
            sign: IntegerSign::Signed,
        });

        let offset = std::mem::offset_of!(TestWriteStruct, int16_field);
        let result = handle_write(object_id, &int_type, offset, &Value::Number(-1234.0));

        assert!(result.is_ok());
        assert_eq!(test_struct.int16_field, -1234);
    }

    #[test]
    fn handle_write_integer_i32() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_32,
            sign: IntegerSign::Signed,
        });

        let offset = std::mem::offset_of!(TestWriteStruct, int32_field);
        let result = handle_write(object_id, &int_type, offset, &Value::Number(-123456.0));

        assert!(result.is_ok());
        assert_eq!(test_struct.int32_field, -123456);
    }

    #[test]
    fn handle_write_integer_u64() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_64,
            sign: IntegerSign::Unsigned,
        });

        let offset = std::mem::offset_of!(TestWriteStruct, uint64_field);
        let result = handle_write(object_id, &int_type, offset, &Value::Number(9999999999.0));

        assert!(result.is_ok());
        assert_eq!(test_struct.uint64_field, 9999999999);
    }

    #[test]
    fn handle_write_float_f32() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let float_type = Type::Float(FloatType {
            size: FloatSize::_32,
        });

        let offset = std::mem::offset_of!(TestWriteStruct, float32_field);
        let result = handle_write(object_id, &float_type, offset, &Value::Number(3.14));

        assert!(result.is_ok());
        assert!((test_struct.float32_field - 3.14).abs() < 0.001);
    }

    #[test]
    fn handle_write_float_f64() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let float_type = Type::Float(FloatType {
            size: FloatSize::_64,
        });

        let offset = std::mem::offset_of!(TestWriteStruct, float64_field);
        let result = handle_write(object_id, &float_type, offset, &Value::Number(2.718281828));

        assert!(result.is_ok());
        assert!((test_struct.float64_field - 2.718281828).abs() < 0.0000001);
    }

    #[test]
    fn handle_write_boolean_true() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let offset = std::mem::offset_of!(TestWriteStruct, bool_field);
        let result = handle_write(object_id, &Type::Boolean, offset, &Value::Boolean(true));

        assert!(result.is_ok());
        assert_eq!(test_struct.bool_field, 1);
    }

    #[test]
    fn handle_write_boolean_false() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        test_struct.bool_field = 1;
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let offset = std::mem::offset_of!(TestWriteStruct, bool_field);
        let result = handle_write(object_id, &Type::Boolean, offset, &Value::Boolean(false));

        assert!(result.is_ok());
        assert_eq!(test_struct.bool_field, 0);
    }

    #[test]
    fn handle_write_unsupported_type_error() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let result = handle_write(object_id, &Type::Undefined, 0, &Value::Null);

        assert!(result.is_err());
    }

    #[test]
    fn handle_write_type_mismatch_error() {
        test_utils::ensure_gtk_init();

        let mut test_struct = create_test_write_struct();
        let ptr = test_struct.as_mut() as *mut TestWriteStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_32,
            sign: IntegerSign::Signed,
        });

        let result = handle_write(object_id, &int_type, 0, &Value::Boolean(true));

        assert!(result.is_err());
    }
}
