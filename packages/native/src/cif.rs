//! FFI Call Interface (CIF) value types and conversions.
//!
//! This module provides types for representing values in libffi calls,
//! including owned pointers that manage memory lifetime and conversion
//! from argument types to CIF-compatible representations.

use std::{
    any::Any,
    ffi::{CString, c_void},
    sync::Arc,
};

use anyhow::bail;
use gtk4::glib::{self, translate::IntoGlib as _};
use libffi::middle as libffi;
use neon::prelude::*;

use crate::{
    arg::{self, Arg},
    gtk_dispatch, js_dispatch,
    object::ObjectId,
    trampolines,
    types::*,
    value,
};

fn type_mismatch(expected: &str, type_name: &str, actual: &value::Value) -> anyhow::Error {
    anyhow::anyhow!(
        "Expected {} for {} type, got {:?}",
        expected,
        type_name,
        actual
    )
}

fn extract_object_ptr(
    value: &value::Value,
    type_name: &str,
    gc_error_msg: &str,
) -> anyhow::Result<*mut c_void> {
    let object_id = match value {
        value::Value::Object(id) => Some(id),
        value::Value::Null | value::Value::Undefined => None,
        _ => return Err(type_mismatch("an Object", type_name, value)),
    };

    match object_id {
        Some(id) => id.as_ptr().ok_or_else(|| anyhow::anyhow!("{}", gc_error_msg)),
        None => Ok(std::ptr::null_mut()),
    }
}

/// A pointer that owns its referenced data.
///
/// This struct ensures that heap-allocated data passed to FFI calls
/// remains valid for the duration of the call. The `value` field holds
/// the actual Rust value, while `ptr` points to its memory location.
#[derive(Debug)]
#[repr(C)]
pub struct OwnedPtr {
    /// Raw pointer to the data.
    pub ptr: *mut c_void,
    /// Boxed value that owns the data, ensuring it lives long enough.
    pub value: Box<dyn Any>,
}

/// A value representation for libffi function calls.
///
/// Each variant corresponds to a C type that can be passed to or returned
/// from FFI calls. This includes primitive types, pointers, and special
/// callback trampolines for GTK signal handlers.
#[derive(Debug)]
pub enum Value {
    /// Unsigned 8-bit integer.
    U8(u8),
    /// Signed 8-bit integer.
    I8(i8),
    /// Unsigned 16-bit integer.
    U16(u16),
    /// Signed 16-bit integer.
    I16(i16),
    /// Unsigned 32-bit integer.
    U32(u32),
    /// Signed 32-bit integer.
    I32(i32),
    /// Unsigned 64-bit integer.
    U64(u64),
    /// Signed 64-bit integer.
    I64(i64),
    /// 32-bit floating point.
    F32(f32),
    /// 64-bit floating point.
    F64(f64),
    /// Raw pointer (borrowed, not owned).
    Ptr(*mut c_void),
    /// Pointer with owned data that must outlive the FFI call.
    OwnedPtr(OwnedPtr),
    /// Callback with trampoline function for GTK signals.
    TrampolineCallback(TrampolineCallbackValue),
    /// Void (no value).
    Void,
}

/// A callback value with a trampoline for GTK signal handling.
///
/// GTK callbacks require C-compatible function pointers, but we need to
/// invoke JavaScript callbacks. This struct holds the FFI arguments
/// in the correct order for the specific trampoline type.
#[derive(Debug)]
pub struct TrampolineCallbackValue {
    /// The GLib closure containing the JavaScript callback (kept alive for FFI call).
    #[allow(dead_code)]
    closure: OwnedPtr,
    /// FFI arguments in the correct order for this trampoline type.
    ffi_args: Vec<*mut c_void>,
}

impl TrampolineCallbackValue {
    /// Creates a new trampoline callback with FFI args in the correct order.
    fn new(
        trampoline_type: CallbackTrampoline,
        trampoline_ptr: *mut c_void,
        closure_ptr: *mut c_void,
    ) -> Self {
        let ffi_args = match trampoline_type {
            CallbackTrampoline::Closure => vec![],
            CallbackTrampoline::AsyncReady => {
                vec![trampoline_ptr, closure_ptr]
            }
            CallbackTrampoline::Destroy => {
                vec![closure_ptr, trampoline_ptr]
            }
            CallbackTrampoline::DrawFunc => {
                vec![
                    trampoline_ptr,
                    closure_ptr,
                    trampolines::get_unref_closure_trampoline_ptr(),
                ]
            }
        };

        Self {
            closure: OwnedPtr::new((), closure_ptr),
            ffi_args,
        }
    }

