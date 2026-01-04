use std::ffi::c_void;

use anyhow::bail;
use gtk4::glib::{self, translate::FromGlibPtrNone as _, translate::ToGlibPtr as _};

use super::Value;
use crate::{
    managed::{Boxed, Fundamental, ManagedValue},
    types::*,
};

impl Value {
    pub fn from_glib_value(gvalue: &glib::Value, ty: &Type) -> anyhow::Result<Self> {
        match ty {
            Type::Integer(int_kind) => {
                let gtype = gvalue.type_();
                let is_enum = gtype.is_a(glib::types::Type::ENUM);
                let is_flags = gtype.is_a(glib::types::Type::FLAGS);

                let number = match int_kind {
                    IntegerKind::I8 => gvalue
                        .get::<i8>()
                        .map_err(|e| anyhow::anyhow!("Failed to get i8 from GValue: {}", e))?
                        as f64,
                    IntegerKind::U8 => gvalue
                        .get::<u8>()
                        .map_err(|e| anyhow::anyhow!("Failed to get u8 from GValue: {}", e))?
                        as f64,
                    IntegerKind::I16 => gvalue.get::<i32>().map_err(|e| {
                        anyhow::anyhow!("Failed to get i32 (as i16) from GValue: {}", e)
                    })? as i16 as f64,
                    IntegerKind::U16 => gvalue.get::<u32>().map_err(|e| {
                        anyhow::anyhow!("Failed to get u32 (as u16) from GValue: {}", e)
                    })? as u16 as f64,
                    IntegerKind::I32 => {
                        if is_enum {
                            let enum_value = unsafe {
                                glib::gobject_ffi::g_value_get_enum(
                                    gvalue.to_glib_none().0 as *const _,
                                )
                            };
                            enum_value as f64
                        } else {
                            gvalue.get::<i32>().map_err(|e| {
                                anyhow::anyhow!("Failed to get i32 from GValue: {}", e)
                            })? as f64
                        }
                    }
                    IntegerKind::U32 => {
                        if is_flags {
                            let flags_value = unsafe {
                                glib::gobject_ffi::g_value_get_flags(
                                    gvalue.to_glib_none().0 as *const _,
                                )
                            };
                            flags_value as f64
                        } else {
                            gvalue.get::<u32>().map_err(|e| {
                                anyhow::anyhow!("Failed to get u32 from GValue: {}", e)
                            })? as f64
                        }
                    }
                    IntegerKind::I64 => gvalue
                        .get::<i64>()
                        .map_err(|e| anyhow::anyhow!("Failed to get i64 from GValue: {}", e))?
                        as f64,
                    IntegerKind::U64 => gvalue
                        .get::<u64>()
                        .map_err(|e| anyhow::anyhow!("Failed to get u64 from GValue: {}", e))?
                        as f64,
                };
                Ok(Value::Number(number))
            }
            Type::Float(float_kind) => {
                let number = match float_kind {
                    FloatKind::F32 => gvalue
                        .get::<f32>()
                        .map_err(|e| anyhow::anyhow!("Failed to get f32 from GValue: {}", e))?
                        as f64,
                    FloatKind::F64 => gvalue
                        .get::<f64>()
                        .map_err(|e| anyhow::anyhow!("Failed to get f64 from GValue: {}", e))?,
                };
                Ok(Value::Number(number))
            }
            Type::String(_) => {
                let string: String = gvalue
                    .get()
                    .map_err(|e| anyhow::anyhow!("Failed to get String from GValue: {}", e))?;
                Ok(Value::String(string))
            }
            Type::Boolean => {
                let boolean: bool = gvalue
                    .get()
                    .map_err(|e| anyhow::anyhow!("Failed to get bool from GValue: {}", e))?;
                Ok(Value::Boolean(boolean))
            }
            Type::GObject(_) => Self::from_glib_gobject(gvalue),
            Type::Boxed(boxed_type) => {
                let gvalue_type = gvalue.type_();

                let boxed_ptr = unsafe {
                    glib::gobject_ffi::g_value_get_boxed(gvalue.to_glib_none().0 as *const _)
                };

                if boxed_ptr.is_null() {
                    return Ok(Value::Null);
                }

                let gtype = boxed_type.gtype().or(Some(gvalue_type));

                let boxed = if boxed_type.ownership.is_full() {
                    let owned_ptr = unsafe {
                        glib::gobject_ffi::g_value_dup_boxed(gvalue.to_glib_none().0 as *const _)
                    };
                    Boxed::from_glib_full(gtype, owned_ptr)
                } else {
                    Boxed::from_glib_none(gtype, boxed_ptr)?
                };

                let object_id = ManagedValue::Boxed(boxed).into();
                Ok(Value::Object(object_id))
            }
            Type::Null | Type::Undefined => Ok(Value::Null),
            Type::Struct(_) => {
                bail!(
                    "Plain struct type should not appear in glib value conversion - structs without GType cannot be stored in GValue"
                )
            }
            Type::Fundamental(fundamental_type) => {
                let gvalue_type = gvalue.type_();

                let ptr = if gvalue_type.is_a(glib::types::Type::VARIANT) {
                    unsafe {
                        glib::gobject_ffi::g_value_get_variant(gvalue.to_glib_none().0 as *const _)
                            .cast::<c_void>()
                    }
                } else if gvalue_type.is_a(glib::types::Type::PARAM_SPEC) {
                    unsafe {
                        glib::gobject_ffi::g_value_get_param(gvalue.to_glib_none().0 as *const _)
                            .cast::<c_void>()
                    }
                } else {
                    bail!("Unsupported fundamental type in GValue: {:?}", gvalue_type)
                };

                if ptr.is_null() {
                    return Ok(Value::Null);
                }

                let (ref_fn, unref_fn) = fundamental_type.lookup_fns()?;
                let fundamental = if fundamental_type.ownership.is_full() {
                    Fundamental::from_glib_full(ptr, ref_fn, unref_fn)
                } else {
                    Fundamental::from_glib_none(ptr, ref_fn, unref_fn)
                };
                Ok(Value::Object(ManagedValue::Fundamental(fundamental).into()))
            }
            Type::Array(_) | Type::HashTable(_) | Type::Ref(_) | Type::Callback(_) => {
                bail!(
                    "Type {:?} should not appear in glib value conversion - this indicates a bug in the type mapping",
                    ty
                )
            }
        }
    }
}

impl Value {
    pub fn from_glib_values(
        args: &[glib::Value],
        arg_types: &Option<Vec<Type>>,
    ) -> anyhow::Result<Vec<Self>> {
        match arg_types {
            Some(types) => args
                .iter()
                .zip(types.iter())
                .map(|(gval, ty)| Self::from_glib_value(gval, ty))
                .collect(),
            None if args.is_empty() => Ok(vec![]),
            None => bail!(
                "Callback received {} argument(s) but no argTypes were provided - \
                 this indicates a bug in the FFI binding definition",
                args.len()
            ),
        }
    }

    fn from_glib_gobject(gvalue: &glib::Value) -> anyhow::Result<Value> {
        let obj_ptr =
            unsafe { glib::gobject_ffi::g_value_get_object(gvalue.to_glib_none().0 as *const _) };

        if obj_ptr.is_null() {
            return Ok(Value::Null);
        }

        let type_class = unsafe { (*obj_ptr).g_type_instance.g_class };
        if type_class.is_null() {
            bail!("GObject has invalid type class (object may have been freed)");
        }

        let obj = unsafe { glib::Object::from_glib_none(obj_ptr) };
        Ok(Value::Object(ManagedValue::GObject(obj).into()))
    }
}
