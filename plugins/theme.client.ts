export default defineNuxtPlugin(() => {
  const mode = useState<"dark" | "light">("theme-mode", () => "dark");
  const savedMode = localStorage.getItem("theme-mode");
  mode.value = savedMode === "light" ? "light" : "dark";
  document.documentElement.classList.toggle("dark", mode.value === "dark");
});
