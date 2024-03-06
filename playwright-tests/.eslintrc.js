/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        './configs/base.eslintrc.json',
        './configs/errors.eslintrc.json'
    ],
    ignorePatterns: ['playwright.config.ts'],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: 'tsconfig.json'
    }
};
