

use std::ffi::c_void;

use gtk4::glib;

#[derive(Debug)]
pub struct GVariant {
    ptr: *mut glib::ffi::GVariant,
    is_owned: bool,
}

impl GVariant {
    pub fn from_glib_full(ptr: *mut c_void) -> Self {
        Self {
            ptr: ptr as *mut glib::ffi::GVariant,
            is_owned: true,
        }
    }

    pub fn from_glib_none(ptr: *mut c_void) -> Self {
        if ptr.is_null() {
            return Self {
                ptr: std::ptr::null_mut(),
                is_owned: false,
            };
        }

        let variant_ptr = ptr as *mut glib::ffi::GVariant;
        unsafe {
            glib::ffi::g_variant_ref_sink(variant_ptr);
        }
        Self {
            ptr: variant_ptr,
            is_owned: true,
        }
    }

    pub fn as_ptr(&self) -> *mut c_void {
        self.ptr as *mut c_void
    }
}

impl AsRef<*mut c_void> for GVariant {
    fn as_ref(&self) -> &*mut c_void {
        unsafe { &*((&self.ptr) as *const *mut glib::ffi::GVariant as *const *mut c_void) }
    }
}

impl Clone for GVariant {
    fn clone(&self) -> Self {
        if self.ptr.is_null() {
            return Self {
                ptr: std::ptr::null_mut(),
                is_owned: false,
            };
        }

        unsafe {
            glib::ffi::g_variant_ref(self.ptr);
        }
        Self {
            ptr: self.ptr,
            is_owned: true,
        }
    }
}

impl Drop for GVariant {
    fn drop(&mut self) {
        if self.is_owned && !self.ptr.is_null() {
            unsafe {
                glib::ffi::g_variant_unref(self.ptr);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils;

    fn create_test_variant() -> *mut glib::ffi::GVariant {
        test_utils::ensure_gtk_init();
        unsafe {
            let ptr = glib::ffi::g_variant_new_int32(42);
            glib::ffi::g_variant_ref_sink(ptr);
            ptr
        }
    }

    #[test]
    fn from_glib_full_sets_owned_flag() {
        let ptr = create_test_variant();
        let variant = GVariant::from_glib_full(ptr as *mut c_void);

        assert!(variant.is_owned);
        assert!(!variant.ptr.is_null());
    }

    #[test]
    fn from_glib_full_null_ptr_safe() {
        let variant = GVariant::from_glib_full(std::ptr::null_mut());

        assert!(variant.is_owned);
        assert!(variant.ptr.is_null());
    }

    #[test]
    fn from_glib_none_refs_and_sinks() {
        let ptr = create_test_variant();
        let variant = GVariant::from_glib_none(ptr as *mut c_void);

        assert!(variant.is_owned);
        assert!(!variant.ptr.is_null());

        unsafe {
            glib::ffi::g_variant_unref(ptr);
        }
    }

    #[test]
    fn from_glib_none_null_ptr_not_owned() {
        let variant = GVariant::from_glib_none(std::ptr::null_mut());

        assert!(!variant.is_owned);
        assert!(variant.ptr.is_null());
    }

    #[test]
    fn as_ptr_returns_correct_pointer() {
        let ptr = create_test_variant();
        let variant = GVariant::from_glib_full(ptr as *mut c_void);

        assert_eq!(variant.as_ptr(), ptr as *mut c_void);
    }

    #[test]
    fn as_ref_returns_ptr_reference() {
        let ptr = create_test_variant();
        let variant = GVariant::from_glib_full(ptr as *mut c_void);
        let ptr_ref: &*mut c_void = variant.as_ref();

        assert_eq!(*ptr_ref, ptr as *mut c_void);
    }

    #[test]
    fn clone_increments_refcount() {
        let ptr = create_test_variant();
        let variant = GVariant::from_glib_full(ptr as *mut c_void);
        let cloned = variant.clone();

        assert!(cloned.is_owned);
        assert_eq!(cloned.ptr, variant.ptr);
    }

    #[test]
    fn clone_null_does_not_increment_refcount() {
        let variant = GVariant::from_glib_none(std::ptr::null_mut());
        let cloned = variant.clone();

        assert!(!cloned.is_owned);
        assert!(cloned.ptr.is_null());
    }

    #[test]
    fn drop_unrefs_owned_variant() {
        let ptr = create_test_variant();
        let variant = GVariant::from_glib_full(ptr as *mut c_void);
        drop(variant);
    }

    #[test]
    fn drop_does_not_unref_borrowed_variant() {
        let ptr = create_test_variant();
        let variant = GVariant {
            ptr,
            is_owned: false,
        };
        drop(variant);

        unsafe {
            glib::ffi::g_variant_unref(ptr);
        }
    }
}
