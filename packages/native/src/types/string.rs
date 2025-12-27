

use libffi::middle as ffi;
use neon::prelude::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StringType {

    pub is_borrowed: bool,
}

impl StringType {

    pub fn new(is_borrowed: bool) -> Self {
        StringType { is_borrowed }
    }

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let is_borrowed_prop: Handle<'_, JsValue> = obj.prop(cx, "borrowed").get()?;

        let is_borrowed = is_borrowed_prop
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        Ok(Self::new(is_borrowed))
    }
}

impl From<&StringType> for ffi::Type {
    fn from(_value: &StringType) -> Self {
        ffi::Type::pointer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn string_type_new_creates_correct_type() {
        let string_type = StringType::new(true);
        assert!(string_type.is_borrowed);

        let string_type = StringType::new(false);
        assert!(!string_type.is_borrowed);
    }

    #[test]
    fn string_type_equality() {
        let borrowed = StringType::new(true);
        let not_borrowed = StringType::new(false);
        let borrowed2 = StringType::new(true);

        assert_eq!(borrowed, borrowed2);
        assert_ne!(borrowed, not_borrowed);
    }

    #[test]
    fn string_type_to_ffi_type_is_pointer() {
        let borrowed = StringType::new(true);
        let not_borrowed = StringType::new(false);

        let _ffi_type_borrowed: ffi::Type = (&borrowed).into();
        let _ffi_type_not_borrowed: ffi::Type = (&not_borrowed).into();
    }

    #[test]
    fn string_type_clone() {
        let original = StringType::new(true);
        let cloned = original;
        assert_eq!(original, cloned);
    }
}
