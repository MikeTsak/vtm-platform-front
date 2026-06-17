// src/utils/notification.js
// Simple pub-sub for notifications

let listeners = [];

export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function publish(notification) {
  // notification: { message, type }
  listeners.forEach(listener => listener(notification));
}
