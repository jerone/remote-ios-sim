export default [
  {
    ignores: ['node_modules/**', '.git/**', 'windows-client/**'],
    files: ['mac-agent/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single'],
    },
  },
];
