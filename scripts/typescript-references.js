const cp = require('child_process')
const fs = require('fs')
const jsonc = require('jsonc-parser')
const path = require('path')

/** @type {jsonc.ParseOptions} */
const parseOptions = {
    allowTrailingComma: true,
    allowEmptyContent: true,
}

/** @type {jsonc.FormattingOptions} */
const formattingOptions = {
    insertFinalNewline: true,
    insertSpaces: true,
    tabSize: 4,
}

main().catch(error => {
    console.error(error)
    process.exitCode = 1
})

async function main() {
    const projectCwd = path.resolve(__dirname, '..')
    const workspaces = JSON.parse(cp.execSync('yarn -s workspaces info').toString())
    workspaces['monorepo'] = {
        location: ensurePosixLike(path.relative(process.cwd(), projectCwd)),
        workspaceDependencies: Object.keys(workspaces),
    }
    await Promise.all(Object.entries(workspaces).map(async ([name, workspace]) => {
        const tsconfigPath = path.join(projectCwd, workspace.location, 'tsconfig.json')
        if (await fs.promises.stat(tsconfigPath).then(stat => false, error => true)) {
            delete workspaces[name] // remove workspaces that aren't TypeScript projects
        }
    }))
    await Promise.all(Object.values(workspaces).map(async workspace => {
        const tsconfigPath = path.join(projectCwd, workspace.location, 'tsconfig.json')
        const tsconfigText = await fs.promises.readFile(tsconfigPath, 'utf8')
        /** @type {jsonc.ParseError[]} */
        const errors = []
        const tsconfig = jsonc.parseTree(tsconfigText, errors, parseOptions)
        if (errors.length > 0) {
            throw new Error(`Parse Error in ${tsconfigPath}:\n${errors
                .map(error => `  ${jsonc.printParseErrorCode(error.error)} at offset: ${error.offset}, length: ${error.length}`)
                .join('\n')
            }`)
        }
        const expected = workspace.workspaceDependencies
            .sort()
            .filter(dep => dep in workspaces)
            .map(dep => ({
                path: ensurePosixLike(path.relative(path.resolve(projectCwd, workspace.location), workspaces[dep].location))
            }))
        const references = jsonc.findNodeAtLocation(tsconfig, ['references'])
        if (!references || JSON.stringify(expected) !== JSON.stringify(jsonc.getNodeValue(references))) {
            const edits = jsonc.modify(tsconfigText, ['references'], expected, { formattingOptions })
            const updated = jsonc.applyEdits(tsconfigText, edits)
            await fs.promises.writeFile(tsconfigPath, updated, 'utf8')
        }
    }))
}

/**
 * @param {string} what
 * @returns {string}
 */
function ensurePosixLike(what) {
    return process.platform === 'win32'
        ? what.replace(/\\/g, '/')
        : what
}
