//! Neon function implementations for the native module.
//!
//! This module aggregates all exported JavaScript functions. Each submodule
//! implements a single Neon function that bridges JavaScript to GTK operations.
//!
//! ## Submodules
//!
//! - [`start`]: Initialize GTK application and spawn the GTK thread
//! - [`stop`]: Gracefully shutdown the application and join threads
//! - [`call`] / [`batch_call`]: Execute FFI calls to native libraries
//! - [`alloc`]: Allocate memory for boxed/structured types
//! - [`read`] / [`write`]: Access fields in boxed memory
//! - [`poll`]: Process pending JavaScript callbacks
//! - [`object`]: Retrieve internal object identifiers

mod alloc;
mod call;
mod object;
mod poll;
mod read;
mod start;
mod stop;
mod write;

pub use alloc::*;
pub use call::*;
pub use object::*;
pub use poll::*;
pub use read::*;
pub use start::*;
pub use stop::*;
pub use write::*;
