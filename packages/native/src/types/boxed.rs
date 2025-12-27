

use gtk4::glib::{self, translate::FromGlib as _};
use libffi::middle as ffi;
use neon::prelude::*;

use crate::state::GtkThreadState;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BoxedType {

    pub is_borrowed: bool,

    pub type_: String,

    pub lib: Option<String>,

    pub get_type_fn: Option<String>,
}

impl BoxedType {

    pub fn new(
        is_borrowed: bool,
        type_: String,
        lib: Option<String>,
        get_type_fn: Option<String>,
    ) -> Self {
        BoxedType {
            is_borrowed,
            type_,
            lib,
            get_type_fn,
        }
    }

    pub fn from_js_value(cx: &mut FunctionContext, value: Handle<JsValue>) -> NeonResult<Self> {
        let obj = value.downcast::<JsObject, _>(cx).or_throw(cx)?;
        let is_borrowed_prop: Handle<'_, JsValue> = obj.prop(cx, "borrowed").get()?;

        let is_borrowed = is_borrowed_prop
            .downcast::<JsBoolean, _>(cx)
            .map(|b| b.value(cx))
            .unwrap_or(false);

        let type_prop: Handle<'_, JsValue> = obj.prop(cx, "innerType").get()?;

        let type_ = type_prop
            .downcast::<JsString, _>(cx)
            .or_throw(cx)?
            .value(cx);

        let lib_prop: Handle<'_, JsValue> = obj.prop(cx, "lib").get()?;

        let lib = lib_prop
            .downcast::<JsString, _>(cx)
            .map(|s| s.value(cx))
            .ok();

        let get_type_fn_prop: Handle<'_, JsValue> = obj.prop(cx, "getTypeFn").get()?;

        let get_type_fn = get_type_fn_prop
            .downcast::<JsString, _>(cx)
            .map(|s| s.value(cx))
            .ok();

        Ok(Self::new(is_borrowed, type_, lib, get_type_fn))
    }

    pub fn get_gtype(&self) -> Option<glib::Type> {
        if let Some(gtype) = glib::Type::from_name(&self.type_) {
            return Some(gtype);
        }

        let lib_name = self.lib.as_ref()?;
        let get_type_fn = self
            .get_type_fn
            .clone()
            .unwrap_or_else(|| type_name_to_get_type_fn(&self.type_));

        GtkThreadState::with(|state| {
            let library = state.get_library(lib_name).ok()?;
            let symbol = unsafe {
                library
                    .get::<unsafe extern "C" fn() -> glib::ffi::GType>(get_type_fn.as_bytes())
                    .ok()?
            };
            let gtype_raw = unsafe { symbol() };
            let gtype = unsafe { glib::Type::from_glib(gtype_raw) };
            Some(gtype)
        })
    }
}

fn type_name_to_get_type_fn(type_name: &str) -> String {
    let mut result = String::new();

    for c in type_name.chars() {
        if c.is_uppercase() {
            if !result.is_empty() {
                result.push('_');
            }
            result.push(c.to_ascii_lowercase());
        } else {
            result.push(c);
        }
    }

    result.push_str("_get_type");
    result
}

impl From<&BoxedType> for ffi::Type {
    fn from(_value: &BoxedType) -> Self {
        ffi::Type::pointer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils;
    use gtk4::gdk;
    use gtk4::prelude::StaticType as _;

    #[test]
    fn boxed_type_new_creates_correct_type() {
        let boxed_type = BoxedType::new(
            true,
            "GdkRGBA".to_string(),
            Some("libgtk-4.so.1".to_string()),
            None,
        );

        assert!(boxed_type.is_borrowed);
        assert_eq!(boxed_type.type_, "GdkRGBA");
        assert_eq!(boxed_type.lib, Some("libgtk-4.so.1".to_string()));
        assert!(boxed_type.get_type_fn.is_none());
    }

    #[test]
    fn boxed_type_equality() {
        let type1 = BoxedType::new(true, "GdkRGBA".to_string(), None, None);
        let type2 = BoxedType::new(true, "GdkRGBA".to_string(), None, None);
        let type3 = BoxedType::new(false, "GdkRGBA".to_string(), None, None);

        assert_eq!(type1, type2);
        assert_ne!(type1, type3);
    }

    #[test]
    fn boxed_type_to_ffi_type_is_pointer() {
        let boxed_type = BoxedType::new(true, "GdkRGBA".to_string(), None, None);
        let _ffi_type: ffi::Type = (&boxed_type).into();
    }

    #[test]
    fn type_name_to_get_type_fn_simple() {
        assert_eq!(type_name_to_get_type_fn("GdkRGBA"), "gdk_r_g_b_a_get_type");
    }

    #[test]
    fn type_name_to_get_type_fn_multiple_capitals() {
        assert_eq!(
            type_name_to_get_type_fn("GtkCssProvider"),
            "gtk_css_provider_get_type"
        );
    }

    #[test]
    fn type_name_to_get_type_fn_single_word() {
        assert_eq!(type_name_to_get_type_fn("Widget"), "widget_get_type");
    }

    #[test]
    fn type_name_to_get_type_fn_all_caps() {
        assert_eq!(type_name_to_get_type_fn("ABC"), "a_b_c_get_type");
    }

    #[test]
    fn boxed_type_get_gtype_known_type() {
        test_utils::ensure_gtk_init();

        let boxed_type = BoxedType::new(true, "GdkRGBA".to_string(), None, None);
        let gtype = boxed_type.get_gtype();

        assert!(gtype.is_some());
        assert_eq!(gtype.unwrap(), gdk::RGBA::static_type());
    }

    #[test]
    fn boxed_type_get_gtype_unknown_type_no_lib() {
        test_utils::ensure_gtk_init();

        let boxed_type = BoxedType::new(true, "NonExistentType".to_string(), None, None);
        let gtype = boxed_type.get_gtype();

        assert!(gtype.is_none());
    }

    #[test]
    fn boxed_type_clone() {
        let original = BoxedType::new(
            true,
            "GdkRGBA".to_string(),
            Some("libgtk-4.so.1".to_string()),
            Some("gdk_rgba_get_type".to_string()),
        );
        let cloned = original.clone();

        assert_eq!(original, cloned);
    }
}
