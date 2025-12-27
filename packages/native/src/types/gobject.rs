

use libffi::middle as ffi;
use neon::prelude::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GObjectType {

    pub is_borrowed: bool,
}

impl GObjectType {

    pub fn new(is_borrowed: bool) -> Self {
        GObjectType { is_borrowed }
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

impl From<&GObjectType> for ffi::Type {
    fn from(_value: &GObjectType) -> Self {
        ffi::Type::pointer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gobject_type_new_creates_correct_type() {
        let gobject_type = GObjectType::new(true);
        assert!(gobject_type.is_borrowed);

        let gobject_type = GObjectType::new(false);
        assert!(!gobject_type.is_borrowed);
    }

    #[test]
    fn gobject_type_equality() {
        let borrowed = GObjectType::new(true);
        let not_borrowed = GObjectType::new(false);
        let borrowed2 = GObjectType::new(true);

        assert_eq!(borrowed, borrowed2);
        assert_ne!(borrowed, not_borrowed);
    }

    #[test]
    fn gobject_type_to_ffi_type_is_pointer() {
        let borrowed = GObjectType::new(true);
        let not_borrowed = GObjectType::new(false);

        let _ffi_type_borrowed: ffi::Type = (&borrowed).into();
        let _ffi_type_not_borrowed: ffi::Type = (&not_borrowed).into();
    }

    #[test]
    fn gobject_type_clone() {
        let original = GObjectType::new(true);
        let cloned = original;
        assert_eq!(original, cloned);
    }
}