    /// Returns references to the FFI arguments for use with libffi.
    pub fn ffi_arg_refs(&self) -> impl Iterator<Item = &*mut c_void> {
        self.ffi_args.iter()
    }
}

impl OwnedPtr {
    /// Creates a new owned pointer from a value and its raw pointer.
    ///
    /// The value is boxed to ensure it outlives the FFI call.
    pub fn new<T: 'static>(value: T, ptr: *mut c_void) -> Self {
        Self {
            value: Box::new(value),
            ptr,
        }
    }

    /// Creates an OwnedPtr from a Vec, safely capturing the pointer to its buffer.
    ///
    /// This is preferred over `new` for Vec types because it captures the pointer
    /// after the Vec is boxed, avoiding reliance on move semantics.
    pub fn from_vec<T: 'static>(vec: Vec<T>) -> Self {
        let boxed: Box<Vec<T>> = Box::new(vec);
        let ptr = boxed.as_ptr() as *mut c_void;
        Self {
            value: boxed,
            ptr,
        }
    }
}

fn wait_for_js_result<T, F>(
    rx: std::sync::mpsc::Receiver<Result<value::Value, ()>>,
    on_result: F,
) -> T
where
    F: FnOnce(Result<value::Value, ()>) -> T,
{
    loop {
        gtk_dispatch::dispatch_pending();

        match rx.try_recv() {
            Ok(result) => return on_result(result),
            Err(std::sync::mpsc::TryRecvError::Empty) => {
                std::thread::yield_now();
            }
            Err(std::sync::mpsc::TryRecvError::Disconnected) => {
                return on_result(Err(()));
            }
        }
    }
}

fn invoke_and_wait_for_js_result<T, F>(
    channel: &Channel,
    callback: &Arc<Root<JsFunction>>,
    args_values: Vec<value::Value>,
    capture_result: bool,
    on_result: F,
) -> T
where
    F: FnOnce(Result<value::Value, ()>) -> T,
{
    let rx = if gtk_dispatch::is_js_waiting() {
        js_dispatch::queue(callback.clone(), args_values, capture_result)
    } else {
        js_dispatch::queue_with_wakeup(channel, callback.clone(), args_values, capture_result)
    };

    wait_for_js_result(rx, on_result)
}

/// Transfers ownership of a closure to C, returning a raw pointer.
///
/// This adds a reference to the closure (and sinks any floating reference),
/// returning a pointer that the caller is responsible for eventually unreffing.
/// Use this when Rust retains ownership and will drop the closure later.
fn closure_to_glib_full(closure: &glib::Closure) -> *mut c_void {
    use glib::translate::ToGlibPtr as _;
    let ptr: *mut glib::gobject_ffi::GClosure = closure.to_glib_full();
    ptr as *mut c_void
}

/// Transfers full ownership of a closure to C for async callbacks.
///
/// Unlike `closure_to_glib_full`, this completely transfers ownership to C
/// by using `forget()` to prevent Rust from dropping the closure. Use this
/// for callbacks that may be invoked asynchronously after the FFI call returns
/// (e.g., idle sources, timeouts) where a destroy notify will handle cleanup.
fn closure_ptr_for_transfer(closure: glib::Closure) -> *mut c_void {
    use glib::translate::ToGlibPtr as _;
    let stash: glib::translate::Stash<*mut glib::gobject_ffi::GClosure, _> = closure.to_glib_none();
    let ptr = stash.0 as *mut c_void;
    std::mem::forget(closure);
    ptr
}

fn convert_glib_args(
    args: &[glib::Value],
    arg_types: &Option<Vec<Type>>,
) -> anyhow::Result<Vec<value::Value>> {
    match arg_types {
        Some(types) => args
            .iter()
            .zip(types.iter())
            .map(|(gval, type_)| value::Value::from_glib_value(gval, type_))
            .collect(),
        None => args.iter().map(value::Value::try_from).collect(),
    }
}

