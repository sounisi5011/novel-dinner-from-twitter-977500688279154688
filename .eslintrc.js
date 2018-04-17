'use strict';

const OFF = 0;
const ERROR = 2;

module.exports = {
  env: {
    browser: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        'singleQuote': true,
      },
    ],
  },
};
