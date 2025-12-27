//! Array and list type representation for FFI.
//!
//! Defines [`ArrayType`] for homogeneous collections. Supports three container types:
//!
//! - [`ListType::Array`] - C-style null-terminated arrays
//! - [`ListType::GList`] - GLib doubly-linked lists
//! - [`ListType::GSList`] - GLib singly-linked lists
//!
//! All are passed as pointers at the FFI level.

use libffi::middle as ffi;
use neon::prelude::*;

use crate::types::Type;

#[derive(Debug, Clone, Default, PartialEq)]
pub enum ListType {

    #[default]
    Array,

    GList,

    GSList,
}

#[derive(Debug, Clone)]
pub struct ArrayType {

    pub item_type: Box<Type>,

    pub list_type: ListType,

    pub is_borrowed: bool,
}

impl ArrayType {

    pub fn new(item_type: Type) -> Self {
        ArrayType {
            item_type: Box::new(item_type),
            list_type: ListType::Array,
            is_borrowed: false,
        }
    }

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let item_type_value: Handle<'_, JsValue> = obj.prop(cx, "itemType").get()?;
        let item_type = Type::from_js_value(cx, item_type_value)?;

        let list_type_str: Option<Handle<JsString>> = obj.get_opt(cx, "listType")?;
        let list_type = match list_type_str.map(|s| s.value(cx)).as_deref() {
            Some("glist") => ListType::GList,
            Some("gslist") => ListType::GSList,
            _ => ListType::Array,
        };

        let is_borrowed: Option<Handle<JsBoolean>> = obj.get_opt(cx, "borrowed")?;
        let is_borrowed = is_borrowed.map(|b| b.value(cx)).unwrap_or(false);

        Ok(ArrayType {
            item_type: Box::new(item_type),
            list_type,
            is_borrowed,
        })
    }
}

impl From<&ArrayType> for ffi::Type {
    fn from(_value: &ArrayType) -> Self {
        ffi::Type::pointer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{IntegerSign, IntegerSize, IntegerType};

    #[test]
    fn list_type_default_is_array() {
        let list_type: ListType = Default::default();
        assert_eq!(list_type, ListType::Array);
    }

    #[test]
    fn list_type_equality() {
        assert_eq!(ListType::Array, ListType::Array);
        assert_eq!(ListType::GList, ListType::GList);
        assert_eq!(ListType::GSList, ListType::GSList);
        assert_ne!(ListType::Array, ListType::GList);
        assert_ne!(ListType::GList, ListType::GSList);
    }

    #[test]
    fn array_type_new_creates_correct_type() {
        let array_type =
            ArrayType::new(Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed)));

        if let Type::Integer(inner) = &*array_type.item_type {
            assert_eq!(inner.size, IntegerSize::_32);
            assert_eq!(inner.sign, IntegerSign::Signed);
        } else {
            panic!("Expected Integer type");
        }
        assert_eq!(array_type.list_type, ListType::Array);
        assert!(!array_type.is_borrowed);
    }

    #[test]
    fn array_type_to_ffi_type_is_pointer() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed));
        let array_type = ArrayType::new(int_type);
        let _ffi_type: ffi::Type = (&array_type).into();
    }

    #[test]
    fn array_type_with_glist() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed));
        let array_type = ArrayType {
            item_type: Box::new(int_type),
            list_type: ListType::GList,
            is_borrowed: true,
        };

        assert_eq!(array_type.list_type, ListType::GList);
        assert!(array_type.is_borrowed);
    }

    #[test]
    fn array_type_with_gslist() {
        let int_type = Type::Integer(IntegerType::new(IntegerSize::_32, IntegerSign::Signed));
        let array_type = ArrayType {
            item_type: Box::new(int_type),
            list_type: ListType::GSList,
            is_borrowed: false,
        };

        assert_eq!(array_type.list_type, ListType::GSList);
        assert!(!array_type.is_borrowed);
    }
}
