module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        "sourceType": "module",
    },
    plugins: [
        '@typescript-eslint',
        'header',
    ],
    extends: [ // TODO: enable all rules and fix all errors and warnings
        // 'eslint:recommended',
        // 'plugin:@typescript-eslint/eslint-recommended',
        // 'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        "header/header": [2, "./header.js"],
    },
};
