//! Reference type representation for FFI (out parameters).
//!
//! Defines [`RefType`] for pointer-to-value types, used for out parameters
//! where a function writes a result through a pointer. The inner type
//! describes what the pointer points to.

use libffi::middle as ffi;
use neon::prelude::*;

use crate::types::Type;

#[derive(Debug, Clone)]
pub struct RefType {

    pub inner_type: Box<Type>,
}

impl RefType {

    pub fn new(inner_type: Type) -> Self {
        RefType {
            inner_type: Box::new(inner_type),
        }
    }

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let inner_type_value: Handle<'_, JsValue> = obj.prop(cx, "innerType").get()?;
        let inner_type = Type::from_js_value(cx, inner_type_value)?;

        Ok(Self::new(inner_type))
    }
}

impl From<&RefType> for ffi::Type {
    fn from(_value: &RefType) -> Self {
        ffi::Type::pointer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{IntegerSign, IntegerSize, IntegerType};

    #[test]
    fn ref_type_new_creates_correct_type() {
        let ref_type =
            RefType::new(Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed)));

        if let Type::Integer(inner) = &*ref_type.inner_type {
            assert_eq!(inner.size, IntegerSize::_32);
            assert_eq!(inner.sign, IntegerSign::Signed);
        } else {
            panic!("Expected Integer type");
        }
    }

    #[test]
    fn ref_type_to_ffi_type_is_pointer() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed));
        let ref_type = RefType::new(int_type);
        let _ffi_type: ffi::Type = (&ref_type).into();
    }

    #[test]
    fn ref_type_with_nested_type() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_64, IntegerSign::Unsigned));
        let ref_type = RefType::new(int_type);

        if let Type::Integer(inner) = &*ref_type.inner_type {
            assert_eq!(inner.size, IntegerSize::_64);
            assert_eq!(inner.sign, IntegerSign::Unsigned);
        } else {
            panic!("Expected Integer type");
        }
    }
}
