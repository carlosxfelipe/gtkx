use std::sync::mpsc;

use gtk4::glib;
use neon::prelude::*;

use crate::state::GtkThreadState;

pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let (tx, rx) = mpsc::channel::<()>();

    glib::idle_add_once(move || {
        GtkThreadState::with(|state| {
            state.app_hold_guard.take();
        });

        tx.send(()).unwrap();
    });

    rx.recv()
        .or_else(|err| cx.throw_error(format!("Error stopping GTK thread: {err}")))?;

    Ok(cx.undefined())
}
