"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="theme-toggle">
        <div className="theme-toggle__track">
          <div className="theme-toggle__thumb" />
        </div>
      </div>
    );
  }

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const ICON_SIZE = 14;

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle ${isDark ? 'theme-toggle--dark' : 'theme-toggle--light'}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="theme-toggle__track">
        <div className="theme-toggle__thumb">
          <div className="theme-toggle__icon theme-toggle__icon--sun">
            <Sun size={ICON_SIZE} />
          </div>
          <div className="theme-toggle__icon theme-toggle__icon--moon">
            <Moon size={ICON_SIZE} />
          </div>
        </div>
        
        {/* Background icons */}
        <div className="theme-toggle__bg-icon theme-toggle__bg-icon--sun">
          <Sun size={12} />
        </div>
        <div className="theme-toggle__bg-icon theme-toggle__bg-icon--moon">
          <Moon size={12} />
        </div>
      </div>
    </button>
  );
};

export { ThemeSwitcher };