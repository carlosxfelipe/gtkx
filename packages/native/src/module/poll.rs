//! Process pending JavaScript callbacks.
//!
//! The [`poll`] function drains the JS dispatch queue and invokes any
//! callbacks that were scheduled from the GTK thread. This is called
//! periodically by the JavaScript runtime to handle async responses.

use neon::prelude::*;

use crate::js_dispatch;

pub fn poll(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    js_dispatch::JsDispatcher::global().process_pending(&mut cx);
    Ok(cx.undefined())
}
