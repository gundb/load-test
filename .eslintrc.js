'use strict';

const eslint = exports;

// What environments the code runs in.
eslint.env = {
  browser: true,
  node: true,
  es6: true,
  commonjs: true,
};

eslint.extends = [
  'eslint:recommended',
  'llama',
];
