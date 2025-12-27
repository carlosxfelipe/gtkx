//! Floating-point type representation for FFI.
//!
//! Defines [`FloatType`] with size information for proper memory layout
//! and libffi type selection. Supports 32-bit (f32) and 64-bit (f64) floats.

use libffi::middle as ffi;
use neon::prelude::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FloatSize {

    _32,

    _64,
}

impl FloatSize {

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let size = value.downcast::<JsNumber, _>(cx).or_throw(cx)?;

        match size.value(cx) as u64 {
            32 => Ok(FloatSize::_32),
            64 => Ok(FloatSize::_64),
            _ => cx.throw_type_error("Invalid float size"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FloatType {

    pub size: FloatSize,
}

impl FloatType {

    pub fn new(size: FloatSize) -> Self {
        FloatType { size }
    }

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_prop = obj.prop(cx, "size").get()?;
        let size = FloatSize::from_js_value(cx, size_prop)?;

        Ok(Self::new(size))
    }
}

impl From<&FloatType> for ffi::Type {
    fn from(value: &FloatType) -> Self {
        match value.size {
            FloatSize::_32 => ffi::Type::f32(),
            FloatSize::_64 => ffi::Type::f64(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn float_type_new_creates_correct_type() {
        let float_type = FloatType::new(FloatSize::_32);
        assert_eq!(float_type.size, FloatSize::_32);

        let float_type = FloatType::new(FloatSize::_64);
        assert_eq!(float_type.size, FloatSize::_64);
    }

    #[test]
    fn float_size_equality() {
        assert_eq!(FloatSize::_32, FloatSize::_32);
        assert_eq!(FloatSize::_64, FloatSize::_64);
        assert_ne!(FloatSize::_32, FloatSize::_64);
    }

    #[test]
    fn float_type_to_ffi_type_f32() {
        let float_type = FloatType::new(FloatSize::_32);
        let _ffi_type: ffi::Type = (&float_type).into();
    }

    #[test]
    fn float_type_to_ffi_type_f64() {
        let float_type = FloatType::new(FloatSize::_64);
        let _ffi_type: ffi::Type = (&float_type).into();
    }

    #[test]
    fn float_type_clone() {
        let original = FloatType::new(FloatSize::_64);
        let cloned = original;
        assert_eq!(original, cloned);
    }
}
