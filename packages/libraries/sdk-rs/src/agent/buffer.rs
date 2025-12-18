use std::collections::VecDeque;

use tokio::sync::Mutex;

pub struct Buffer<T> {
    max_size: usize,
    queue: Mutex<VecDeque<T>>,
}

impl<T> Buffer<T> {
    pub fn new(max_size: usize) -> Self {
        Self {
            max_size,
            queue: Mutex::new(VecDeque::new()),
        }
    }

    pub async fn add(&self, item: T) -> bool {
        let mut queue = self.queue.lock().await;
        queue.push_back(item);
        queue.len() >= self.max_size
    }

    pub async fn drain(&self) -> Vec<T> {
        let mut queue = self.queue.lock().await;
        let drained_items = queue.drain(..).collect();
        drained_items
    }
}
