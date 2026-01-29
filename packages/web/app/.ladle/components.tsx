import type { GlobalProvider } from "@ladle/react";
import { useEffect } from "react";
import "../src/index.css";

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
