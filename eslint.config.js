import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'stuxen-design-toolkit/**'],
  },
  {
    files: ['public/js/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': ['error',
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: 'Assigning HTML via innerHTML is banned. Use sanitize.setText() or createElement.',
        },
        {
          selector: "AssignmentExpression[left.property.name='outerHTML']",
          message: 'Assigning HTML via outerHTML is banned.',
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: 'insertAdjacentHTML is banned.',
        },
      ],
    },
  },
];
