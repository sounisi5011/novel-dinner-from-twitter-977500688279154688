'use strict';

const OFF = 0;
const WARN = 1;
const ERROR = 2;

module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'es5',
      },
    ],
    'no-console': OFF,
    'eqeqeq': ERROR,
    'no-var': ERROR,
    'prefer-const': ERROR,
    'no-unused-vars': WARN,
    'no-control-regex': WARN,
    'no-empty': [
      WARN,
      {
        allowEmptyCatch: true,
      },
    ],
  },
};
