use std::ffi::c_void;

use gtk4::glib::{self, gobject_ffi, translate::ToGlibPtrMut as _};

unsafe extern "C" fn destroy_trampoline(user_data: *mut c_void) {
    unsafe {
        let closure_ptr = user_data as *mut gobject_ffi::GClosure;
        if closure_ptr.is_null() {
            return;
        }

        gobject_ffi::g_closure_invoke(
            closure_ptr,
            std::ptr::null_mut(),
            0,
            std::ptr::null(),
            std::ptr::null_mut(),
        );

        gobject_ffi::g_closure_unref(closure_ptr);
    }
}

pub fn get_destroy_trampoline_ptr() -> *mut c_void {
    destroy_trampoline as *mut c_void
}

unsafe extern "C" fn source_func_trampoline(user_data: *mut c_void) -> i32 {
    unsafe {
        let closure_ptr = user_data as *mut gobject_ffi::GClosure;
        if closure_ptr.is_null() {
            return 0; // G_SOURCE_REMOVE
        }

        let mut return_value = glib::Value::from_type_unchecked(glib::types::Type::BOOL);

        gobject_ffi::g_closure_invoke(
            closure_ptr,
            return_value.to_glib_none_mut().0,
            0,
            std::ptr::null(),
            std::ptr::null_mut(),
        );

        let result = return_value.get::<bool>().unwrap_or(false);

        if !result {
            gobject_ffi::g_closure_unref(closure_ptr);
        }

        if result { 1 } else { 0 }
    }
}

pub fn get_source_func_trampoline_ptr() -> *mut c_void {
    source_func_trampoline as *mut c_void
}
