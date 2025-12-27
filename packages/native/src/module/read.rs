

use std::ffi::{CStr, c_void};
use std::sync::mpsc;

use anyhow::bail;
use gtk4::glib::{self, translate::FromGlibPtrNone as _};
use neon::prelude::*;

use crate::{
    boxed::Boxed,
    gtk_dispatch,
    object::{Object, ObjectId},
    types::{FloatSize, IntegerSign, IntegerSize, Type},
    value::Value,
};

pub fn read(mut cx: FunctionContext) -> JsResult<JsValue> {
    let object_id = cx.argument::<JsBox<ObjectId>>(0)?;
    let js_type = cx.argument::<JsObject>(1)?;
    let offset = cx.argument::<JsNumber>(2)?.value(&mut cx) as usize;
    let type_ = Type::from_js_value(&mut cx, js_type.upcast())?;
    let object_id = *object_id.as_inner();
    let (tx, rx) = mpsc::channel::<anyhow::Result<Value>>();

    gtk_dispatch::schedule(move || {
        let _ = tx.send(handle_read(object_id, &type_, offset));
    });

    let value = rx
        .recv()
        .or_else(|err| cx.throw_error(format!("Error receiving read result: {err}")))?
        .or_else(|err| cx.throw_error(format!("Error during read: {err}")))?;

    value.to_js_value(&mut cx)
}

