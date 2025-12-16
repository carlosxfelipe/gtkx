//! Dispatching callbacks to the JS thread.
//!
//! This module provides two paths for invoking JavaScript callbacks from GTK signal handlers:
//!
//! - **Normal path**: When JS is idle, use `send_via_channel()` which schedules the callback
//!   through a Neon channel. The UV event loop processes it asynchronously.
//!
//! - **Re-entrant path**: When JS is waiting for a GTK dispatch result (in `call.rs::wait_for_result`),
//!   use `queue()` to add to a queue that's processed synchronously by the wait loop.
//!
//! The choice between paths is made by checking `gtk_dispatch::is_js_waiting()`.

use std::sync::{Arc, mpsc};

use neon::prelude::*;

use crate::{queue::Queue, value::Value};

/// A pending callback waiting to be executed on the JS thread.
pub struct PendingCallback {
    /// The rooted JavaScript function to call.
    pub callback: Arc<Root<JsFunction>>,
    /// Arguments to pass to the function.
    pub args: Vec<Value>,
    /// Whether to capture and return the result.
    pub capture_result: bool,
    /// Channel to send the result back to the GTK thread.
    pub result_tx: mpsc::Sender<Result<Value, ()>>,
}

static QUEUE: Queue<PendingCallback> = Queue::new();

/// Queues a callback for synchronous execution on the JS thread.
///
/// Use this when `gtk_dispatch::is_js_waiting()` is true (re-entrant case).
/// The callback will be executed by the JS thread when it processes the queue
/// in its wait loop.
pub fn queue(
    callback: Arc<Root<JsFunction>>,
    args: Vec<Value>,
    capture_result: bool,
) -> mpsc::Receiver<Result<Value, ()>> {
    let (tx, rx) = mpsc::channel();

    QUEUE.push(PendingCallback {
        callback,
        args,
        capture_result,
        result_tx: tx,
    });

    rx
}

/// Sends a callback to the JS thread via the Neon channel.
///
/// Use this when `gtk_dispatch::is_js_waiting()` is false (normal case).
/// The callback is scheduled on the UV event loop and processed asynchronously.
pub fn send_via_channel(
    channel: &Channel,
    callback: Arc<Root<JsFunction>>,
    args: Vec<Value>,
    capture_result: bool,
) -> mpsc::Receiver<Result<Value, ()>> {
    let (tx, rx) = mpsc::channel();

    channel.send(move |mut cx| {
        let result = execute_callback(&mut cx, &callback, &args, capture_result);
        tx.send(result).expect("JS callback result channel disconnected");
        Ok(())
    });

    rx
}

/// Processes all pending callbacks using the provided context.
///
/// This should be called from the JS thread's wait loop while waiting for
/// GTK dispatch results. Each callback is executed synchronously and its result
/// is sent back through the callback's result channel.
pub fn process_pending<'a, C: Context<'a>>(cx: &mut C) {
    while let Some(pending) = QUEUE.pop() {
        let result = execute_callback(cx, &pending.callback, &pending.args, pending.capture_result);
        pending
            .result_tx
            .send(result)
            .expect("Pending callback result channel disconnected");
    }
}

fn execute_callback<'a, C: Context<'a>>(
    cx: &mut C,
    callback: &Arc<Root<JsFunction>>,
    args: &[Value],
    capture_result: bool,
) -> Result<Value, ()> {
    let js_args: Vec<Handle<JsValue>> = args
        .iter()
        .map(|v| v.to_js_value(cx))
        .collect::<NeonResult<Vec<_>>>()
        .map_err(|_| ())?;

    let js_this = cx.undefined();
    let js_callback = callback.to_inner(cx);

    if capture_result {
        let js_result = js_callback.call(cx, js_this, js_args).map_err(|_| ())?;
        Value::from_js_value(cx, js_result).map_err(|_| ())
    } else {
        js_callback.call(cx, js_this, js_args).map_err(|_| ())?;
        Ok(Value::Undefined)
    }
}
