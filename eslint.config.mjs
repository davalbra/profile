import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  ignores: [
    ".next/**",
    ".output/**",
    ".nuxt/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "app/**",
    "hooks/**",
    "**/*.tsx",
  ],
});
