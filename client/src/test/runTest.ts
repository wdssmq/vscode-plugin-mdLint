/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------- */
import * as path from 'node:path'

import { runTests } from '@vscode/test-electron'

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../')

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './index')

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      platform: process.platform === 'win32' ? 'win32-x64-archive' : undefined,
      launchArgs: [
        `--user-data-dir=${path.resolve(extensionDevelopmentPath, '.vscode-test', 'user-data')}`,
        `--extensions-dir=${path.resolve(extensionDevelopmentPath, '.vscode-test', 'extensions')}`,
      ],
    })
  }
  catch (err) {
    console.error('Failed to run tests')
    console.error(err)
    process.exit(1)
  }
}

main()
