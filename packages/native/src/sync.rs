use std::cell::Cell;

thread_local! {
    static FIRE_AND_FORGET_DEPTH: Cell<u32> = const { Cell::new(0) };
}

pub fn should_fire_and_forget() -> bool {
    FIRE_AND_FORGET_DEPTH.with(|depth| depth.get() > 0)
}

pub fn enter_fire_and_forget() {
    FIRE_AND_FORGET_DEPTH.with(|depth| depth.set(depth.get() + 1));
}

pub fn exit_fire_and_forget() {
    FIRE_AND_FORGET_DEPTH.with(|depth| {
        let current = depth.get();

        if current > 0 {
            depth.set(current - 1);
        }
    });
}
