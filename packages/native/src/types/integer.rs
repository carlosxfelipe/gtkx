//! Integer type descriptor.

use libffi::middle as ffi;
use neon::prelude::*;

/// Size of an integer type in bits.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntegerSize {
    /// 8-bit integer.
    _8,
    /// 16-bit integer.
    _16,
    /// 32-bit integer.
    _32,
    /// 64-bit integer.
    _64,
}

impl IntegerSize {
    /// Parses an integer size from a JavaScript number.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the value is not 8, 16, 32, or 64.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let size = value.downcast::<JsNumber, _>(cx).or_throw(cx)?;

        match size.value(cx) as u64 {
            8 => Ok(IntegerSize::_8),
            16 => Ok(IntegerSize::_16),
            32 => Ok(IntegerSize::_32),
            64 => Ok(IntegerSize::_64),
            _ => cx.throw_type_error("Invalid integer size"),
        }
    }
}

/// Signedness of an integer type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntegerSign {
    /// Unsigned integer.
    Unsigned,
    /// Signed integer.
    Signed,
}

impl IntegerSign {
    /// Parses an integer sign from a JavaScript boolean.
    ///
    /// True means unsigned, false means signed.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let is_unsigned = value
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(true);

        Ok(if is_unsigned {
            IntegerSign::Unsigned
        } else {
            IntegerSign::Signed
        })
    }
}

/// Type descriptor for integer types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IntegerType {
    /// The size of the integer.
    pub size: IntegerSize,
    /// The signedness of the integer.
    pub sign: IntegerSign,
}

impl IntegerType {
    /// Creates a new integer type with the given size and sign.
    pub fn new(size: IntegerSize, sign: IntegerSign) -> Self {
        IntegerType { size, sign }
    }

    /// Parses an integer type from a JavaScript object.
    ///
    /// # Errors
    ///
    /// Returns a `NeonResult` error if the object is malformed.
    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let size_prop = obj.prop(cx, "size").get()?;
        let sign_prop = obj.prop(cx, "unsigned").get()?;
        let size = IntegerSize::from_js_value(cx, size_prop)?;
        let sign = IntegerSign::from_js_value(cx, sign_prop)?;

        Ok(Self::new(size, sign))
    }

    /// Reads an integer value from a raw pointer and returns it as f64.
    ///
    /// # Safety
    ///
    /// The pointer must be valid and properly aligned for the integer type.
    pub unsafe fn read_from_ptr(self, ptr: *const u8) -> f64 {
        use crate::numeric::ReadFromPtr;
        self.dispatch(ReadFromPtr::new(ptr))
    }

    /// Writes an f64 value to a raw pointer as the appropriate integer type.
    ///
    /// # Safety
    ///
    /// The pointer must be valid and properly aligned for the integer type.
    pub unsafe fn write_to_ptr(self, ptr: *mut u8, value: f64) {
        use crate::numeric::WriteToPtr;
        self.dispatch(WriteToPtr::new(ptr, value))
    }
}

impl From<IntegerType> for ffi::Type {
    fn from(value: IntegerType) -> Self {
        value.ffi_type()
    }
}
