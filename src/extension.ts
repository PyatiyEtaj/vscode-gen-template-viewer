import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
const request = require('request');
const unzipper = require('unzipper'); 
const fetch = require("node-fetch");

export function activate(context: vscode.ExtensionContext) {
	
	const previewTemplateId = 'extension.previewTemplate';
	const updateGenId = 'extension.updateGen';
	let needToCheckGenFolder = true;
	let outputString = "NULL";
	const myScheme = 'Previewer';	
	const extensionPath = vscode.extensions.getExtension("pyatiyetaj.gen-template-viewer")?.extensionPath;
	//const genBinariesPath = `${extensionPath}\\generator_binaries`;
	const genBinariesPath = `${extensionPath}\\gen\\Generator`;
	const generatorPath = `${genBinariesPath}\\Generator`;

	const getGeneratorBinaries = () => {
		vscode.window.showInformationMessage(`getting generator binaries...`)
		fetch('https://dev.azure.com/pyatiyetaj/Generator/_apis/build/builds?api-version=5.0')
			.then( (res : any) => res.json())
			.then( (data : any) => {
				const buildId = data.value.length+1        
				fetch(`https://dev.azure.com/pyatiyetaj/Generator/_apis/build/builds/${buildId}/artifacts?api-version=5.0`)
					.then( (res : any) => res.json())
					.then( (data : any) => {
						const url = data.value[0].resource.downloadUrl;
						request(url).pipe(
							unzipper.Extract({ path: `${extensionPath}` })
						)
						vscode.window.showInformationMessage(`done!`);
					})
			})
	}

	const updateGenerator = () => {if (!fs.existsSync(genBinariesPath)) getGeneratorBinaries();}

	const myProvider = new class implements vscode.TextDocumentContentProvider {

		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		provideTextDocumentContent(___: vscode.Uri): string {
			return outputString;
		}
	}
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

	const previewTemplate = async (flag : boolean = true) => {		
		let doc = vscode.window.activeTextEditor?.document;
		if (doc && doc.languageId == "gentemp")
		{
			if (needToCheckGenFolder) updateGenerator();
			let path = (vscode.window.activeTextEditor?.document.uri.path ?? "");
			if (process.platform === "win32" && path.length > 0) path = path.substr(1, path.length-1);			
			let cmd = process.platform === "win32" ? `chcp 65001 | ${generatorPath}.exe` : `${generatorPath}`; // тут с линуксом скорее всего проблемы будут
			//let cmd = `chcp 65001 | dotnet ${generatorPath}.dll` <- есть право на жизнь, но нужно тестить
			//let cmd = `chcp 65001 | Generator.exe \"${extensionPath}\" \"${path}\"`
			await exec(`${cmd} \"${extensionPath}\" \"${path}\"`, async (error, stdout, stderr) =>{
				if (error)
					console.error(`error: ${error.message}`);
				else if (stderr)
					console.log(`stderr: ${stderr}`);
				else
					await openMarkdownPreviewSideBySide(stdout, flag);					
			});
		}
	};

	const openMarkdownPreviewSideBySide = async (text : string, flag : boolean) => {	
		outputString = text;
		const vfUri = vscode.Uri.parse(`${myScheme}:` + 'preview');
		myProvider.onDidChangeEmitter.fire(vfUri);
		if (flag) {
			await vscode.commands.executeCommand('markdown.showPreviewToSide', vfUri);
		}
	}	
	
	let disposablePT = vscode.commands.registerCommand(previewTemplateId, previewTemplate);
	let disposableUG = vscode.commands.registerCommand(updateGenId, getGeneratorBinaries);

	vscode.workspace.onDidSaveTextDocument((e : vscode.TextDocument) => previewTemplate(false));

	context.subscriptions.push(disposablePT);
	context.subscriptions.push(disposableUG);
}

export function deactivate() {}


/*
const openMarkdownPreviewSideBySide = async (text : string) => {	
		if (!panelIsCreated) {
			panel = await vscode.window.createWebviewPanel('markdown.preview', "Prewiev", vscode.ViewColumn.Two);	
			panelIsCreated = true;
			panel.onDidDispose(() =>{panelIsCreated = false;})
		}
		await vscode.commands.executeCommand('markdown.api.render', text).then(result => {
			panel.webview.html = result;
		})		
	}
*/

//        "begin": "(#rnd|#genAE|#getAEcode|#lua)\\(",