fn build_trampoline_callback(
    trampoline_type: CallbackTrampoline,
    closure: glib::Closure,
    get_trampoline: fn() -> *mut c_void,
) -> Value {
    let closure_ptr = closure_ptr_for_transfer(closure);
    let trampoline_ptr = get_trampoline();

    Value::TrampolineCallback(TrampolineCallbackValue::new(
        trampoline_type,
        trampoline_ptr,
        closure_ptr,
    ))
}

impl TryFrom<arg::Arg> for Value {
    type Error = anyhow::Error;

    fn try_from(arg: arg::Arg) -> anyhow::Result<Value> {
        match &arg.type_ {
            Type::Integer(type_) => {
                let number = match arg.value {
                    value::Value::Number(n) => n,
                    value::Value::Null | value::Value::Undefined if arg.optional => 0.0,
                    _ => return Err(type_mismatch("a Number", "integer", &arg.value)),
                };

                Ok(type_.to_cif_value(number))
            }
            Type::Float(type_) => {
                let number = match arg.value {
                    value::Value::Number(n) => n,
                    _ => return Err(type_mismatch("a Number", "float", &arg.value)),
                };

                Ok(type_.to_cif_value(number))
            }
            Type::String(_) => match &arg.value {
                value::Value::String(s) => {
                    let cstring = CString::new(s.as_bytes())?;
                    let ptr = cstring.as_ptr() as *mut c_void;
                    Ok(Value::OwnedPtr(OwnedPtr::new(cstring, ptr)))
                }
                value::Value::Null | value::Value::Undefined => {
                    Ok(Value::Ptr(std::ptr::null_mut()))
                }
                _ => Err(type_mismatch("a String", "string", &arg.value)),
            },
            Type::Boolean => {
                let boolean = match arg.value {
                    value::Value::Boolean(b) => b,
                    _ => return Err(type_mismatch("a Boolean", "boolean", &arg.value)),
                };

                Ok(Value::U8(u8::from(boolean)))
            }
            Type::Null => Ok(Value::Ptr(std::ptr::null_mut())),
            Type::Undefined => Ok(Value::Ptr(std::ptr::null_mut())),
            Type::GObject(_) => {
                let ptr = extract_object_ptr(
                    &arg.value,
                    "gobject",
                    "GObject has been garbage collected",
                )?;
                Ok(Value::Ptr(ptr))
            }
            Type::Boxed(type_) => {
                let ptr = extract_object_ptr(
                    &arg.value,
                    "boxed",
                    "Boxed object has been garbage collected",
                )?;

                let is_transfer_full = !type_.is_borrowed && !ptr.is_null();

                if is_transfer_full && let Some(gtype) = type_.get_gtype() {
                    unsafe {
                        let copied =
                            glib::gobject_ffi::g_boxed_copy(gtype.into_glib(), ptr as *const _);
                        return Ok(Value::Ptr(copied));
                    }
                }

                Ok(Value::Ptr(ptr))
            }
            Type::Array(type_) => Value::try_from_array(&arg, type_),
            Type::Callback(type_) => Value::try_from_callback(&arg, type_),
            Type::Ref(type_) => Value::try_from_ref(&arg, type_),
        }
    }
}

impl Value {
    /// Returns a raw pointer to this value's data.
    ///
    /// # Panics
    ///
    /// Panics if called on a `TrampolineCallback` variant, which requires
    /// special multi-pointer handling in the call module.
    pub fn as_ptr(&self) -> *mut c_void {
        match self {
            Value::U8(value) => value as *const u8 as *mut c_void,
            Value::I8(value) => value as *const i8 as *mut c_void,
            Value::U16(value) => value as *const u16 as *mut c_void,
            Value::I16(value) => value as *const i16 as *mut c_void,
            Value::U32(value) => value as *const u32 as *mut c_void,
            Value::I32(value) => value as *const i32 as *mut c_void,
            Value::U64(value) => value as *const u64 as *mut c_void,
            Value::I64(value) => value as *const i64 as *mut c_void,
            Value::F32(value) => value as *const f32 as *mut c_void,
            Value::F64(value) => value as *const f64 as *mut c_void,
            Value::Ptr(ptr) => ptr as *const *mut c_void as *mut c_void,
            Value::OwnedPtr(owned_ptr) => owned_ptr as *const OwnedPtr as *mut c_void,
            Value::TrampolineCallback(_) => {
                unreachable!(
                    "TrampolineCallback should not be converted to a single pointer - it requires special handling in call.rs"
                )
            }
            Value::Void => std::ptr::null_mut(),
        }
    }

