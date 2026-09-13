import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./utils/i18n.ts";
import { Provider } from "react-redux";
import { store } from "./stores/store.ts";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/auth-context.tsx";
import { ThemeProvider } from "./context/theme-context.tsx";
import { I18nextProvider } from "react-i18next";
import { MockDataProvider } from "./context/mock/mock-data-context.tsx";
import { ErrorBoundary } from "~/components/shared/error-boundary/ErrorBoundary";
import { PerformanceMonitor } from "~/components/shared/performance/PerformanceMonitor";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <PerformanceMonitor />
      <Provider store={store}>
        <BrowserRouter>
          <AuthProvider>
            <MockDataProvider>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </MockDataProvider>
          </AuthProvider>
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
);
