/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'node:assert'
import * as vscode from 'vscode'
import { activate, getDocUri } from './helper'

describe('markdown diagnostics', () => {
  const docUri = getDocUri('diagnostics.md')

  it('publishes lint diagnostics', async () => {
    await activate(docUri)

    const diagnostics = vscode.languages.getDiagnostics(docUri)

    assert.ok(diagnostics.length > 0, 'Expected lint-md to publish diagnostics')
    assert.ok(diagnostics.every(diagnostic => diagnostic.source === 'mdlint'))
  })
})
