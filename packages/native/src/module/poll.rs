//! JavaScript callback processing.
//!
//! The [`poll`] function processes all pending JavaScript callbacks that were
//! queued by GTK signal handlers. This is called periodically from the JS
//! event loop to execute callbacks in the JavaScript context.

use neon::prelude::*;

use crate::js_dispatch;

pub fn poll(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    js_dispatch::process_pending(&mut cx);
    Ok(cx.undefined())
}
