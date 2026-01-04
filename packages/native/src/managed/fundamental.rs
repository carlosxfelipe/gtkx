//! GLib fundamental type wrapper with custom ref/unref functions.
//!
//! [`Fundamental`] wraps pointers to GLib fundamental types (e.g., `GVariant`, `GParamSpec`)
//! with proper ownership semantics. Unlike boxed types, fundamental types have custom
//! reference counting functions that must be looked up dynamically.
//!
//! ## Ownership Modes
//!
//! - [`Fundamental::from_glib_full`]: Takes ownership without incrementing ref count.
//!   The wrapper will unref on drop.
//! - [`Fundamental::from_glib_none`]: Refs the value to take a shared reference.
//!   The wrapper will unref on drop.
//!
//! ## Clone Behavior
//!
//! Cloning increments the reference count via the `ref_fn`, ensuring proper
//! reference counting semantics.

use std::ffi::c_void;

pub type UnrefFn = unsafe extern "C" fn(*mut c_void);
pub type RefFn = unsafe extern "C" fn(*mut c_void) -> *mut c_void;

#[derive(Debug)]
pub struct Fundamental {
    ptr: *mut c_void,
    unref_fn: Option<UnrefFn>,
    ref_fn: Option<RefFn>,
    is_owned: bool,
}

impl Fundamental {
    #[must_use]
    pub fn from_glib_full(
        ptr: *mut c_void,
        ref_fn: Option<RefFn>,
        unref_fn: Option<UnrefFn>,
    ) -> Self {
        Self {
            ptr,
            unref_fn,
            ref_fn,
            is_owned: true,
        }
    }

    /// Creates a new Fundamental from a borrowed pointer by incrementing the reference count.
    ///
    /// # Safety Contract
    ///
    /// This function is safe because:
    /// - The `ptr` comes from GLib/GTK FFI and is known to be valid when non-null
    /// - The `ref_fn` is obtained from `FundamentalType::lookup_fns` which looks up
    ///   the correct ref function for the type from GLib's type system
    /// - This follows the gtk-rs convention where `from_glib_none` is safe
    #[must_use]
    #[allow(clippy::not_unsafe_ptr_arg_deref)]
    pub fn from_glib_none(
        ptr: *mut c_void,
        ref_fn: Option<RefFn>,
        unref_fn: Option<UnrefFn>,
    ) -> Self {
        if ptr.is_null() {
            return Self {
                ptr: std::ptr::null_mut(),
                unref_fn,
                ref_fn,
                is_owned: false,
            };
        }

        if let Some(do_ref) = ref_fn {
            // SAFETY: ref_fn is a valid GLib ref function obtained from FundamentalType::lookup_fns
            unsafe { do_ref(ptr) };
        }

        Self {
            ptr,
            unref_fn,
            ref_fn,
            is_owned: true,
        }
    }

    #[inline]
    #[must_use]
    pub fn as_ptr(&self) -> *mut c_void {
        self.ptr
    }

    #[must_use]
    pub fn is_owned(&self) -> bool {
        self.is_owned
    }
}

impl Clone for Fundamental {
    fn clone(&self) -> Self {
        if self.ptr.is_null() {
            return Self {
                ptr: std::ptr::null_mut(),
                unref_fn: self.unref_fn,
                ref_fn: self.ref_fn,
                is_owned: false,
            };
        }

        if let Some(ref_fn) = self.ref_fn {
            unsafe { ref_fn(self.ptr) };
        }

        Self {
            ptr: self.ptr,
            unref_fn: self.unref_fn,
            ref_fn: self.ref_fn,
            is_owned: true,
        }
    }
}

impl Drop for Fundamental {
    fn drop(&mut self) {
        if self.is_owned
            && !self.ptr.is_null()
            && let Some(unref_fn) = self.unref_fn
        {
            unsafe { unref_fn(self.ptr) };
        }
    }
}
