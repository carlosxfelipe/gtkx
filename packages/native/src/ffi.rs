use std::ffi::c_void;
use std::ptr::NonNull;

use gtk4::glib::{self, gobject_ffi};
use libffi::middle as libffi;

use crate::arg::Arg;
use crate::types::IntegerKind;
use crate::value;

#[derive(Debug)]
#[repr(C)]
pub struct Stash {
    ptr: *mut c_void,
    storage: StashStorage,
}

#[derive(Debug)]
pub enum StashStorage {
    Unit,
    U8Vec(Vec<u8>),
    I8Vec(Vec<i8>),
    U16Vec(Vec<u16>),
    I16Vec(Vec<i16>),
    U32Vec(Vec<u32>),
    I32Vec(Vec<i32>),
    U64Vec(Vec<u64>),
    I64Vec(Vec<i64>),
    F32Vec(Vec<f32>),
    F64Vec(Vec<f64>),
    StringArray(Vec<std::ffi::CString>, Vec<*mut c_void>),
    ObjectArray(Vec<crate::managed::ObjectId>, Vec<*mut c_void>),
    CString(std::ffi::CString),
    Buffer(Vec<u8>),
    Boxed(Box<FfiValue>),
    PtrStorage(Box<*mut c_void>),
    HashTable(HashTableData),
    Callback(*mut c_void),
}

#[derive(Debug)]
pub struct HashTableData {
    pub handle: *mut glib::ffi::GHashTable,
    pub keys: HashTableStorage,
    pub values: HashTableStorage,
}

#[derive(Debug)]
pub enum HashTableStorage {
    Strings(Vec<std::ffi::CString>),
    Integers,
}

impl Stash {
    pub fn new(ptr: *mut c_void, storage: StashStorage) -> Self {
        Self { ptr, storage }
    }

    pub fn unit(ptr: *mut c_void) -> Self {
        Self {
            ptr,
            storage: StashStorage::Unit,
        }
    }

    #[inline]
    pub fn ptr(&self) -> *mut c_void {
        self.ptr
    }

    #[inline]
    pub fn ptr_ref(&self) -> &*mut c_void {
        &self.ptr
    }

    pub fn storage(&self) -> &StashStorage {
        &self.storage
    }

    pub fn as_numeric_slice(&self, kind: IntegerKind) -> anyhow::Result<Vec<f64>> {
        match (&self.storage, kind) {
            (StashStorage::U8Vec(v), IntegerKind::U8) => Ok(v.iter().map(|&x| x as f64).collect()),
            (StashStorage::I8Vec(v), IntegerKind::I8) => Ok(v.iter().map(|&x| x as f64).collect()),
            (StashStorage::U16Vec(v), IntegerKind::U16) => {
                Ok(v.iter().map(|&x| x as f64).collect())
            }
            (StashStorage::I16Vec(v), IntegerKind::I16) => {
                Ok(v.iter().map(|&x| x as f64).collect())
            }
            (StashStorage::U32Vec(v), IntegerKind::U32) => {
                Ok(v.iter().map(|&x| x as f64).collect())
            }
            (StashStorage::I32Vec(v), IntegerKind::I32) => {
                Ok(v.iter().map(|&x| x as f64).collect())
            }
            (StashStorage::U64Vec(v), IntegerKind::U64) => {
                Ok(v.iter().map(|&x| x as f64).collect())
            }
            (StashStorage::I64Vec(v), IntegerKind::I64) => {
                Ok(v.iter().map(|&x| x as f64).collect())
            }
            _ => anyhow::bail!("Stash storage does not match integer kind {:?}", kind),
        }
    }

    pub fn as_f32_slice(&self) -> anyhow::Result<&[f32]> {
        match &self.storage {
            StashStorage::F32Vec(v) => Ok(v),
            _ => anyhow::bail!("Stash does not contain f32 data"),
        }
    }

    pub fn as_f64_slice(&self) -> anyhow::Result<&[f64]> {
        match &self.storage {
            StashStorage::F64Vec(v) => Ok(v),
            _ => anyhow::bail!("Stash does not contain f64 data"),
        }
    }

    pub fn as_cstring_array(&self) -> anyhow::Result<&Vec<std::ffi::CString>> {
        match &self.storage {
            StashStorage::StringArray(strings, _) => Ok(strings),
            _ => anyhow::bail!("Stash does not contain string array data"),
        }
    }

