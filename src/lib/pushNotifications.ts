import { Capacitor } from "@capacitor/core";
import { PushNotifications, type ActionPerformed, type PushNotificationSchema } from "@capacitor/push-notifications";
import { api } from "@/lib/api";
import { toast } from "sonner";

let initialized = false;
let lastToken = "";
// Notification ids we've already surfaced as a toast, so a redelivered push
// (e.g. FCM retry) doesn't show twice.
const shownNotificationIds = new Set<string>();

function notificationKey(notification: PushNotificationSchema): string {
  return notification.data?.notification_id || notification.id || `${notification.title ?? ""}|${notification.body ?? ""}`;
}

function showNotificationToast(notification: PushNotificationSchema) {
  const key = notificationKey(notification);
  if (!key || shownNotificationIds.has(key)) return;
  shownNotificationIds.add(key);

  const title = notification.title;
  const body = notification.body;
  if (!title && !body) return;

  if (title && body) {
    toast(title, { description: body });
  } else {
    toast(title || body || "");
  }
}

export async function setupPushNotifications(authToken?: string) {
  if (initialized || !Capacitor.isNativePlatform()) return;

  // Ensure token is in localStorage before any listener fires
  if (authToken) localStorage.setItem("token", authToken);

  try {
    initialized = true;
    let permission = await PushNotifications.checkPermissions();

    if (permission.receive !== "granted") {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== "granted") return;

    await PushNotifications.addListener("registration", async (token) => {
      if (!token.value || token.value === lastToken) return;
      lastToken = token.value;

      const platform = Capacitor.getPlatform();
      try {
        await api.registerDeviceToken(token.value, platform === "ios" ? "ios" : "android");
      } catch (err) {
        console.error("[FCM] failed to register token to backend:", err);
      }
    });

    await PushNotifications.addListener("registrationError", (error) => {
      console.error("[FCM] registration error:", error);
    });

    // Notification arrives while the app is in the foreground.
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      showNotificationToast(notification);
    });

    // User tapped a notification (app was backgrounded or closed).
    // The app's tab/screen state is local to each dashboard component with no
    // shared navigation target to route into, so we surface the message via the
    // existing toast without inventing a route — the app itself is already
    // brought to the foreground by the OS.
    await PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
      showNotificationToast(action.notification);
    });

    await PushNotifications.register();
  } catch (error) {
    console.error("[FCM] Unable to setup push notifications:", error);
  }
}

// Removes all push notification listeners and resets setup state, so a fresh
// login (possibly as a different user) re-registers cleanly instead of being
// skipped by the `initialized` guard above.
export async function teardownPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await PushNotifications.removeAllListeners();
  } catch (error) {
    console.error("[FCM] Unable to remove push notification listeners:", error);
  }

  initialized = false;
  lastToken = "";
  shownNotificationIds.clear();
}
