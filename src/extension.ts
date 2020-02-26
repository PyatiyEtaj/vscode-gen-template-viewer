import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
	
	const myCommandId = 'extension.previewTemplate';
	let panel : any;
	let panelIsCreated = false;
	let needToCheckGenFolder = true;
	let genBinariesPath = `${vscode.extensions.getExtension("pyatiyetaj.gen-template-viewer")?.extensionPath}\\generator_binaries`;
	let generatorPath = `${genBinariesPath}\\Generator_for_vscode_extension`;
	const getGeneratorFromGit = async () =>{
		if (!fs.existsSync(genBinariesPath))
		{
			vscode.window.showInformationMessage(`getting generator binaries...`);
			await exec(`git clone https://github.com/PyatiyEtaj/vscode-generator-binaries ${genBinariesPath}`,
			async (error, stdout, stderr) =>{
				if (error)
					vscode.window.showInformationMessage(`error: ${error.message}`);
				else{
					vscode.window.showInformationMessage(`done!`);
					needToCheckGenFolder = false;
				}
			});
		}		
	}

	//TODO : update binaries
	/*const pullGeneratorFromGit = async () =>{
		if (fs.existsSync(genBinariesPath))
		{
		}
	}*/

	const previewTemplate = async () => {
		let doc = vscode.window.activeTextEditor?.document;
		if (doc && doc.languageId == "gentemp")
		{
			if (needToCheckGenFolder) getGeneratorFromGit();
			let path = (vscode.window.activeTextEditor?.document.uri.path ?? "");
			if (process.platform === "win32" && path.length > 0) path = path.substr(1, path.length-1);
			//vscode.window.showInformationMessage(vscode.extensions.getExtension("pyatiyetaj.gen-template-viewer")?.extensionPath ?? "ERROR");
			let cmd = process.platform === "win32" ? `chcp 65001 | ${generatorPath}.exe \"${path}\"` : `${generatorPath} \"${path}\"`;

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