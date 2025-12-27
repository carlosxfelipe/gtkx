

use libffi::middle as ffi;
use neon::prelude::*;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GVariantType {
    pub is_borrowed: bool,
}

impl GVariantType {
    pub fn new(is_borrowed: bool) -> Self {
        GVariantType { is_borrowed }
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

impl From<&GVariantType> for ffi::Type {
    fn from(_value: &GVariantType) -> Self {
        ffi::Type::pointer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gvariant_type_new_creates_correct_type() {
        let gvariant_type = GVariantType::new(true);
        assert!(gvariant_type.is_borrowed);

        let gvariant_type = GVariantType::new(false);
        assert!(!gvariant_type.is_borrowed);
    }

    #[test]
    fn gvariant_type_equality() {
        let borrowed = GVariantType::new(true);
        let not_borrowed = GVariantType::new(false);
        let borrowed2 = GVariantType::new(true);

        assert_eq!(borrowed, borrowed2);
        assert_ne!(borrowed, not_borrowed);
    }

    #[test]
    fn gvariant_type_to_ffi_type_is_pointer() {
        let borrowed = GVariantType::new(true);
        let not_borrowed = GVariantType::new(false);

        let _ffi_type_borrowed: ffi::Type = (&borrowed).into();
        let _ffi_type_not_borrowed: ffi::Type = (&not_borrowed).into();
    }

    #[test]
    fn gvariant_type_clone() {
        let original = GVariantType::new(true);
        let cloned = original.clone();
        assert_eq!(original, cloned);
    }
}
