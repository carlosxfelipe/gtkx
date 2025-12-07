mod arg;
mod boxed;
mod callback;
mod cif;
mod module;
mod object;
mod state;
mod types;
mod uv;
mod value;

use neon::prelude::*;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("start", module::start)?;
    cx.export_function("stop", module::stop)?;
    cx.export_function("call", module::call)?;
    cx.export_function("read", module::read)?;
    cx.export_function("write", module::write)?;
    cx.export_function("alloc", module::alloc)?;
    cx.export_function("getObjectId", module::get_object_id)?;
    Ok(())
}
