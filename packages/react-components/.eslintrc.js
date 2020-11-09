/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parser: "@typescript-eslint/parser", // Specifies the ESLint parser
    parserOptions: {
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
        ecmaFeatures: {
            jsx: true // Allows for the parsing of JSX
        }
    },
    settings: {
        react: {
            version: "detect" // Tells eslint-plugin-react to automatically detect the version of React to use
        }
    },
    extends: [
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
        '../../configs/base.eslintrc.json',
        '../../configs/warnings.eslintrc.json',
        '../../configs/errors.eslintrc.json'
    ],
    ignorePatterns: [
        'node_modules',
        'lib',
        '.eslintrc.js',
        'plugins',
        '**/*/__tests__',
        'jestSetup.ts'
    ],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: 'tsconfig.json',
        projectFolderIgnoreList: [
            '/lib/'
        ]
    }
};
