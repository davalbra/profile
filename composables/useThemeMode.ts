import { computed, watch } from "vue";

export function useThemeMode() {
  const mode = useState<"dark" | "light">("theme-mode", () => "dark");

  const applyMode = (nextMode: "dark" | "light") => {
    if (!import.meta.client) {
      return;
    }

    localStorage.setItem("theme-mode", nextMode);
    document.documentElement.classList.toggle("dark", nextMode === "dark");
  };

  if (import.meta.client) {
    watch(
      mode,
      (nextMode) => {
        applyMode(nextMode);
      },
      { immediate: true },
    );
  }

  return {
    mode,
    isDark: computed(() => mode.value === "dark"),
    toggleTheme() {
      mode.value = mode.value === "dark" ? "light" : "dark";
    },
  };
}