    pub fn as_bool_slice(&self) -> anyhow::Result<&[u8]> {
        match &self.storage {
            StashStorage::U8Vec(v) => Ok(v),
            _ => anyhow::bail!("Stash does not contain bool/u8 data"),
        }
    }

    pub fn as_object_array(&self) -> anyhow::Result<&Vec<crate::managed::ObjectId>> {
        match &self.storage {
            StashStorage::ObjectArray(ids, _) => Ok(ids),
            _ => anyhow::bail!("Stash does not contain object array data"),
        }
    }
}

impl From<Vec<u8>> for Stash {
    fn from(vec: Vec<u8>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::U8Vec(vec),
        }
    }
}

impl From<Vec<i8>> for Stash {
    fn from(vec: Vec<i8>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::I8Vec(vec),
        }
    }
}

impl From<Vec<u16>> for Stash {
    fn from(vec: Vec<u16>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::U16Vec(vec),
        }
    }
}

impl From<Vec<i16>> for Stash {
    fn from(vec: Vec<i16>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::I16Vec(vec),
        }
    }
}

impl From<Vec<u32>> for Stash {
    fn from(vec: Vec<u32>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::U32Vec(vec),
        }
    }
}

impl From<Vec<i32>> for Stash {
    fn from(vec: Vec<i32>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::I32Vec(vec),
        }
    }
}

impl From<Vec<u64>> for Stash {
    fn from(vec: Vec<u64>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::U64Vec(vec),
        }
    }
}

impl From<Vec<i64>> for Stash {
    fn from(vec: Vec<i64>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::I64Vec(vec),
        }
    }
}

impl From<Vec<f32>> for Stash {
    fn from(vec: Vec<f32>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::F32Vec(vec),
        }
    }
}

impl From<Vec<f64>> for Stash {
    fn from(vec: Vec<f64>) -> Self {
        Self {
            ptr: vec.as_ptr() as *mut c_void,
            storage: StashStorage::F64Vec(vec),
        }
    }
}

#[derive(Debug)]
pub struct TrampolineCallbackValue {
    pub trampoline_ptr: *mut c_void,
    pub closure: Stash,
    pub destroy_ptr: Option<*mut c_void>,
    pub data_first: bool,
}

impl TrampolineCallbackValue {
    pub fn build(closure: glib::Closure, trampoline_fn: *mut c_void) -> FfiValue {
        use glib::translate::ToGlibPtr as _;

        let closure_ptr: *mut gobject_ffi::GClosure = closure.to_glib_full();
        let closure_nonnull =
            NonNull::new(closure_ptr).expect("closure pointer should not be null");

        let callback_data = Box::new(crate::trampoline::CallbackData::new(closure_nonnull));
        let data_ptr = Box::into_raw(callback_data) as *mut c_void;

        FfiValue::TrampolineCallback(TrampolineCallbackValue {
            trampoline_ptr: trampoline_fn,
            closure: Stash::new(data_ptr, StashStorage::Callback(data_ptr)),
            destroy_ptr: Some(crate::trampoline::CallbackData::release as *mut c_void),
            data_first: false,
        })
    }
}

#[derive(Debug)]
pub enum FfiValue {
    U8(u8),
    I8(i8),
    U16(u16),
    I16(i16),
    U32(u32),
    I32(i32),
    U64(u64),
    I64(i64),
    F32(f32),
    F64(f64),
    Ptr(*mut c_void),
    Stash(Stash),
    TrampolineCallback(TrampolineCallbackValue),
    Void,
}

impl FfiValue {
    #[must_use]
    pub fn as_raw_ptr(&self) -> *mut c_void {
        match self {
            FfiValue::U8(value) => value as *const u8 as *mut c_void,
            FfiValue::I8(value) => value as *const i8 as *mut c_void,
            FfiValue::U16(value) => value as *const u16 as *mut c_void,
            FfiValue::I16(value) => value as *const i16 as *mut c_void,
            FfiValue::U32(value) => value as *const u32 as *mut c_void,
            FfiValue::I32(value) => value as *const i32 as *mut c_void,
            FfiValue::U64(value) => value as *const u64 as *mut c_void,
            FfiValue::I64(value) => value as *const i64 as *mut c_void,
            FfiValue::F32(value) => value as *const f32 as *mut c_void,
            FfiValue::F64(value) => value as *const f64 as *mut c_void,
            FfiValue::Ptr(ptr) => ptr as *const *mut c_void as *mut c_void,
            FfiValue::Stash(stash) => stash as *const Stash as *mut c_void,
            FfiValue::TrampolineCallback(_) => {
                unreachable!(
                    "TrampolineCallback should not be converted to a single pointer - it requires special handling in call.rs"
                )
            }
            FfiValue::Void => std::ptr::null_mut(),
        }
    }

