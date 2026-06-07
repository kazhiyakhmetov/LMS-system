import { useEffect, useState } from "react";
import {
  pushSupported,
  isPushSubscribed,
  enablePush,
  disablePush,
  sendTestPush,
} from "../push";

/**
 * Хук для тумблера пуш-уведомлений: статус подписки, вкл/выкл, тест.
 */
export function usePush() {
  const [supported] = useState(() => pushSupported());
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (supported) isPushSubscribed().then(setEnabled).catch(() => {});
  }, [supported]);

  async function toggle() {
    setError("");
    if (!supported) {
      setError("Браузер не поддерживает пуш (нужен HTTPS или localhost)");
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        await enablePush();
        setEnabled(true);
      }
    } catch (e) {
      if (e?.message === "denied") setError("Разрешение на уведомления отклонено в браузере");
      else if (e?.message === "unsupported") setError("Браузер не поддерживает пуш (нужен HTTPS/localhost)");
      else if (e?.message === "no_vapid_key") setError("Сервер не настроен (нет VAPID-ключа)");
      else setError("Не удалось: " + (e?.message || "ошибка"));
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setError("");
    try {
      await sendTestPush();
    } catch (e) {
      setError("Тест не отправлен: " + (e?.message || "ошибка"));
    }
  }

  return { supported, enabled, busy, error, toggle, test };
}
