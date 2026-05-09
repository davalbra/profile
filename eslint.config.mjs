import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt(
  {
    ignores: [".output/**", ".nuxt/**", "out/**", "build/**", "dist/**"],
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/html-self-closing": "off",
    },
  },
  {
    files: ["components/ui/**/*.vue"],
    rules: {
      "vue/require-default-prop": "off",
    },
  },
)
