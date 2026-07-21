import preactConfig from 'eslint-config-preact';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

const exportedDeclarationContexts = [
  'ClassDeclaration',
  'FunctionDeclaration',
  'TSEnumDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'VariableDeclaration',
];

export default [
  {
    ignores: [
      '.kilo/',
      'data/',
      'dist/',
      'eslint.config.js',
      'node_modules/',
      'prettier.config.js',
    ],
  },
  ...preactConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { '@typescript-eslint': tseslint.plugin, jsdoc },
    rules: {
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off',
      'no-undef-init': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: exportedDeclarationContexts,
          publicOnly: true,
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
          },
        },
      ],
    },
    settings: {
      jsdoc: { mode: 'typescript' },
    },
  },
];
