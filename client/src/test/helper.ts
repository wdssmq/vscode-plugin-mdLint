/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'node:path'
import * as vscode from 'vscode'

let doc: vscode.TextDocument
let editor: vscode.TextEditor

/**
 * Activates this extension.
 */
export async function activate(docUri: vscode.Uri) {
  const ext = vscode.extensions.getExtension('wdssmq.mdlint')
  if (!ext) {
    throw new Error('The mdLint extension is not available in the test host.')
  }
  await ext.activate()
  doc = await vscode.workspace.openTextDocument(docUri)
  editor = await vscode.window.showTextDocument(doc)
  await sleep(2000) // Wait for server activation
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function getDocPath(p: string) {
  return path.resolve(__dirname, '../../testFixture', p)
}
export function getDocUri(p: string) {
  return vscode.Uri.file(getDocPath(p))
}

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length),
  )
  return editor.edit(eb => eb.replace(all, content))
}
