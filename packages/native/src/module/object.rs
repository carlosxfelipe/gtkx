//! Object pointer retrieval.
//!
//! The [`get_object_id`] function returns the raw pointer value for a managed
//! object. This is primarily used for debugging and introspection.

use std::sync::mpsc;

use neon::prelude::*;

use crate::{gtk_dispatch, js_dispatch, object::ObjectId};

pub fn get_object_id(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let object_id = cx.argument::<JsBox<ObjectId>>(0)?;
    let id = *object_id.as_inner();

    let (tx, rx) = mpsc::channel();

    gtk_dispatch::enter_js_wait();
    gtk_dispatch::schedule(move || {
        let _ = tx.send(id.try_as_ptr());
    });

    let ptr = loop {
        js_dispatch::process_pending(&mut cx);

        match rx.try_recv() {
            Ok(result) => break result,
            Err(mpsc::TryRecvError::Empty) => {
                std::thread::yield_now();
            }
            Err(mpsc::TryRecvError::Disconnected) => {
                gtk_dispatch::exit_js_wait();
                return cx.throw_error("GTK thread disconnected");
            }
        }
    };

    gtk_dispatch::exit_js_wait();

    match ptr {
        Some(p) => Ok(cx.number(p as f64)),
        None => cx.throw_error("Object has been garbage collected"),
    }
}