fn handle_read(object_id: ObjectId, type_: &Type, offset: usize) -> anyhow::Result<Value> {
    let ptr = object_id
        .as_ptr()
        .ok_or_else(|| anyhow::anyhow!("Object has been garbage collected"))?;

    if ptr.is_null() {
        bail!("Cannot read field from null pointer");
    }

    let field_ptr = unsafe { (ptr as *const u8).add(offset) };

    match type_ {
        Type::Integer(int_type) => {
            let number = dispatch_integer_read!(int_type, field_ptr);
            Ok(Value::Number(number))
        }
        Type::Float(float_type) => {
            let number = match float_type.size {
                FloatSize::_32 => unsafe { field_ptr.cast::<f32>().read_unaligned() as f64 },
                FloatSize::_64 => unsafe { field_ptr.cast::<f64>().read_unaligned() },
            };

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
            Ok(Value::Object(ObjectId::new(Object::GObject(object))))
        }
        Type::Boxed(boxed_type) => {
            let boxed_ptr = unsafe { field_ptr.cast::<*mut c_void>().read_unaligned() };

            if boxed_ptr.is_null() {
                return Ok(Value::Null);
            }

            let gtype = boxed_type.get_gtype();
            let boxed = Boxed::from_glib_none(gtype, boxed_ptr);
            Ok(Value::Object(ObjectId::new(Object::Boxed(boxed))))
        }
        _ => bail!("Unsupported field type for read_field: {:?}", type_),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils;
    use crate::types::{BoxedType, FloatType, GObjectType, IntegerSign, IntegerType, StringType};
    use gtk4::gdk;
    use gtk4::glib::translate::IntoGlib as _;
    use gtk4::prelude::{ObjectType as _, StaticType as _};
    use std::ffi::CString;

    #[repr(C)]
    struct TestStruct {
        int8_field: i8,
        uint8_field: u8,
        int32_field: i32,
        uint64_field: u64,
        float32_field: f32,
        float64_field: f64,
        bool_field: u8,
        string_ptr: *const i8,
        object_ptr: *mut glib::gobject_ffi::GObject,
        boxed_ptr: *mut c_void,
    }

    fn create_boxed_test_object() -> ObjectId {
        test_utils::ensure_gtk_init();

        let gtype = gdk::RGBA::static_type();
        let ptr = test_utils::allocate_test_boxed(gtype);
        let boxed = Boxed::from_glib_full(Some(gtype), ptr);
        ObjectId::new(Object::Boxed(boxed))
    }

    #[test]
    fn handle_read_integer_i8() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: -42,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_8,
            sign: IntegerSign::Signed,
        });

        let offset = std::mem::offset_of!(TestStruct, int8_field);
        let result = handle_read(object_id, &int_type, offset);

        assert!(result.is_ok());
        if let Value::Number(n) = result.unwrap() {
            assert_eq!(n, -42.0);
        } else {
            panic!("Expected Value::Number");
        }
    }

    #[test]
    fn handle_read_integer_u8() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 200,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_8,
            sign: IntegerSign::Unsigned,
        });

        let offset = std::mem::offset_of!(TestStruct, uint8_field);
        let result = handle_read(object_id, &int_type, offset);

        assert!(result.is_ok());
        if let Value::Number(n) = result.unwrap() {
            assert_eq!(n, 200.0);
        } else {
            panic!("Expected Value::Number");
        }
    }

    #[test]
    fn handle_read_integer_i32() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: -123456,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_32,
            sign: IntegerSign::Signed,
        });

        let offset = std::mem::offset_of!(TestStruct, int32_field);
        let result = handle_read(object_id, &int_type, offset);

        assert!(result.is_ok());
        if let Value::Number(n) = result.unwrap() {
            assert_eq!(n, -123456.0);
        } else {
            panic!("Expected Value::Number");
        }
    }

    #[test]
    fn handle_read_integer_u64() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 9999999999,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let int_type = Type::Integer(IntegerType {
            size: IntegerSize::_64,
            sign: IntegerSign::Unsigned,
        });

        let offset = std::mem::offset_of!(TestStruct, uint64_field);
        let result = handle_read(object_id, &int_type, offset);

        assert!(result.is_ok());
        if let Value::Number(n) = result.unwrap() {
            assert_eq!(n, 9999999999.0);
        } else {
            panic!("Expected Value::Number");
        }
    }

    #[test]
    fn handle_read_float_f32() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 3.14,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let float_type = Type::Float(FloatType {
            size: FloatSize::_32,
        });

        let offset = std::mem::offset_of!(TestStruct, float32_field);
        let result = handle_read(object_id, &float_type, offset);

        assert!(result.is_ok());
        if let Value::Number(n) = result.unwrap() {
            assert!((n - 3.14).abs() < 0.001);
        } else {
            panic!("Expected Value::Number");
        }
    }

    #[test]
    fn handle_read_float_f64() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 2.718281828,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let float_type = Type::Float(FloatType {
            size: FloatSize::_64,
        });

        let offset = std::mem::offset_of!(TestStruct, float64_field);
        let result = handle_read(object_id, &float_type, offset);

        assert!(result.is_ok());
        if let Value::Number(n) = result.unwrap() {
            assert!((n - 2.718281828).abs() < 0.0000001);
        } else {
            panic!("Expected Value::Number");
        }
    }

    #[test]
    fn handle_read_boolean_true() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 1,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let offset = std::mem::offset_of!(TestStruct, bool_field);
        let result = handle_read(object_id, &Type::Boolean, offset);

        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), Value::Boolean(true)));
    }

    #[test]
    fn handle_read_boolean_false() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let offset = std::mem::offset_of!(TestStruct, bool_field);
        let result = handle_read(object_id, &Type::Boolean, offset);

        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), Value::Boolean(false)));
    }

    #[test]
    fn handle_read_string() {
        test_utils::ensure_gtk_init();

        let cstring = CString::new("hello world").unwrap();
        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: cstring.as_ptr(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let string_type = Type::String(StringType { is_borrowed: true });

        let offset = std::mem::offset_of!(TestStruct, string_ptr);
        let result = handle_read(object_id, &string_type, offset);

        assert!(result.is_ok());
        if let Value::String(s) = result.unwrap() {
            assert_eq!(s, "hello world");
        } else {
            panic!("Expected Value::String");
        }
    }

    #[test]
    fn handle_read_string_null() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let string_type = Type::String(StringType { is_borrowed: true });

        let offset = std::mem::offset_of!(TestStruct, string_ptr);
        let result = handle_read(object_id, &string_type, offset);

        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), Value::Null));
    }

    #[test]
    fn handle_read_gobject() {
        test_utils::ensure_gtk_init();

        let obj = glib::Object::new::<glib::Object>();
        let obj_ptr = obj.as_ptr();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: obj_ptr,
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let gobject_type = Type::GObject(GObjectType { is_borrowed: true });

        let offset = std::mem::offset_of!(TestStruct, object_ptr);
        let result = handle_read(object_id, &gobject_type, offset);

        assert!(result.is_ok());
        if let Value::Object(_id) = result.unwrap() {
        } else {
            panic!("Expected Value::Object");
        }
    }

    #[test]
    fn handle_read_gobject_null() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let gobject_type = Type::GObject(GObjectType { is_borrowed: true });

        let offset = std::mem::offset_of!(TestStruct, object_ptr);
        let result = handle_read(object_id, &gobject_type, offset);

        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), Value::Null));
    }

    #[test]
    fn handle_read_boxed() {
        test_utils::ensure_gtk_init();

        let gtype = gdk::RGBA::static_type();
        let boxed_ptr = test_utils::allocate_test_boxed(gtype);

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr,
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let boxed_type = Type::Boxed(BoxedType::new(true, "GdkRGBA".to_string(), None, None));

        let offset = std::mem::offset_of!(TestStruct, boxed_ptr);
        let result = handle_read(object_id, &boxed_type, offset);

        assert!(result.is_ok());
        if let Value::Object(_id) = result.unwrap() {
        } else {
            panic!("Expected Value::Object");
        }

        unsafe {
            glib::gobject_ffi::g_boxed_free(gtype.into_glib(), boxed_ptr);
        }
    }

    #[test]
    fn handle_read_boxed_null() {
        test_utils::ensure_gtk_init();

        let test_struct = TestStruct {
            int8_field: 0,
            uint8_field: 0,
            int32_field: 0,
            uint64_field: 0,
            float32_field: 0.0,
            float64_field: 0.0,
            bool_field: 0,
            string_ptr: std::ptr::null(),
            object_ptr: std::ptr::null_mut(),
            boxed_ptr: std::ptr::null_mut(),
        };

        let ptr = &test_struct as *const TestStruct as *mut c_void;
        let boxed = Boxed::from_glib_full(None, ptr);
        let object_id = ObjectId::new(Object::Boxed(boxed));

        let boxed_type = Type::Boxed(BoxedType::new(true, "GdkRGBA".to_string(), None, None));

        let offset = std::mem::offset_of!(TestStruct, boxed_ptr);
        let result = handle_read(object_id, &boxed_type, offset);

        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), Value::Null));
    }

    #[test]
    fn handle_read_unsupported_type_error() {
        test_utils::ensure_gtk_init();

        let object_id = create_boxed_test_object();

        let result = handle_read(object_id, &Type::Undefined, 0);

        assert!(result.is_err());
    }
}
