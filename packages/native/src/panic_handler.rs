//! Process-wide panic handling for the native module.
//!
//! Two complementary mechanisms cooperate to keep Rust panics observable from
//! JavaScript:
//!
//! - [`format_panic_payload`] extracts a human-readable message from the
//!   opaque `Box<dyn Any + Send>` produced by [`std::panic::catch_unwind`] and
//!   [`std::thread::JoinHandle::join`]. Call sites that catch panics use it to
//!   build a string for [`crate::error_reporter::NativeErrorReporter`].
//! - [`install_panic_hook`] sets a process-wide [`std::panic::set_hook`] once
//!   per process. The hook still calls the previous hook (so the default
//!   stderr backtrace continues to print), then forwards a formatted message
//!   through [`crate::error_reporter::NativeErrorReporter`] so panics in
//!   uncaught code paths are surfaced as JavaScript exceptions rather than
//!   silently aborting the `GLib` thread.
//!
//! The hook is idempotent: a [`std::sync::OnceLock`] guards installation, so
//! repeated calls from tests or repeated module loads do not stack hooks.

use std::any::Any;
use std::panic::{self, PanicHookInfo};
use std::sync::OnceLock;

use crate::error_reporter::NativeErrorReporter;

static PANIC_HOOK_INSTALLED: OnceLock<()> = OnceLock::new();

/// Formats a panic payload as captured by [`std::panic::catch_unwind`] or
/// [`std::thread::JoinHandle::join`] into a human-readable message.
///
/// Falls back to `"unknown panic"` when the payload is neither a `&'static str`
/// nor a `String` — the two forms produced by `panic!` and `panic_any` for
/// string-like arguments.
#[must_use]
pub fn format_panic_payload(payload: &(dyn Any + Send)) -> String {
    payload
        .downcast_ref::<&str>()
        .copied()
        .map(str::to_owned)
        .or_else(|| payload.downcast_ref::<String>().cloned())
        .unwrap_or_else(|| "unknown panic".to_owned())
}

/// Formats a single panic event into the message string that the global hook
/// forwards through [`NativeErrorReporter`].
///
/// Extracted from the hook body so the formatting can be exercised in
/// isolation: the hook itself depends on the process-global panic registry,
/// which is impractical to drive deterministically from unit tests.
#[must_use]
pub fn format_panic_report(info: &PanicHookInfo<'_>) -> String {
    let location = info
        .location()
        .map(|loc| format!(" at {}:{}:{}", loc.file(), loc.line(), loc.column()))
        .unwrap_or_default();
    let message = format_panic_payload(info.payload());
    let thread = std::thread::current();
    let thread_name = thread.name().unwrap_or("<unnamed>");
    format!("native panic on thread '{thread_name}'{location}: {message}")
}

/// Installs a process-wide panic hook that reports payloads through
/// [`NativeErrorReporter`] in addition to the previous hook.
///
/// Idempotent: subsequent calls are no-ops, so the hook never stacks even if
/// the native module is initialized more than once in a single process.
///
/// Coverage is disabled because the hook fires on the host process's panic
/// dispatcher, which the cargo test runner intercepts for its own panic
/// reporting. The formatting branch is covered by [`format_panic_report`]
/// tests; the installation branch is exercised in the live module init.
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn install_panic_hook() {
    PANIC_HOOK_INSTALLED.get_or_init(|| {
        let previous = panic::take_hook();
        panic::set_hook(Box::new(move |info: &PanicHookInfo<'_>| {
            previous(info);
            NativeErrorReporter::global().report_str(&format_panic_report(info));
        }));
    });
}
