//! Extension traits for Neon JavaScript interop.

use neon::prelude::*;

pub trait JsObjectExt {
    fn get_bool_or_default<'a, C: Context<'a>>(
        &self,
        cx: &mut C,
        key: &str,
        default: bool,
    ) -> NeonResult<bool>;

    fn get_optional_string<'a, C: Context<'a>>(
        &self,
        cx: &mut C,
        key: &str,
    ) -> NeonResult<Option<String>>;
}

impl<'cx> JsObjectExt for Handle<'cx, JsObject> {
    fn get_bool_or_default<'a, C: Context<'a>>(
        &self,
        cx: &mut C,
        key: &str,
        default: bool,
    ) -> NeonResult<bool> {
        let prop: Option<Handle<JsBoolean>> = self.get_opt(cx, key)?;
        Ok(prop.map(|b| b.value(cx)).unwrap_or(default))
    }

    fn get_optional_string<'a, C: Context<'a>>(
        &self,
        cx: &mut C,
        key: &str,
    ) -> NeonResult<Option<String>> {
        let prop: Option<Handle<JsString>> = self.get_opt(cx, key)?;
        Ok(prop.map(|s| s.value(cx)))
    }
}
