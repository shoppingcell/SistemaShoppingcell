import next from 'eslint-config-next';
import tseslint from '@typescript-eslint/eslint-plugin';

export default [
  ...next,
  {
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
