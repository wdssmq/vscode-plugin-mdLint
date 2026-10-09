/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
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

  it('reports invalid rule configuration without stopping the language server', async () => {
    await activate(docUri)

    const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'mdlint-invalid-config-'))
    const workspaceUri = vscode.Uri.file(workspacePath)
    const invalidDocUri = vscode.Uri.file(path.join(workspacePath, 'invalid.md'))
    const workspaceFolderCount = vscode.workspace.workspaceFolders?.length ?? 0

    fs.writeFileSync(
      path.join(workspacePath, 'mdlint.json'),
      JSON.stringify({ rules: { 'space-round-number': 1 } }),
    )
    fs.writeFileSync(invalidDocUri.fsPath, 'Markdown content')

    try {
      assert.ok(vscode.workspace.updateWorkspaceFolders(workspaceFolderCount, 0, { uri: workspaceUri }))
      const diagnosticsPromise = waitForDiagnostics(invalidDocUri)
      const document = await vscode.workspace.openTextDocument(invalidDocUri)
      await vscode.window.showTextDocument(document)

      const diagnostics = await diagnosticsPromise
      assert.strictEqual(diagnostics.length, 1)
      assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error)
      assert.match(diagnostics[0].message, /space-round-number/)
      assert.strictEqual(diagnostics[0].source, 'mdlint')

      const updatedDiagnosticsPromise = waitForDiagnostics(invalidDocUri)
      const edit = new vscode.WorkspaceEdit()
      edit.insert(invalidDocUri, document.positionAt(document.getText().length), '\n')
      assert.ok(await vscode.workspace.applyEdit(edit))

      const updatedDiagnostics = await updatedDiagnosticsPromise
      assert.strictEqual(updatedDiagnostics[0].severity, vscode.DiagnosticSeverity.Error)
      assert.match(updatedDiagnostics[0].message, /space-round-number/)
    }
    finally {
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      const workspaceFolders = vscode.workspace.workspaceFolders ?? []
      const folderIndex = workspaceFolders.findIndex(folder => folder.uri.toString() === workspaceUri.toString())
      if (folderIndex !== -1) {
        vscode.workspace.updateWorkspaceFolders(folderIndex, 1)
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      fs.rmSync(workspacePath, { recursive: true, force: true })
    }
  })
})

function waitForDiagnostics(uri: vscode.Uri): Promise<readonly vscode.Diagnostic[]> {
  return new Promise((resolve, reject) => {
    let subscription: vscode.Disposable | undefined
    const timeout = setTimeout(() => {
      subscription?.dispose()
      reject(new Error(`Timed out waiting for diagnostics for ${uri.toString()}`))
    }, 10000)
    subscription = vscode.languages.onDidChangeDiagnostics((event) => {
      if (!event.uris.some(changedUri => changedUri.toString() === uri.toString()))
        return

      clearTimeout(timeout)
      subscription?.dispose()
      resolve(vscode.languages.getDiagnostics(uri))
    })
  })
}
