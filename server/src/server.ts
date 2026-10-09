/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import type { LintMdRulesConfig, RULE_SEVERITY } from '@lint-md/core'
import type {
  CompletionItem,
  Diagnostic,
  InitializeParams,
  InitializeResult,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node'

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintMarkdown } from '@lint-md/core'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  CompletionItemKind,
  createConnection,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  Position,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node'

// --- helper functions ---

function getSeverity(level: RULE_SEVERITY): DiagnosticSeverity | undefined {
  switch (level) {
    case 2:
      return DiagnosticSeverity.Error
    case 1:
      return DiagnosticSeverity.Warning
    default:
      return undefined
  }
}

// Create a connection for the server, using Node's IPC as a transport.
// 使用 Node.js IPC 作为传输方式，为服务端创建连接。
// Also include all preview / proposed LSP features.
// 同时包含所有预览版和提议中的 LSP 功能。
const connection = createConnection(ProposedFeatures.all)

// --- rules config ---
function uriToFsPath(uri: string): string {
  if (uri.startsWith('file://')) {
    return fileURLToPath(uri)
  }
  return uri
}

const workspaceRulesCache = new Map<string, LintMdRulesConfig>()

function loadRulesConfigFromUri(folderUri: string): LintMdRulesConfig {
  const filePath = path.join(uriToFsPath(folderUri), 'mdlint.json')
  if (!fs.existsSync(filePath))
    return {}

  try {
    const config: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (typeof config !== 'object' || config === null || Array.isArray(config))
      throw new TypeError('Expected a JSON object')

    const rules = (config as { rules?: unknown }).rules
    if (rules === undefined)
      return {}
    if (typeof rules !== 'object' || rules === null || Array.isArray(rules))
      throw new TypeError('Expected "rules" to be a JSON object')

    return rules as LintMdRulesConfig
  }
  catch (error) {
    connection.console.error(`Failed to load ${filePath}: ${String(error)}`)
    return {}
  }
}

async function getRulesConfigForDocument(docUri: string): Promise<LintMdRulesConfig> {
  const folders = await connection.workspace.getWorkspaceFolders()
  if (!folders)
    return {}

  const docPath = path.resolve(uriToFsPath(docUri))

  let bestFolder: { uri: string } | undefined
  let bestLen = 0
  for (const folder of folders) {
    const folderPath = path.resolve(uriToFsPath(folder.uri))
    const relativePath = path.relative(folderPath, docPath)
    const isWithinFolder = relativePath === ''
      || (
        relativePath !== '..'
        && !relativePath.startsWith(`..${path.sep}`)
        && !path.isAbsolute(relativePath)
      )
    if (
      isWithinFolder
      && folderPath.length > bestLen
    ) {
      bestFolder = folder
      bestLen = folderPath.length
    }
  }

  if (!bestFolder)
    return {}

  const cached = workspaceRulesCache.get(bestFolder.uri)
  if (cached !== undefined)
    return cached

  const rules = loadRulesConfigFromUri(bestFolder.uri)
  workspaceRulesCache.set(bestFolder.uri, rules)
  return rules
}

// Create a simple text document manager.
// 创建一个简单的文本文档管理器。
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities

  // Does the client support the `workspace/configuration` request?
  // 客户端是否支持 `workspace/configuration` 请求？
  // If not, we fall back using global settings.
  // 如果不支持，则回退到使用全局设置。
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  )
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  )
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      // 告知客户端此服务端支持代码补全。
      completionProvider: {
        resolveProvider: true,
      },
    },
  }
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    }
  }
  return result
})

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    // 注册以接收所有配置变更。
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    )
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      workspaceRulesCache.clear()
      documents.all().forEach(validateTextDocument)
    })
  }
})

// --- settings ---
interface mdLintSettings {
  rules: LintMdRulesConfig
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// 当客户端不支持 `workspace/configuration` 请求时，使用全局设置。
// Please note that this is not the case when using this server with the client provided in this example
// 请注意，与本示例提供的客户端配合使用此服务端时不会出现这种情况，
// but could happen with other clients.
// 但使用其他客户端时可能会出现。
const defaultSettings: mdLintSettings = { rules: { 'no-long-code': [1, { length: 137, exclude: [] }] } }
let globalSettings: mdLintSettings = defaultSettings

// Cache the settings of all open documents
// 缓存所有已打开文档的设置。
const documentSettings: Map<string, Thenable<mdLintSettings>> = new Map()

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    // 重置所有缓存的文档设置。
    documentSettings.clear()
  }
  else {
    globalSettings = <mdLintSettings>(
      (change.settings.mdLintServer || defaultSettings)
    )
  }

  // Revalidate all open text documents
  // 重新验证所有已打开的文本文档。
  documents.all().forEach(validateTextDocument)
})

