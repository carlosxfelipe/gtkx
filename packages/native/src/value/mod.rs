mod from_glib;
mod neon;

use std::ffi::c_void;
use std::sync::Arc;

use ::neon::{handle::Root, object::Object as _, prelude::*};
use anyhow::bail;
use gtk4::glib;

use crate::ffi::FfiDecode;
use crate::{ffi, managed::ObjectId, types::Type};

#[derive(Debug, Clone)]
pub struct Callback {
    pub js_func: Arc<Root<JsFunction>>,
    pub channel: Channel,
}

impl Callback {
    pub fn new(js_func: Arc<Root<JsFunction>>, channel: Channel) -> Self {
        Callback { js_func, channel }
    }

    pub fn from_js_value<'a, C: Context<'a>>(
        cx: &mut C,
        value: Handle<JsValue>,
    ) -> NeonResult<Self> {
        let js_func = value.downcast::<JsFunction, _>(cx).or_throw(cx)?;
        let js_func_root = js_func.root(cx);
        let mut channel = cx.channel();

        channel.unref(cx);

        Ok(Callback::new(Arc::new(js_func_root), channel))
    }

    pub fn to_js_value<'a, C: Context<'a>>(&self, cx: &mut C) -> NeonResult<Handle<'a, JsValue>> {
        let js_func = self.js_func.to_inner(cx);
        Ok(js_func.upcast())
    }
}

#[derive(Debug, Clone)]
pub struct Ref {
    pub value: Box<Value>,
    pub js_obj: Arc<Root<JsObject>>,
}

impl Ref {
    pub fn new(value: Value, js_obj: Arc<Root<JsObject>>) -> Self {
        Ref {
            value: Box::new(value),
            js_obj,
        }
    }

    pub fn from_js_value<'a, C: Context<'a>>(
        cx: &mut C,
        value: Handle<JsValue>,
    ) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let js_obj_root = obj.root(cx);
        let value_prop: Handle<JsValue> = obj.get(cx, "value")?;
        let value = Value::from_js_value(cx, value_prop)?;

        Ok(Ref::new(value, Arc::new(js_obj_root)))
    }
}

#[derive(Debug, Clone)]
pub enum Value {
    Number(f64),
    String(String),
    Boolean(bool),
    Object(ObjectId),
    Null,
    Undefined,
    Array(Vec<Value>),
    Callback(Callback),
    Ref(Ref),
}

impl Value {
    pub fn object_ptr(&self, type_name: &str) -> anyhow::Result<*mut c_void> {
        match self {
            Value::Object(id) => id
                .get_ptr()
                .ok_or_else(|| anyhow::anyhow!("{} has been garbage collected", type_name)),
            Value::Null | Value::Undefined => Ok(std::ptr::null_mut()),
            _ => anyhow::bail!("Expected an Object for {} type, got {:?}", type_name, self),
        }
    }

    pub fn from_ffi_value(ffi_value: &ffi::FfiValue, ty: &Type) -> anyhow::Result<Self> {
        ty.decode(ffi_value)
    }

    pub fn from_ffi_value_with_args(
        ffi_value: &ffi::FfiValue,
        ty: &Type,
        ffi_args: &[ffi::FfiValue],
        args: &[crate::arg::Arg],
    ) -> anyhow::Result<Self> {
        ty.decode_with_context(ffi_value, ffi_args, args)
    }

    pub fn into_glib_value_with_default(self, return_type: Option<&Type>) -> Option<glib::Value> {
        match &self {
            Value::Undefined => match return_type {
                Some(Type::Boolean) => Some(false.into()),
                Some(Type::Integer(_)) => Some(0i32.into()),
                _ => None,
            },
            _ => self.to_glib_value().ok(),
        }
    }

    pub fn to_glib_value(self) -> anyhow::Result<glib::Value> {
        match self {
            Value::Number(n) => Ok(n.into()),
            Value::String(s) => Ok(s.into()),
            Value::Boolean(b) => Ok(b.into()),
            Value::Null | Value::Undefined => {
                bail!("Cannot convert Null/Undefined to glib::Value")
            }
            other => bail!(
                "Unsupported Value type for glib::Value conversion: {:?}",
                other
            ),
        }
    }
}
