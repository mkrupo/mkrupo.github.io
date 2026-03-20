const toggleButton = document.getElementById("theme-toggle");
const yearSpan = document.getElementById("year");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
}

function getInitialTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return systemTheme.matches ? "dark" : "light";
}

applyTheme(getInitialTheme());

if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

toggleButton.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";

  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
});

systemTheme.addEventListener("change", (event) => {
  const savedTheme = localStorage.getItem("theme");

  if (!savedTheme) {
    applyTheme(event.matches ? "dark" : "light");
  }
});