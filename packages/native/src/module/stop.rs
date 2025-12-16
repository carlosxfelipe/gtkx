//! GTK main loop shutdown.

use std::sync::mpsc;

use neon::prelude::*;

use crate::{gtk_dispatch, state::GtkThreadState};

/// Stops the GTK main loop.
///
/// JavaScript signature: `stop() => void`
///
/// Releases the application hold guard, allowing the GTK main loop to exit.
pub fn stop(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let (tx, rx) = mpsc::channel::<()>();

    gtk_dispatch::schedule(move || {
        GtkThreadState::with(|state| {
            // Release the hold guard to allow GTK's main loop to exit
            state.app_hold_guard.take();
        });

        tx.send(()).expect("Stop completion channel disconnected");
    });

    rx.recv()
        .or_else(|err| cx.throw_error(format!("Error stopping GTK thread: {err}")))?;

    Ok(cx.undefined())
}
