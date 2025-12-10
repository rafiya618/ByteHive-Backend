import axios from "axios";

// Convert VAPID public key to Uint8Array (required for subscription)
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerPush(userId) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("❌ Push notifications not supported in this browser.");
      return;
    }

    // ✅ Register the service worker (must be in /public)
    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("✅ Service Worker registered:", reg);

    // ✅ Ask user for permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("❌ Notification permission denied");
      return;
    }

    // ✅ Subscribe the user
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY
      ),
    });

    console.log("✅ User subscribed:", subscription);

    // ✅ Send subscription to backend
    const { data } = await axios.post(
      "http://localhost:3002/push/save-subscription",
      { userId, subscription }
    );

    if (data.success) {
      console.log("✅ Subscription saved on backend");
    } else {
      console.error("❌ Failed to save subscription:", data);
    }
  } catch (err) {
    console.error("❌ Error in registerPush:", err);
  }
}
