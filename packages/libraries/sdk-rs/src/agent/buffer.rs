use std::collections::VecDeque;

use tokio::sync::Mutex;

pub struct Buffer<T> {
    max_size: usize,
    queue: Mutex<VecDeque<T>>,
}

pub enum AddStatus<T> {
    Full { drained: Vec<T> },
    Ok,
}

impl<T> Buffer<T> {
    pub fn new(max_size: usize) -> Self {
        Self {
            queue: Mutex::new(VecDeque::with_capacity(max_size)),
            max_size,
        }
    }

    pub async fn add(&self, item: T) -> AddStatus<T> {
        let mut queue = self.queue.lock().await;
        if queue.len() >= self.max_size {
            let mut drained: Vec<T> = queue.drain(..).collect();
            drained.push(item);
            AddStatus::Full { drained }
        } else {
            queue.push_back(item);
            AddStatus::Ok
        }
    }

    pub async fn drain(&self) -> Vec<T> {
        let mut queue = self.queue.lock().await;
        queue.drain(..).collect()
    }
}
