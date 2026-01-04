//! GObject boxed type wrapper with reference counting.
//!
//! [`Boxed`] wraps pointers to GObject boxed types (e.g., `GdkRGBA`, `PangoFontDescription`)
//! with proper ownership semantics. Boxed types are value types that are copied and freed
//! using GLib's `g_boxed_copy` and `g_boxed_free` functions.
//!
//! ## Ownership Modes
//!
//! - [`Boxed::from_glib_full`]: Takes ownership of an allocated boxed value.
//!   The wrapper will free it on drop.
//! - [`Boxed::from_glib_none`]: Copies a borrowed boxed value to avoid dangling pointers.
//!   The wrapper owns the copy and frees it on drop.
//!
//! ## Clone Behavior
//!
//! Cloning always creates an independent copy via `g_boxed_copy`, ensuring each
//! `Boxed` instance has exclusive ownership of its data.

use std::ffi::c_void;

use anyhow::bail;
use gtk4::glib::{self, translate::IntoGlib as _};

#[derive(Debug)]
pub struct Boxed {
    ptr: *mut c_void,
    gtype: Option<glib::Type>,
    is_owned: bool,
}

impl Boxed {
    #[must_use]
    pub fn from_glib_full(gtype: Option<glib::Type>, ptr: *mut c_void) -> Self {
        Self {
            ptr,
            gtype,
            is_owned: true,
        }
    }

    pub fn from_glib_none(gtype: Option<glib::Type>, ptr: *mut c_void) -> anyhow::Result<Self> {
        Self::from_glib_none_with_size(gtype, ptr, None, None)
    }

    pub fn from_glib_none_with_size(
        gtype: Option<glib::Type>,
        ptr: *mut c_void,
        size: Option<usize>,
        type_name: Option<&str>,
    ) -> anyhow::Result<Self> {
        if ptr.is_null() {
            return Ok(Self {
                ptr,
                gtype,
                is_owned: false,
            });
        }

        match gtype {
            Some(gt) => {
                let cloned_ptr =
                    unsafe { glib::gobject_ffi::g_boxed_copy(gt.into_glib(), ptr as *const _) };
                Ok(Self {
                    ptr: cloned_ptr,
                    gtype,
                    is_owned: true,
                })
            }
            None => {
                if let Some(s) = size {
                    let cloned_ptr = unsafe {
                        let dest = glib::ffi::g_malloc(s);
                        std::ptr::copy_nonoverlapping(ptr as *const u8, dest as *mut u8, s);
                        dest
                    };
                    Ok(Self {
                        ptr: cloned_ptr,
                        gtype: None,
                        is_owned: true,
                    })
                } else {
                    let name = type_name.unwrap_or("unknown");
                    bail!(
                        "Cannot safely copy boxed type '{}': no size info or gtype. \
                         Pointer {:p} may become dangling if the source is freed",
                        name,
                        ptr
                    )
                }
            }
        }
    }

    #[inline]
    #[must_use]
    pub fn as_ptr(&self) -> *mut c_void {
        self.ptr
    }

    #[must_use]
    pub fn gtype(&self) -> Option<glib::Type> {
        self.gtype
    }

    #[must_use]
    pub fn is_owned(&self) -> bool {
        self.is_owned
    }
}

impl Clone for Boxed {
    fn clone(&self) -> Self {
        if self.ptr.is_null() || !self.is_owned {
            return Self {
                ptr: self.ptr,
                gtype: self.gtype,
                is_owned: false,
            };
        }

        match self.gtype {
            Some(gt) => {
                let cloned_ptr = unsafe {
                    glib::gobject_ffi::g_boxed_copy(gt.into_glib(), self.ptr as *const _)
                };
                Self {
                    ptr: cloned_ptr,
                    gtype: self.gtype,
                    is_owned: true,
                }
            }
            None => Self {
                ptr: self.ptr,
                gtype: None,
                is_owned: false,
            },
        }
    }
}

impl Drop for Boxed {
    fn drop(&mut self) {
        if self.is_owned && !self.ptr.is_null() {
            unsafe {
                match self.gtype {
                    Some(gtype) => {
                        glib::gobject_ffi::g_boxed_free(gtype.into_glib(), self.ptr);
                    }
                    None => {
                        glib::ffi::g_free(self.ptr);
                    }
                }
            }
        }
    }
}
