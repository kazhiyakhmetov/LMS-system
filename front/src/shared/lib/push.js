// Web Push helper: регистрация service worker, подписка/отписка.
// Работает только в защищённом контексте (HTTPS или localhost).
import { pushApi } from "./api/push.api";

const SW_URL = "/sw.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Поддерживает ли браузер Web Push (и защищённый ли контекст). */
export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext === true
  );
}

/** Текущее состояние разрешения: "granted" | "denied" | "default" | "unsupported". */
export function pushPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Регистрирует service worker (вызывать при старте приложения). */
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL);
  } catch (e) {
    console.warn("SW register failed:", e);
    return null;
  }
}

/** Уже подписан ли этот браузер на пуши. */
export async function isPushSubscribed() {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Включить пуши: спросить разрешение, подписаться, отправить подписку на сервер. */
export async function enablePush() {
  if (!pushSupported()) {
    throw new Error("unsupported");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("denied");
  }
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await pushApi.publicKey();
  if (!publicKey) throw new Error("no_vapid_key");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  await pushApi.subscribe(sub.toJSON());
  return true;
}

/** Выключить пуши: отписаться локально и на сервере. */
export async function disablePush() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await pushApi.unsubscribe(sub.endpoint).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch (e) {
    console.warn("disablePush failed:", e);
  }
}

/** Тестовый пуш самому себе. */
export async function sendTestPush() {
  return pushApi.test();
}
