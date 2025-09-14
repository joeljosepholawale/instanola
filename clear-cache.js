// Clear Cache Script - Run this in browser console
console.log("🧹 Clearing cache and localStorage...");

// Clear localStorage
localStorage.clear();

// Clear sessionStorage
sessionStorage.clear();

// Clear IndexedDB (Firebase related)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
}

// Clear cache storage
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
    });
  });
}

console.log("✅ Cache cleared! Please refresh the page.");
