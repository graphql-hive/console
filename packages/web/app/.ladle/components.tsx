import type { GlobalProvider } from "@ladle/react";
import { useEffect } from "react";
import "../src/index.css";

// Mock environment variables for Ladle stories
if (typeof window !== 'undefined') {
  (window as any).__ENV = {
    ENVIRONMENT: 'development',
    APP_BASE_URL: 'http://localhost:3000',
    GRAPHQL_PUBLIC_ENDPOINT: 'http://localhost:3000/graphql',
    GRAPHQL_PUBLIC_SUBSCRIPTION_ENDPOINT: 'ws://localhost:3000/graphql',
    GRAPHQL_PUBLIC_ORIGIN: 'http://localhost:3000',
    NODE_ENV: 'development',
    DOCS_URL: 'https://the-guild.dev/graphql/hive/docs',
    FEATURE_FLAGS_THEME_SWITCHER_ENABLED: '1',
    ZENDESK_SUPPORT: '1',
  };
}

export const Provider: GlobalProvider = ({ children, globalState }) => {
  // Sync Ladle's theme toggle with Tailwind's dark class
  useEffect(() => {
    const isDark = globalState.theme === "dark";
    const htmlElement = document.documentElement;

    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [globalState.theme]);

  return <>{children}</>;
};
