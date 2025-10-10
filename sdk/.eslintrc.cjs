module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'import', 'unicorn'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:unicorn/recommended'
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': ['error'],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'import/no-default-export': 'error',
    'import/order': [
      'error',
      {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        'alphabetize': { order: 'asc', caseInsensitive: true }
      }
    ],
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/filename-case': 'off',
    'unicorn/no-null': 'off',
    'unicorn/prefer-top-level-await': 'off'
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json'
      }
    }
  }
}
