/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parser: "@typescript-eslint/parser", // Specifies the ESLint parser
    parserOptions: {
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
        tsconfigRootDir: __dirname,
        project: 'tsconfig.json',
        projectFolderIgnoreList: [
            '/lib/'
        ]
    },
    extends: [
        'plugin:@typescript-eslint/recommended',
        '../../configs/base.eslintrc.json',
        '../../configs/warnings.eslintrc.json',
        '../../configs/errors.eslintrc.json'
    ],
    ignorePatterns: [
        'node_modules',
        'lib',
        '.eslintrc.js',
        'plugins'
    ]
};