    fn try_from_array(arg: &arg::Arg, type_: &ArrayType) -> anyhow::Result<Value> {
        let array = match &arg.value {
            value::Value::Array(arr) => arr,
            _ => return Err(type_mismatch("an Array", "array", &arg.value)),
        };

        match *type_.item_type {
            Type::Integer(type_) => {
                let mut values = Vec::new();

                for value in array {
                    match value {
                        value::Value::Number(n) => values.push(n),
                        _ => return Err(type_mismatch("a Number", "integer item", value)),
                    }
                }

                match (type_.size, type_.sign) {
                    (IntegerSize::_8, IntegerSign::Unsigned) => {
                        let values: Vec<u8> = values.iter().map(|&v| *v as u8).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                    (IntegerSize::_8, IntegerSign::Signed) => {
                        let values: Vec<i8> = values.iter().map(|&v| *v as i8).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                    (IntegerSize::_16, IntegerSign::Unsigned) => {
                        let values: Vec<u16> = values.iter().map(|&v| *v as u16).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                    (IntegerSize::_16, IntegerSign::Signed) => {
                        let values: Vec<i16> = values.iter().map(|&v| *v as i16).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                    (IntegerSize::_32, IntegerSign::Unsigned) => {
                        let values: Vec<u32> = values.iter().map(|&v| *v as u32).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                    (IntegerSize::_32, IntegerSign::Signed) => {
                        let values: Vec<i32> = values.iter().map(|&v| *v as i32).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                    (IntegerSize::_64, IntegerSign::Unsigned) => {
                        let values: Vec<u64> = values.iter().map(|&v| *v as u64).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                    (IntegerSize::_64, IntegerSign::Signed) => {
                        let values: Vec<i64> = values.iter().map(|&v| *v as i64).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                }
            }
            Type::Float(type_) => {
                let mut values = Vec::new();

                for value in array {
                    match value {
                        value::Value::Number(n) => values.push(n),
                        _ => return Err(type_mismatch("a Number", "float item", value)),
                    }
                }

                match type_.size {
                    FloatSize::_32 => {
                        let values: Vec<f32> = values.iter().map(|&v| *v as f32).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                    FloatSize::_64 => {
                        let values: Vec<f64> = values.iter().map(|&v| *v).collect();
                        Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
                    }
                }
            }
            Type::String(_) => {
                let mut cstrings = Vec::new();

                for v in array {
                    match v {
                        value::Value::String(s) => {
                            cstrings.push(CString::new(s.as_bytes())?);
                        }
                        _ => return Err(type_mismatch("a String", "string item", v)),
                    }
                }

                let mut ptrs: Vec<*mut c_void> =
                    cstrings.iter().map(|s| s.as_ptr() as *mut c_void).collect();

                ptrs.push(std::ptr::null_mut());

                let boxed: Box<(Vec<CString>, Vec<*mut c_void>)> = Box::new((cstrings, ptrs));
                let ptr = boxed.1.as_ptr() as *mut c_void;

                Ok(Value::OwnedPtr(OwnedPtr { value: boxed, ptr }))
            }
            Type::GObject(_) | Type::Boxed(_) => {
                let mut ids = Vec::new();

                for value in array {
                    match value {
                        value::Value::Object(id) => ids.push(*id),
                        _ => return Err(type_mismatch("an Object", "object item", value)),
                    }
                }

                let mut ptrs: Vec<*mut c_void> = Vec::with_capacity(ids.len());
                for id in &ids {
                    match id.as_ptr() {
                        Some(ptr) => ptrs.push(ptr),
                        None => bail!("GObject in array has been garbage collected"),
                    }
                }

                let boxed: Box<(Vec<ObjectId>, Vec<*mut c_void>)> = Box::new((ids, ptrs));
                let ptr = boxed.1.as_ptr() as *mut c_void;

                Ok(Value::OwnedPtr(OwnedPtr { value: boxed, ptr }))
            }
            Type::Boolean => {
                let mut values = Vec::new();

                for value in array {
                    match value {
                        value::Value::Boolean(b) => values.push(u8::from(*b)),
                        _ => return Err(type_mismatch("a Boolean", "boolean item", value)),
                    }
                }

                Ok(Value::OwnedPtr(OwnedPtr::from_vec(values)))
            }
            _ => bail!("Unsupported array item type: {:?}", type_.item_type),
        }
    }

    fn try_from_callback(arg: &arg::Arg, type_: &CallbackType) -> anyhow::Result<Value> {
        let cb = match &arg.value {
            value::Value::Callback(callback) => callback,
            value::Value::Null | value::Value::Undefined if arg.optional => {
                return Ok(Value::Ptr(std::ptr::null_mut()));
            }
            _ => return Err(type_mismatch("a Callback", "callback", &arg.value)),
        };

        let channel = cb.channel.clone();
        let callback = cb.js_func.clone();

        match type_.trampoline {
            CallbackTrampoline::Closure => {
                let arg_types = type_.arg_types.clone();
                let return_type = type_.return_type.clone();

                let closure = glib::Closure::new(move |args: &[glib::Value]| {
                    let return_type_inner = *return_type.clone().unwrap_or(Box::new(Type::Undefined));

                    let args_values = match convert_glib_args(args, &arg_types) {
                        Ok(v) => v,
                        Err(_) => {
                            return value::Value::into_glib_value_with_default(
                                value::Value::Undefined,
                                Some(&return_type_inner),
                            );
                        }
                    };

                    invoke_and_wait_for_js_result(
                        &channel,
                        &callback,
                        args_values,
                        true,
                        |result| match result {
                            Ok(value) => value::Value::into_glib_value_with_default(
                                value,
                                Some(&return_type_inner),
                            ),
                            Err(_) => value::Value::into_glib_value_with_default(
                                value::Value::Undefined,
                                Some(&return_type_inner),
                            ),
                        },
                    )
                });

                let closure_ptr = closure_to_glib_full(&closure);
                Ok(Value::OwnedPtr(OwnedPtr::new(closure, closure_ptr)))
            }

            CallbackTrampoline::AsyncReady => {
                let source_type = type_.source_type.clone().unwrap_or(Box::new(Type::Null));
                let result_type = type_.result_type.clone().unwrap_or(Box::new(Type::Null));

                let closure = glib::Closure::new(move |args: &[glib::Value]| {
                    let source_value = args
                        .first()
                        .and_then(|gval| value::Value::from_glib_value(gval, &source_type).ok())
                        .unwrap_or(value::Value::Null);

                    let result_value = args
                        .get(1)
                        .and_then(|gval| value::Value::from_glib_value(gval, &result_type).ok())
                        .unwrap_or(value::Value::Null);

                    let args_values = vec![source_value, result_value];

                    invoke_and_wait_for_js_result(
                        &channel,
                        &callback,
                        args_values,
                        false,
                        |_| None::<glib::Value>,
                    )
                });

                Ok(build_trampoline_callback(
                    CallbackTrampoline::AsyncReady,
                    closure,
                    trampolines::get_async_ready_trampoline_ptr,
                ))
            }

            CallbackTrampoline::Destroy => {
                let closure = glib::Closure::new(move |_args: &[glib::Value]| {
                    invoke_and_wait_for_js_result(
                        &channel,
                        &callback,
                        vec![],
                        false,
                        |_| None::<glib::Value>,
                    )
                });

                Ok(build_trampoline_callback(
                    CallbackTrampoline::Destroy,
                    closure,
                    trampolines::get_destroy_trampoline_ptr,
                ))
            }

            CallbackTrampoline::DrawFunc => {
                let arg_types = type_.arg_types.clone();

                let closure = glib::Closure::new(move |args: &[glib::Value]| {
                    let args_values = match convert_glib_args(args, &arg_types) {
                        Ok(v) => v,
                        Err(_) => return None,
                    };

                    invoke_and_wait_for_js_result(
                        &channel,
                        &callback,
                        args_values,
                        false,
                        |_| None::<glib::Value>,
                    )
                });

                Ok(build_trampoline_callback(
                    CallbackTrampoline::DrawFunc,
                    closure,
                    trampolines::get_draw_func_trampoline_ptr,
                ))
            }
        }
    }

    fn try_from_ref(arg: &arg::Arg, type_: &RefType) -> anyhow::Result<Value> {
        let r#ref = match &arg.value {
            value::Value::Ref(r#ref) => r#ref,
            value::Value::Null | value::Value::Undefined => {
                return Ok(Value::Ptr(std::ptr::null_mut()));
            }
            _ => return Err(type_mismatch("a Ref", "ref", &arg.value)),
        };

        // For Boxed and GObject types, check if caller allocated the memory.
        // - If value is an ObjectId: caller-allocates, pass pointer directly (GTK writes INTO memory)
        // - If value is null/undefined: GTK-allocates, pass pointer-to-pointer (GTK writes pointer back)
        match &*type_.inner_type {
            Type::Boxed(_) | Type::GObject(_) => {
                match &*r#ref.value {
                    value::Value::Object(id) => {
                        // Caller-allocates: pass the pointer directly
                        let ptr = id.as_ptr().ok_or_else(|| {
                            anyhow::anyhow!("Ref object has been garbage collected")
                        })?;
                        Ok(Value::Ptr(ptr))
                    }
                    value::Value::Null | value::Value::Undefined => {
                        // GTK-allocates: need pointer-to-pointer semantics
                        // Create heap storage for the pointer, initialized to null.
                        // FFI passes the value at &owned_ptr.ptr to C, which is the address
                        // of this storage. C writes the allocated pointer into this storage.
                        let ptr_storage: Box<*mut c_void> = Box::new(std::ptr::null_mut());
                        let ptr = ptr_storage.as_ref() as *const *mut c_void as *mut c_void;
                        Ok(Value::OwnedPtr(OwnedPtr {
                            ptr,
                            value: ptr_storage,
                        }))
                    }
                    _ => Err(type_mismatch(
                        "an Object or Null",
                        "Ref<Boxed/GObject>",
                        &r#ref.value,
                    ))
                }
            }
            _ => {
                // For primitive types, create storage and pass pointer to it
                let ref_arg = Arg::new(*type_.inner_type.clone(), *r#ref.value.clone());
                let ref_value = Box::new(Value::try_from(ref_arg)?);
                let ref_ptr = ref_value.as_ptr();

                Ok(Value::OwnedPtr(OwnedPtr {
                    value: ref_value,
                    ptr: ref_ptr,
                }))
            }
        }
    }
}

impl<'a> From<&'a Value> for libffi::Arg<'a> {
    fn from(arg: &'a Value) -> Self {
        match arg {
            Value::U8(value) => libffi::arg(value),
            Value::I8(value) => libffi::arg(value),
            Value::U16(value) => libffi::arg(value),
            Value::I16(value) => libffi::arg(value),
            Value::U32(value) => libffi::arg(value),
            Value::I32(value) => libffi::arg(value),
            Value::U64(value) => libffi::arg(value),
            Value::I64(value) => libffi::arg(value),
            Value::F32(value) => libffi::arg(value),
            Value::F64(value) => libffi::arg(value),
            Value::Ptr(ptr) => libffi::arg(ptr),
            Value::OwnedPtr(owned_ptr) => libffi::arg(&owned_ptr.ptr),
            Value::TrampolineCallback(_) => {
                unreachable!("TrampolineCallback should be handled specially in call.rs")
            }
            Value::Void => libffi::arg(&()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils;
    use std::ffi::CString;
    use std::sync::{
        Arc,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    };

    #[test]
    fn owned_ptr_new_stores_value_and_ptr() {
        let data = vec![1u32, 2, 3, 4, 5];
        let ptr = data.as_ptr() as *mut c_void;
        let owned = OwnedPtr::new(data, ptr);

        assert_eq!(owned.ptr, ptr);
    }

    #[test]
    fn owned_ptr_from_vec_captures_correct_pointer() {
        let data = vec![10u64, 20, 30];
        let owned = OwnedPtr::from_vec(data);

        unsafe {
            let slice = std::slice::from_raw_parts(owned.ptr as *const u64, 3);
            assert_eq!(slice, &[10, 20, 30]);
        }
    }

    #[test]
    fn owned_ptr_keeps_cstring_alive() {
        let cstring = CString::new("test string").unwrap();
        let ptr = cstring.as_ptr() as *mut c_void;
        let owned = OwnedPtr::new(cstring, ptr);

        unsafe {
            let s = std::ffi::CStr::from_ptr(owned.ptr as *const i8);
            assert_eq!(s.to_str().unwrap(), "test string");
        }
    }

    #[test]
    fn owned_ptr_tuple_keeps_both_alive() {
        let strings = vec![
            CString::new("hello").unwrap(),
            CString::new("world").unwrap(),
        ];
        let ptrs: Vec<*mut c_void> = strings.iter().map(|s| s.as_ptr() as *mut c_void).collect();
        let tuple_ptr = ptrs.as_ptr() as *mut c_void;

        let owned = OwnedPtr::new((strings, ptrs), tuple_ptr);

        unsafe {
            let ptr_slice = std::slice::from_raw_parts(owned.ptr as *const *const i8, 2);
            let s0 = std::ffi::CStr::from_ptr(ptr_slice[0]);
            let s1 = std::ffi::CStr::from_ptr(ptr_slice[1]);
            assert_eq!(s0.to_str().unwrap(), "hello");
            assert_eq!(s1.to_str().unwrap(), "world");
        }
    }

    #[test]
    fn owned_ptr_drops_value_when_dropped() {
        let drop_counter = Arc::new(AtomicUsize::new(0));

        struct DropTracker {
            counter: Arc<AtomicUsize>,
        }

        impl Drop for DropTracker {
            fn drop(&mut self) {
                self.counter.fetch_add(1, Ordering::SeqCst);
            }
        }

        {
            let tracker = DropTracker {
                counter: Arc::clone(&drop_counter),
            };
            let _owned = OwnedPtr::new(tracker, std::ptr::null_mut());
        }

        assert_eq!(drop_counter.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn closure_to_glib_full_increments_refcount() {
        test_utils::ensure_gtk_init();

        let closure = glib::Closure::new(|_| None::<glib::Value>);

        let initial_ref = {
            use glib::translate::ToGlibPtr as _;
            let ptr: *mut glib::gobject_ffi::GClosure = closure.to_glib_none().0;
            unsafe { (*ptr).ref_count }
        };

        let ptr = closure_to_glib_full(&closure);

        let after_ref = unsafe { (*(ptr as *mut glib::gobject_ffi::GClosure)).ref_count };

        assert!(after_ref > initial_ref);

        unsafe {
            glib::gobject_ffi::g_closure_unref(ptr as *mut _);
        }
    }

    #[test]
    fn closure_ptr_for_transfer_returns_valid_ptr() {
        test_utils::ensure_gtk_init();

        let invoked = Arc::new(AtomicBool::new(false));
        let invoked_clone = invoked.clone();

        let closure = glib::Closure::new(move |_| {
            invoked_clone.store(true, Ordering::SeqCst);
            None::<glib::Value>
        });

        let ptr = closure_ptr_for_transfer(closure);

        assert!(!ptr.is_null());

        unsafe {
            glib::gobject_ffi::g_closure_invoke(
                ptr as *mut glib::gobject_ffi::GClosure,
                std::ptr::null_mut(),
                0,
                std::ptr::null(),
                std::ptr::null_mut(),
            );
        }

        assert!(invoked.load(Ordering::SeqCst));

        unsafe {
            glib::gobject_ffi::g_closure_unref(ptr as *mut _);
        }
    }

    #[test]
    fn closure_captured_values_survive_transfer() {
        test_utils::ensure_gtk_init();

        let data = Arc::new(AtomicUsize::new(0));
        let data_clone = data.clone();

        let closure = glib::Closure::new(move |_| {
            data_clone.fetch_add(1, Ordering::SeqCst);
            None::<glib::Value>
        });

        let ptr = closure_ptr_for_transfer(closure);

        for _ in 0..5 {
            unsafe {
                glib::gobject_ffi::g_closure_invoke(
                    ptr as *mut glib::gobject_ffi::GClosure,
                    std::ptr::null_mut(),
                    0,
                    std::ptr::null(),
                    std::ptr::null_mut(),
                );
            }
        }

        assert_eq!(data.load(Ordering::SeqCst), 5);

        unsafe {
            glib::gobject_ffi::g_closure_unref(ptr as *mut _);
        }
    }
}
