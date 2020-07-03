import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import * as fs from 'fs';
import { StreamState } from 'http2';
import { TextDecoder } from 'util';
const request = require('request');
const unzipper = require('unzipper'); 
const fetch = require("node-fetch");


export function activate(context: vscode.ExtensionContext) {
	const previewTemplateId = 'extension.previewTemplate';
	const updateGenId = 'extension.updateGen';
	const instructionId = 'extension.instruction';
	let needToCheckGenFolder = true;
	let outputString = "NULL";
	const myScheme = 'Previewer';	
	const extensionPath = vscode.extensions.getExtension("pyatiyetaj.gen-template-viewer")?.extensionPath;
	//const genBinariesPath = `${extensionPath}\\generator_binaries`;
	const genBinariesPath = path.join(extensionPath ?? "", 'gen', 'Generator');//`${extensionPath}/gen/Generator`;
	const generatorPath = path.join(genBinariesPath, 'Generator');//`${genBinariesPath}/Generator`;
	const getGeneratorBinaries = () => {
		vscode.window.showInformationMessage(`getting generator binaries...`)
		fetch('https://dev.azure.com/pyatiyetaj/Generator/_apis/build/builds?api-version=5.0')
			.then( (res : any) => res.json())
			.then( (data : any) => {
				const buildId = data.value[0].id        
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
		text = "";

		updateText(newText : string){
			this.text = newText;
		}

		provideTextDocumentContent(uri: vscode.Uri): string {
			return this.text;
		}
	}
	//
	const providerRegistrations = vscode.Disposable.from(
		vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider)
	);
	const previewTemplate = async (flag : boolean = true) => {		
		let doc = vscode.window.activeTextEditor?.document;
		if (doc && doc.languageId == "gentemp")
		{
			if (needToCheckGenFolder) updateGenerator();
			let path = (vscode.window.activeTextEditor?.document.uri.path ?? "");
			if (process.platform === "win32" && path.length > 0) path = path.substr(1, path.length-1);			
			//let cmd = process.platform === "win32" ? `chcp 65001 | ${generatorPath}.exe` : `dotnet ${generatorPath}.dll`; // тут с линуксом скорее всего проблемы будут
			let chcp = process.platform === "win32" ? "chcp 65001 | " : "";
			let cmd = `${chcp} dotnet ${generatorPath}.dll`// <- есть право на жизнь, но нужно тестить
			//let cmd = `${chcp} dotnet C:\\Users\\kampukter\\source\\repos\\Generator\\Generator\\bin\\Debug\\netcoreapp3.0\\Generator.dll`// <- есть право на жизнь, но нужно тестить
			//let cmd = `chcp 65001 | Generator.exe`
			console.log(cmd);
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
		const vfUri = vscode.Uri.parse(`${myScheme}:результат`);
		myProvider.updateText(text);
		myProvider.onDidChangeEmitter.fire(vfUri);
		if (flag) {
			let doc = await vscode.workspace.openTextDocument(vfUri);
			await vscode.commands.executeCommand('markdown.showPreviewToSide', vfUri);	
			await vscode.window.showTextDocument(doc, { preserveFocus: true}).then( _ =>{
				vscode.commands.executeCommand("workbench.action.navigateBack")
			});
		}
	}	

	const openInstruction = async () => {
		let uri = vscode.Uri.file(path.join(__dirname, '..' ,'instruction', 'template_instruction.md'))
    	vscode.commands.executeCommand('markdown.showPreview', uri)	
	}


	let disposablePT = vscode.commands.registerCommand(previewTemplateId, previewTemplate);
	let disposableUG = vscode.commands.registerCommand(updateGenId, getGeneratorBinaries);
	let disposableOI = vscode.commands.registerCommand(instructionId, openInstruction);

	vscode.workspace.onDidSaveTextDocument((e : vscode.TextDocument) => previewTemplate(false));

	context.subscriptions.push(providerRegistrations);
	context.subscriptions.push(disposablePT);
	context.subscriptions.push(disposableUG);
	context.subscriptions.push(disposableOI);
}

export function deactivate() {}