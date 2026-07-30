use std::cell::OnceCell;
use std::ffi::c_void;

use libffi::middle::{Builder, Cif, CodePtr};
use napi::bindgen_prelude::*;
use napi_derive::napi;

use crate::ffi::codec::{Codec, Encoder as _};
use crate::ffi::descriptor::Descriptor;
use crate::ffi::library_cache::FfiCache;

pub struct CallDescriptor {
    pub(crate) library_name: String,
    pub(crate) symbol_name: String,
    pub(crate) arg_codecs: Vec<Codec>,
    pub(crate) return_codec: Codec,
    pub(crate) cif: Cif,
    pub(crate) symbol: OnceCell<CodePtr>,
    pub(crate) native_arg_count: usize,
}

impl CallDescriptor {
    pub(crate) fn symbol(&self) -> anyhow::Result<CodePtr> {
        if let Some(symbol) = self.symbol.get() {
            return Ok(*symbol);
        }

        let resolved = FfiCache::with(|state| {
            let symbol = unsafe {
                state.resolve_symbol::<unsafe extern "C" fn() -> ()>(
                    &self.library_name,
                    &self.symbol_name,
                )
            }?;
            anyhow::Ok(CodePtr(symbol as *mut c_void))
        })?;
        let _ = self.symbol.set(resolved);

        Ok(resolved)
    }
}

pub(crate) fn prepare(
    library_name: String,
    symbol_name: String,
    arg_codecs: Vec<Codec>,
    return_codec: Codec,
) -> CallDescriptor {
    let mut arg_types = Vec::with_capacity(arg_codecs.len());
    for codec in &arg_codecs {
        codec.append_ffi_arg_types(&mut arg_types);
    }
    let native_arg_count = arg_types.len();
    let cif = Builder::new()
        .res(return_codec.libffi_type())
        .args(arg_types)
        .into_cif();

    CallDescriptor {
        library_name,
        symbol_name,
        arg_codecs,
        return_codec,
        cif,
        symbol: OnceCell::new(),
        native_arg_count,
    }
}

/// Precompiles the argument and return marshalling of `symbolName` in `sharedLibrary` into a
/// reusable call descriptor that `call` can invoke. The symbol itself is resolved on the first
/// call, so binding a symbol the installed library does not export fails only when it is called.
#[napi(catch_unwind)]
pub fn bind(
    shared_library: String,
    symbol_name: String,
    arg_descriptors: Vec<Descriptor>,
    return_descriptor: Descriptor,
) -> Result<External<CallDescriptor>> {
    let arg_codecs = arg_descriptors
        .into_iter()
        .map(Descriptor::into_codec)
        .collect::<Result<Vec<_>>>()?;
    let return_codec = return_descriptor.into_codec()?;

    Ok(External::new(prepare(
        shared_library,
        symbol_name,
        arg_codecs,
        return_codec,
    )))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ffi::codec::IntegerCodec;

    #[test]
    fn builds_the_call_interface_without_resolving_the_symbol() {
        test_support::run(|| {
            let descriptor = prepare(
                "libgtk-4.so.1".to_owned(),
                "gtkx_no_such_symbol".to_owned(),
                Vec::new(),
                Codec::Integer(IntegerCodec::U32),
            );

            assert_eq!(descriptor.native_arg_count, 0);
            assert!(descriptor.symbol.get().is_none());
            assert!(descriptor.symbol().is_err());
        });
    }

    #[test]
    fn memoizes_the_resolved_symbol() {
        test_support::run(|| {
            let descriptor = prepare(
                "libgtk-4.so.1".to_owned(),
                "gtk_get_major_version".to_owned(),
                Vec::new(),
                Codec::Integer(IntegerCodec::U32),
            );

            let first = descriptor.symbol().expect("the symbol resolves");
            assert!(!first.as_mut_ptr().is_null());
            assert_eq!(
                descriptor.symbol.get().map(|symbol| symbol.as_mut_ptr()),
                Some(first.as_mut_ptr())
            );
        });
    }
}
