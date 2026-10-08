/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as Mocha from 'mocha'

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
  })
  mocha.timeout(100000)

  const testsRoot = __dirname

  return new Promise((resolve, reject) => {
    fs.readdir(testsRoot, (err, files) => {
      if (err) {
        reject(err)
        return
      }

      // Add test files to the suite.
      files
        .filter(file => file.endsWith('.test.js'))
        .forEach(file => mocha.addFile(path.resolve(testsRoot, file)))

      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`))
        }
        else {
          resolve()
        }
      })
    })
  })
}
