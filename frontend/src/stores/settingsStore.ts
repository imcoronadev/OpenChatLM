import { create } from "zustand";

interface SettingsState {
  theme: "dark" | "light";
  language: string;
  temperature: number;
  context: number;
  bypassTtl: number;
  activeSkills: string[];
  setTheme: (t: "dark" | "light") => void;
  setLanguage: (l: string) => void;
  setTemperature: (n: number) => void;
  setContext: (n: number) => void;
  setBypassTtl: (n: number) => void;
  toggleSkill: (id: string) => void;
  setActiveSkills: (ids: string[]) => void;
}

const initial = (() => {
  if (typeof window === "undefined") return { theme: "dark", language: "en" };
  const theme = (localStorage.getItem("openchat.theme") as "dark" | "light") || "dark";
  const language = localStorage.getItem("openchat.lang") || "en";
  return { theme, language };
})();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: initial.theme,
  language: initial.language,
  temperature: 0.7,
  context: 4096,
  bypassTtl: 60,
  activeSkills: [],

  setTheme: (t) => {
    localStorage.setItem("openchat.theme", t);
    if (t === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
    set({ theme: t });
  },
  setLanguage: (l) => {
    localStorage.setItem("openchat.lang", l);
    set({ language: l });
  },
  setTemperature: (n) => set({ temperature: n }),
  setContext: (n) => set({ context: n }),
  setBypassTtl: (n) => set({ bypassTtl: n }),
  toggleSkill: (id) =>
    set((s) => ({
      activeSkills: s.activeSkills.includes(id) ? s.activeSkills.filter((x) => x !== id) : [...s.activeSkills, id],
    })),
  setActiveSkills: (ids) => set({ activeSkills: ids }),
}));