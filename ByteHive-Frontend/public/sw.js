// Service Worker for handling push events
// import icon from "../src/assets/BytegiveLogo.png"
self.addEventListener("push", (event) => {
  console.log("📩 Push event received:", event);

  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
      console.log("data: ", data);
    }
  } catch (e) {
    console.error("❌ Error parsing push event data:", e);
  }

  const title = data.title || "Bytehive";
  const options = {
    body: data.body || "You have a new message!",
    icon: "/BytegiveLogo.png", // Add your app icon in public/icons/
    badge: "/icons/badge-72.png", // Optional: small monochrome badge
    data: data.url || "/", // Open this URL on click
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ✅ Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clients.openWindow && event.notification.data) {
        return clients.openWindow(event.notification.data);
      }
    })
  );
});
