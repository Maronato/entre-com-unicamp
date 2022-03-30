module.exports = {
  ignorePatterns: ["**/*.js"],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
  },
  extends: ["@marolint/eslint-config-nextjs"],
}
