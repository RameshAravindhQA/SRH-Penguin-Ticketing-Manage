export interface AppTheme {
  primaryHsl: string;
  sidebarHsl: string;
  backgroundHsl: string;
  accentHsl: string;
  name: string;
}

export const PRESET_THEMES: AppTheme[] = [
  { name: "Ocean Blue", primaryHsl: "221 83% 53%", sidebarHsl: "213 33% 18%", backgroundHsl: "210 40% 98%", accentHsl: "214 32% 91%" },
  { name: "Forest Green", primaryHsl: "142 76% 36%", sidebarHsl: "150 30% 16%", backgroundHsl: "145 20% 97%", accentHsl: "141 40% 88%" },
  { name: "Royal Purple", primaryHsl: "262 83% 58%", sidebarHsl: "258 30% 18%", backgroundHsl: "256 20% 98%", accentHsl: "262 40% 90%" },
  { name: "Crimson Red", primaryHsl: "0 84% 50%", sidebarHsl: "0 30% 18%", backgroundHsl: "0 20% 98%", accentHsl: "0 40% 90%" },
  { name: "Sunset Orange", primaryHsl: "25 95% 53%", sidebarHsl: "22 35% 18%", backgroundHsl: "30 30% 98%", accentHsl: "25 50% 90%" },
  { name: "Midnight Teal", primaryHsl: "181 75% 40%", sidebarHsl: "200 35% 16%", backgroundHsl: "180 20% 98%", accentHsl: "181 40% 88%" },
  { name: "Slate Gray", primaryHsl: "215 20% 45%", sidebarHsl: "220 15% 22%", backgroundHsl: "215 15% 97%", accentHsl: "214 20% 88%" },
];

export const DEFAULT_THEME = PRESET_THEMES[0];

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primaryHsl);
  root.style.setProperty("--sidebar", theme.sidebarHsl);
  root.style.setProperty("--background", theme.backgroundHsl);
  root.style.setProperty("--ring", theme.primaryHsl);
  localStorage.setItem("app_theme", JSON.stringify(theme));
}

export function loadSavedTheme() {
  const saved = localStorage.getItem("app_theme");
  if (saved) {
    try {
      const theme = JSON.parse(saved) as AppTheme;
      applyTheme(theme);
    } catch {}
  }
}
