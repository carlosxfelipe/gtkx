mod common;

use std::sync::{
    Arc,
    atomic::{AtomicUsize, Ordering},
};

use native::gtk_dispatch::GtkDispatcher;

#[test]
fn js_wait_depth_starts_at_zero() {
    assert!(!GtkDispatcher::global().is_js_waiting());
}

#[test]
fn enter_exit_js_wait_tracks_depth() {
    let initial = GtkDispatcher::global().is_js_waiting();
    assert!(!initial);

    GtkDispatcher::global().enter_js_wait();
    assert!(GtkDispatcher::global().is_js_waiting());

    GtkDispatcher::global().enter_js_wait();
    assert!(GtkDispatcher::global().is_js_waiting());

    GtkDispatcher::global().exit_js_wait();
    assert!(GtkDispatcher::global().is_js_waiting());

    GtkDispatcher::global().exit_js_wait();
    assert!(!GtkDispatcher::global().is_js_waiting());
}

#[test]
fn dispatch_pending_returns_false_when_empty() {
    common::ensure_gtk_init();

    while GtkDispatcher::global().dispatch_pending() {}

    let dispatched = GtkDispatcher::global().dispatch_pending();
    assert!(!dispatched);
}

#[test]
fn drop_tracker_works() {
    common::ensure_gtk_init();

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
        let _tracker = DropTracker {
            counter: drop_counter.clone(),
        };
    }

    assert_eq!(drop_counter.load(Ordering::SeqCst), 1);
}
