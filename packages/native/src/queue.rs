use std::{collections::VecDeque, sync::Mutex};

pub struct Queue<T> {
    items: Mutex<VecDeque<T>>,
}

impl<T> Queue<T> {
    pub const fn new() -> Self {
        Self {
            items: Mutex::new(VecDeque::new()),
        }
    }

    pub fn push(&self, item: T) {
        self.items.lock().unwrap().push_back(item);
    }

    pub fn pop(&self) -> Option<T> {
        self.items.lock().unwrap().pop_front()
    }

    pub fn is_empty(&self) -> bool {
        self.items.lock().unwrap().is_empty()
    }
}
