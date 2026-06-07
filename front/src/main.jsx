import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/globals.css";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { I18nProvider } from "./shared/lib/i18n";
import { registerServiceWorker } from "./shared/lib/push";

// Регистрируем service worker для пуш-уведомлений (работает на HTTPS/localhost)
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>
);
