import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  ignores: [
    ".output/**",
    ".nuxt/**",
    "out/**",
    "build/**",
    "dist/**",
  ],
  rules: {
    "vue/multi-word-component-names": "off",
  },
});
