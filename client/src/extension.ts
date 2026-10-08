/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	// The server is implemented in node.
	// 服务端使用 Node.js 实现。
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server.
	// 服务端的调试选项。
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
	// --inspect=6009：以 Node.js Inspector 模式运行服务端，以便 VS Code 附加到服务端进行调试。
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used.
	// 如果以调试模式启动扩展，则使用服务端调试选项。
	// Otherwise the run options are used.
	// 否则使用常规运行选项。
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client.
	// 用于控制语言客户端的选项。
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents.
		// 为纯文本类文档注册服务端。
		documentSelector: [{ scheme: 'file', language: 'markdown' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace.
			// 工作区中的 .clientrc 文件发生更改时通知服务端。
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	// 创建并启动语言客户端。
	client = new LanguageClient(
		'mdLintServer',
		'mdLint Server',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server.
	// 启动客户端；这也会启动服务端。
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