function getDocumentSettings(resource: string): Thenable<mdLintSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings)
  }
  let result = documentSettings.get(resource)
  if (!result) {
    result = connection.workspace
      .getConfiguration({
        scopeUri: resource,
        section: 'mdLintServer',
      })
      .then(settings => settings ?? defaultSettings)
    documentSettings.set(resource, result)
  }
  return result
}

// Only keep settings for open documents
// 仅保留已打开文档的设置。
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri)
})

// The content of a text document has changed. This event is emitted
// 文本文档内容发生变化时会触发此事件，
// when the text document first opened or when its content has changed.
// 包括文档首次打开或其内容发生更改时。
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document)
})

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  // 在这个简单示例中，每次验证时都会获取设置。
  const _settings = await getDocumentSettings(textDocument.uri)
  const rulesConfig = await getRulesConfigForDocument(textDocument.uri)
  const rules = Object.assign({}, _settings.rules, rulesConfig)

  // The validator creates diagnostics for all uppercase words length 2 and more
  // 验证器会为长度至少为 2 的所有大写单词生成诊断信息。
  const text = textDocument.getText()
  let lintResult: ReturnType<typeof lintMarkdown>['lintResult']
  try {
    lintResult = lintMarkdown(text, rules, false).lintResult
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    connection.console.error(`Failed to lint ${textDocument.uri}: ${message}`)
    connection.sendDiagnostics({
      uri: textDocument.uri,
      diagnostics: [{
        severity: DiagnosticSeverity.Error,
        range: {
          start: Position.create(0, 0),
          end: Position.create(0, 0),
        },
        message: `Failed to lint Markdown: ${message}`,
        source: 'mdlint',
      }],
    })
    return
  }

  const diagnostics: Diagnostic[] = []
  const lintResults = lintResult ?? []

  lintResults.forEach((item: any) => {
    const severity = getSeverity(item.severity)
    if (severity !== undefined) {
      diagnostics.push({
        severity,
        range: {
          start: Position.create(item.loc.start.line - 1, item.loc.start.column - 1),
          end: Position.create(item.loc.end.line - 1, item.loc.end.column - 1),
        },
        message: `${item.message}\n[${item.name}]`,
        source: 'mdlint',
      })
    }
  })

  // Send the computed diagnostics to VSCode.
  // 将计算出的诊断信息发送给 VS Code。
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
}

connection.onDidChangeWatchedFiles(() => {
  workspaceRulesCache.clear()
  documents.all().forEach(validateTextDocument)
})

// This handler provides the initial list of the completion items.
// 此处理器提供初始的补全项列表。
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // 此参数包含请求代码补全时文档中的位置。
    // which code complete got requested. For the example we ignore this
    // 在此示例中，我们忽略该位置，
    // info and always provide the same completion items.
    // 并始终提供相同的补全项。
    return [
      {
        label: 'TypeScript',
        kind: CompletionItemKind.Text,
        data: 1,
      },
      {
        label: 'JavaScript',
        kind: CompletionItemKind.Text,
        data: 2,
      },
    ]
  },
)

// This handler resolves additional information for the item selected in
// 此处理器为补全列表中选中的项目解析更多信息，
// the completion list.
// 并将其补充到该项目中。
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (item.data === 1) {
    item.detail = 'TypeScript details'
    item.documentation = 'TypeScript documentation'
  }
  else if (item.data === 2) {
    item.detail = 'JavaScript details'
    item.documentation = 'JavaScript documentation'
  }
  return item
})

// Make the text document manager listen on the connection
// 让文本文档管理器通过此连接监听文档事件，
// for open, change and close text document events
// 包括文档打开、变更和关闭。
documents.listen(connection)

// Listen on the connection
// 开始监听此连接。
connection.listen()