    pub fn as_ptr(&self, type_name: &str) -> anyhow::Result<*mut c_void> {
        match self {
            FfiValue::Ptr(ptr) => Ok(*ptr),
            _ => anyhow::bail!(
                "Expected a pointer FfiValue for {}, got {:?}",
                type_name,
                self
            ),
        }
    }

    pub fn as_non_null_ptr(&self, type_name: &str) -> anyhow::Result<Option<*mut c_void>> {
        let ptr = self.as_ptr(type_name)?;
        Ok(if ptr.is_null() { None } else { Some(ptr) })
    }

    pub fn to_number(&self) -> anyhow::Result<f64> {
        match self {
            FfiValue::I8(v) => Ok(*v as f64),
            FfiValue::U8(v) => Ok(*v as f64),
            FfiValue::I16(v) => Ok(*v as f64),
            FfiValue::U16(v) => Ok(*v as f64),
            FfiValue::I32(v) => Ok(*v as f64),
            FfiValue::U32(v) => Ok(*v as f64),
            FfiValue::I64(v) => Ok(*v as f64),
            FfiValue::U64(v) => Ok(*v as f64),
            FfiValue::F32(v) => Ok(*v as f64),
            FfiValue::F64(v) => Ok(*v),
            _ => anyhow::bail!("Expected a numeric FfiValue, got {:?}", self),
        }
    }

    pub fn append_libffi_args<'a>(&'a self, args: &mut Vec<libffi::Arg<'a>>) {
        match self {
            FfiValue::TrampolineCallback(trampoline) => {
                if trampoline.data_first {
                    args.push(libffi::arg(trampoline.closure.ptr_ref()));
                    args.push(libffi::arg(&trampoline.trampoline_ptr));
                } else {
                    args.push(libffi::arg(&trampoline.trampoline_ptr));
                    args.push(libffi::arg(trampoline.closure.ptr_ref()));
                }
                if let Some(destroy_ptr) = &trampoline.destroy_ptr {
                    args.push(libffi::arg(destroy_ptr));
                }
            }
            other => args.push(other.into()),
        }
    }

    pub fn stash(&self) -> Option<&Stash> {
        match self {
            FfiValue::Stash(stash) => Some(stash),
            _ => None,
        }
    }
}

impl<'a> From<&'a FfiValue> for libffi::Arg<'a> {
    fn from(arg: &'a FfiValue) -> Self {
        match arg {
            FfiValue::U8(value) => libffi::arg(value),
            FfiValue::I8(value) => libffi::arg(value),
            FfiValue::U16(value) => libffi::arg(value),
            FfiValue::I16(value) => libffi::arg(value),
            FfiValue::U32(value) => libffi::arg(value),
            FfiValue::I32(value) => libffi::arg(value),
            FfiValue::U64(value) => libffi::arg(value),
            FfiValue::I64(value) => libffi::arg(value),
            FfiValue::F32(value) => libffi::arg(value),
            FfiValue::F64(value) => libffi::arg(value),
            FfiValue::Ptr(ptr) => libffi::arg(ptr),
            FfiValue::Stash(stash) => libffi::arg(stash.ptr_ref()),
            FfiValue::TrampolineCallback(_) => {
                unreachable!(
                    "TrampolineCallback requires append_libffi_args for multiple arguments"
                )
            }
            FfiValue::Void => libffi::arg(&()),
        }
    }
}

pub trait FfiEncode {
    fn encode(&self, value: &value::Value, optional: bool) -> anyhow::Result<FfiValue>;
}

pub trait FfiDecode {
    fn decode(&self, ffi_value: &FfiValue) -> anyhow::Result<value::Value>;

    fn decode_with_context(
        &self,
        ffi_value: &FfiValue,
        ffi_args: &[FfiValue],
        args: &[Arg],
    ) -> anyhow::Result<value::Value> {
        let _ = (ffi_args, args);
        self.decode(ffi_value)
    }
}

impl TryFrom<Arg> for FfiValue {
    type Error = anyhow::Error;

    fn try_from(arg: Arg) -> anyhow::Result<Self> {
        arg.ty.encode(&arg.value, arg.optional)
    }
}
