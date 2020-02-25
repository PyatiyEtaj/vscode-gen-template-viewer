import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	
	const myCommandId = 'extension.previewTemplate';
	let panel : any;
	let panelIsCreated = false;

	const previewTemplate = async () => {
		let doc = vscode.window.activeTextEditor?.document;
		if (doc && doc.languageId == "gentemp")
		{
			let path = (vscode.window.activeTextEditor?.document.uri.path ?? "");
			if (process.platform === "win32" && path.length > 0) path = path.substr(1, path.length-1);
			//vscode.window.showInformationMessage(vscode.extensions.getExtension("pyatiyetaj.gen-template-viewer")?.extensionPath ?? "ERROR");
			let cmd = process.platform === "win32" ? `chcp 65001 | generator.exe \"${path}\"` : `Generator \"${path}\"`;
			console.log(process.platform);
			await exec(cmd, async (error, stdout, stderr) =>{
				if (error)
					console.error(`error: ${error.message}`);
				else if (stderr)
					console.log(`stderr: ${stderr}`);
				else
					await openMarkdownPreviewSideBySide(stdout);
					/*
					// это с файлом
					{
						vscode.window.activeTextEditor?.document.fileName
						let doc = await vscode.workspace.openTextDocument(
							`${vscode.window.activeTextEditor?.document.fileName}.result_gen_template.txt`
						); // calls back into the provider
						await vscode.window.showTextDocument(doc, { preview: false, viewColumn : vscode.ViewColumn.Two  });
					}*/
					
			});
		}
	};

	const openMarkdownPreviewSideBySide = async (text : string) => {	
		if (!panelIsCreated) {
			panel = await vscode.window.createWebviewPanel('markdown-viewer', "Prewiev", vscode.ViewColumn.Two);	
			panelIsCreated = true;
			panel.onDidDispose(() =>{panelIsCreated = false;})
		}
		await vscode.commands.executeCommand('markdown.api.render', text).then(result => {
			panel.webview.html = " " + result;
		})
	}
	
	let disposable = vscode.commands.registerCommand(myCommandId, previewTemplate);
	vscode.workspace.onDidSaveTextDocument((e : vscode.TextDocument) => previewTemplate());
	context.subscriptions.push(disposable);
}

export function deactivate() {}