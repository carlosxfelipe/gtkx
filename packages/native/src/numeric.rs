//! Unified numeric primitive handling for FFI operations.
//!
//! This module provides the [`NumericPrimitive`] trait that abstracts over all numeric
//! types (i8, u8, i16, u16, i32, u32, i64, u64, f32, f64) to eliminate repetitive
//! pattern matching on integer sizes and signs throughout the codebase.

use std::any::Any;

use libffi::middle as ffi;

use crate::cif;
use crate::types::{FloatSize, FloatType, IntegerSign, IntegerSize, IntegerType};

pub trait NumericPrimitive: Copy + 'static {
    fn from_f64(v: f64) -> Self;
    fn to_f64(self) -> f64;
    fn ffi_type() -> ffi::Type;
    fn to_cif_value(self) -> cif::Value;

    unsafe fn read_from_ptr(ptr: *const u8) -> Self;
    unsafe fn write_to_ptr(ptr: *mut u8, value: Self);

    fn downcast_vec(any: &dyn Any) -> Option<&Vec<Self>>;
}

macro_rules! impl_numeric_primitive {
    ($type:ty, $cif_variant:ident, $ffi_fn:ident) => {
        impl NumericPrimitive for $type {
            #[inline]
            fn from_f64(v: f64) -> Self {
                v as Self
            }

            #[inline]
            fn to_f64(self) -> f64 {
                self as f64
            }

            #[inline]
            fn ffi_type() -> ffi::Type {
                ffi::Type::$ffi_fn()
            }

            #[inline]
            fn to_cif_value(self) -> cif::Value {
                cif::Value::$cif_variant(self)
            }

            #[inline]
            unsafe fn read_from_ptr(ptr: *const u8) -> Self {
                unsafe { ptr.cast::<Self>().read_unaligned() }
            }

            #[inline]
            unsafe fn write_to_ptr(ptr: *mut u8, value: Self) {
                unsafe { ptr.cast::<Self>().write_unaligned(value) }
            }

            #[inline]
            fn downcast_vec(any: &dyn Any) -> Option<&Vec<Self>> {
                any.downcast_ref::<Vec<Self>>()
            }
        }
    };
}

impl_numeric_primitive!(i8, I8, i8);
impl_numeric_primitive!(u8, U8, u8);
impl_numeric_primitive!(i16, I16, i16);
impl_numeric_primitive!(u16, U16, u16);
impl_numeric_primitive!(i32, I32, i32);
impl_numeric_primitive!(u32, U32, u32);
impl_numeric_primitive!(i64, I64, i64);
impl_numeric_primitive!(u64, U64, u64);
impl_numeric_primitive!(f32, F32, f32);
impl_numeric_primitive!(f64, F64, f64);

impl IntegerType {
    pub fn dispatch<R, F>(self, f: F) -> R
    where
        F: NumericDispatch<R>,
    {
        match (self.size, self.sign) {
            (IntegerSize::_8, IntegerSign::Unsigned) => f.call::<u8>(),
            (IntegerSize::_8, IntegerSign::Signed) => f.call::<i8>(),
            (IntegerSize::_16, IntegerSign::Unsigned) => f.call::<u16>(),
            (IntegerSize::_16, IntegerSign::Signed) => f.call::<i16>(),
            (IntegerSize::_32, IntegerSign::Unsigned) => f.call::<u32>(),
            (IntegerSize::_32, IntegerSign::Signed) => f.call::<i32>(),
            (IntegerSize::_64, IntegerSign::Unsigned) => f.call::<u64>(),
            (IntegerSize::_64, IntegerSign::Signed) => f.call::<i64>(),
        }
    }

    pub fn to_cif_value(self, number: f64) -> cif::Value {
        self.dispatch(ToCifValue(number))
    }

    pub fn ffi_type(self) -> ffi::Type {
        self.dispatch(GetFfiType)
    }

    pub fn downcast_array_to_values(
        self,
        array_ptr: &cif::OwnedPtr,
    ) -> anyhow::Result<Vec<crate::value::Value>> {
        self.dispatch(DowncastArrayToValues(array_ptr))
    }
}

impl FloatType {
    pub fn dispatch<R, F>(self, f: F) -> R
    where
        F: NumericDispatch<R>,
    {
        match self.size {
            FloatSize::_32 => f.call::<f32>(),
            FloatSize::_64 => f.call::<f64>(),
        }
    }

    pub fn to_cif_value(self, number: f64) -> cif::Value {
        self.dispatch(ToCifValue(number))
    }

    pub fn ffi_type(self) -> ffi::Type {
        self.dispatch(GetFfiType)
    }

    pub fn downcast_array_to_values(
        self,
        array_ptr: &cif::OwnedPtr,
    ) -> anyhow::Result<Vec<crate::value::Value>> {
        self.dispatch(DowncastArrayToValues(array_ptr))
    }
}

pub trait NumericDispatch<R> {
    fn call<T: NumericPrimitive>(self) -> R;
}

struct ToCifValue(f64);

impl NumericDispatch<cif::Value> for ToCifValue {
    fn call<T: NumericPrimitive>(self) -> cif::Value {
        T::from_f64(self.0).to_cif_value()
    }
}

struct GetFfiType;

impl NumericDispatch<ffi::Type> for GetFfiType {
    fn call<T: NumericPrimitive>(self) -> ffi::Type {
        T::ffi_type()
    }
}

struct DowncastArrayToValues<'a>(&'a cif::OwnedPtr);

impl NumericDispatch<anyhow::Result<Vec<crate::value::Value>>> for DowncastArrayToValues<'_> {
    fn call<T: NumericPrimitive>(self) -> anyhow::Result<Vec<crate::value::Value>> {
        let vec = T::downcast_vec(&*self.0.value).ok_or_else(|| {
            anyhow::anyhow!(
                "Failed to downcast array items to Vec<{}>",
                std::any::type_name::<T>()
            )
        })?;

        Ok(vec
            .iter()
            .map(|v| crate::value::Value::Number(v.to_f64()))
            .collect())
    }
}

pub struct ReadFromPtr(*const u8);

impl ReadFromPtr {
    pub fn new(ptr: *const u8) -> Self {
        Self(ptr)
    }
}

impl NumericDispatch<f64> for ReadFromPtr {
    fn call<T: NumericPrimitive>(self) -> f64 {
        unsafe { T::read_from_ptr(self.0).to_f64() }
    }
}

pub struct WriteToPtr(*mut u8, f64);

impl WriteToPtr {
    pub fn new(ptr: *mut u8, value: f64) -> Self {
        Self(ptr, value)
    }
}

impl NumericDispatch<()> for WriteToPtr {
    fn call<T: NumericPrimitive>(self) {
        unsafe { T::write_to_ptr(self.0, T::from_f64(self.1)) }
    }
}
