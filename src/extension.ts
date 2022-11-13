import * as vscode from 'vscode';
// import * as puppeteer from 'puppeteer';
import { URL } from 'url';
import fetch from 'node-fetch';


// Results
interface CodeSearchResult {
	title: string | null
	url: string
	codes: string[]
}

async function search(webView: vscode.Webview, input: string | number | string[] | undefined) {
	webView.postMessage({ command: 'clearUp' });

	try {
		//console.log("here");
		// const url = "http://47.242.133.237:5001/search/";
		const url = "http://localhost:5000/search/<query>";
		let indexData = await fetch(url + input).then(res => res.json());
		console.log("here");
		const result = indexData.result;
		const len = result.length;
		var promises = [];
		var i: number;
		for (i = 0; i < len; i++) {
			console.log(result);
			var code: string = codesprocess(result[i]);
			promises.push(_subPage(webView, i, code));
		}

		console.log(indexData.result);
		await Promise.all(promises);

	} catch (e) {
		console.log(e);
		webView.html = makeErrorHtml();

	}

};
async function _subPage(webView: vscode.Webview, index: number, code: string) {
	// const subPage = await browser.newPage();
	index = index + 1;
	try {
		webView.postMessage({ command: 'addTitle', title: "Result " + String(index), num: index });
		webView.postMessage({ command: 'addLink', url: "", num: index });
		var codes = new Array();
		webView.postMessage({ command: 'addCode', code: code, num: index, codeId: index });
		codes.push(code);
		const result = { title: "result " + String(index), url: "", codes: codes };
	} catch (e) {
		console.log(e);
	}
}



// Activate
export function activate(context: vscode.ExtensionContext) {
	const register = vscode.commands.registerCommand;

	context.subscriptions.push(
		register('code-search.search', async () => {
			CodeSearchPanel.createOrShow(context.extensionUri);
			if (CodeSearchPanel.currentPanel) {
				const webView = CodeSearchPanel.currentPanel._panel.webview;
				webView.html = CodeSearchPanel.currentPanel._makeBaseHtml(CodeSearchPanel.currentPanel._panel.webview);
				webView.onDidReceiveMessage(message => {
					search(webView, message.text);
				}, undefined, context.subscriptions);
			}

		})
	);
}

// Selector information
const querySelectors: { hostname: string, selector: string }[] = [
	{
		hostname: "qiita.com",
		selector: "div.code-frame > div.highlight"
	},
	{
		hostname: "hatenablog.com",
		selector: "pre.code"
	}
]


function codesprocess(code: string) {
	var ans: string = "";
	var i: number = 0;
	const len = code.length;
	var space: string = "";
	for (i = 0; i < len; i++) {
		if (code[i] == ';') {
			ans = ans + ";\n";
			while (i < len - 1 && code[i + 1] == '}') {
				space = space.substring(0, space.length - 1);
				ans = ans + space + "}" + "\n";
				i += 1;
			}
			ans = ans + space;

		} else if (code[i] == '{') {
			space = space + "\t";
			ans = ans + "{\n" + space;
		} else if (code[i] == '}') {
			ans = ans + "}";
			if (i < len - 1 && code[i + 1] == ';') {
				ans = ans + ";";
				i += 1;
			}
			ans = ans + '\n';
			space = space.substring(0, space.length - 1);
			ans = ans + space;
		} else {
			ans = ans + code[i];
		}
	}
	return ans;
}

/**
 * Manages code-search results panel
 */
class CodeSearchPanel {
	public static currentPanel: CodeSearchPanel | undefined;

	public static readonly viewType = 'codeSearch';

	public readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _codeSearchResults: CodeSearchResult[] = new Array();

	/**
	 * constructor
	 */
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

	}



	/**
	 * Function which is executed when the panel is closed
	 */
	public dispose() {
		CodeSearchPanel.currentPanel = undefined;		// Set currentPanel as undefined
		this._codeSearchResults = [];					// Make the array of results empty

		// Clean up
		this._panel.dispose();

		// Dispose all disposables
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) x.dispose();
		}

	}



	/**
	 * (1) If we already have a panel, show it.
	 * (2) Otherwise, create a new one.
	 */
	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// (1)
		if (CodeSearchPanel.currentPanel) {
			CodeSearchPanel.currentPanel._panel.reveal(column, true);
			return;
		}


		// (2)
		const panel = vscode.window.createWebviewPanel(
			CodeSearchPanel.viewType,
			'Code Search',
			{ viewColumn: column || vscode.ViewColumn.One, preserveFocus: true },
			Object.assign(getWebviewPanelOptions(), getWebviewOptions(extensionUri)),
			// {enableScripts:true}
		);

		CodeSearchPanel.currentPanel = new CodeSearchPanel(panel, extensionUri);
	}

	/**
	 * Makes base html of result webview
	 */
	public _makeBaseHtml(webView: vscode.Webview) {
		// css js uri
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'message.js');
		const scriptPrettifyPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'prettify.js');
		const styleResultsPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'results.css');
		const stylePrettifyPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'TomorrowNightEighties.css');

		const scriptUri = webView.asWebviewUri(scriptPathOnDisk);
		const scriptPrettifyUri = webView.asWebviewUri(scriptPrettifyPath);
		const styleResultsUri = webView.asWebviewUri(styleResultsPath);
		const stylePrettifyUri = webView.asWebviewUri(stylePrettifyPath);
		const nonce = getNonce();

		const html = `
			<!DOCTYPE html>
			<html lang="ja">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webView.cspSource}; img-src ${webView.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResultsUri}" rel="stylesheet">
				<script nonce="${nonce}" src="${scriptPrettifyUri}"></script>
				<script nonce="${nonce}" src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
				<link href="${stylePrettifyUri}" rel="stylesheet">
				<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
				<title>code-search</title>
			</head>
			<body>
				<h1>Code-Search</h1>					
				<div class="form-row mt-3">
					<input id="input" type="search" class="form-control" placeholder="search  here" size="50" style="height:60px;font-size:61px;" >
					<button class="btn">search</button>
					
				</div>

				
				<div id="results-div"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
				
			</body>
			</html>

		`;
		return html;
	}

	/**
	 * Searches using puppeteer
	 */
	public async search(input: string | number | string[] | undefined) {
		const word = await input;
		// const page = await browser.newPage();
		const webView = this._panel.webview;
		if (!word) return;
		if (!webView) return;
		webView.html = this._makeBaseHtml(this._panel.webview);
		console.log("listenerstart");
		webView.onDidReceiveMessage(message => {
			console.log("listenerend");
			console.log('插件收到的消息：', message);

		});

		try {
			//console.log("here");
			const url = "http://localhost:5000/search/<query>";
			let indexData = await fetch(url + word).then(res => res.json());
			const result = indexData.result;
			const len = result.length;
			var promises = [];
			var i: number;
			for (i = 0; i < len; i++) {
				//console.log(result);
				var code: string = this.codesprocess(result[i]);
				promises.push(this._subPage(webView, i, code));
			}

			console.log(indexData.result);
			await Promise.all(promises);

		} catch (e) {
			console.log(e);
			this._panel.webview.html = makeErrorHtml();

		}
		// Close browser
		// await browser.close();
	}

	private codesprocess(code: string) {
		var ans: string = "";
		var i: number = 0;
		const len = code.length;
		var space: string = "";
		for (i = 0; i < len; i++) {
			if (code[i] == ';') {
				ans = ans + ";\n";
				while (i < len - 1 && code[i + 1] == '}') {
					space = space.substring(0, space.length - 1);
					ans = ans + space + "}" + "\n";
					i += 1;
				}
				ans = ans + space;

			} else if (code[i] == '{') {
				space = space + "\t";
				ans = ans + "{\n" + space;
			} else if (code[i] == '}') {
				ans = ans + "}";
				if (i < len - 1 && code[i + 1] == ';') {
					ans = ans + ";";
					i += 1;
				}
				ans = ans + '\n';
				space = space.substring(0, space.length - 1);
				ans = ans + space;
			} else {
				ans = ans + code[i];
			}
		}
		return ans;
	}

	private async _subPage(webView: vscode.Webview, index: number, code: string) {
		// const subPage = await browser.newPage();
		index = index + 1;
		try {
			webView.postMessage({ command: 'addTitle', title: "Result " + String(index), num: index });
			webView.postMessage({ command: 'addLink', url: "", num: index });
			var codes: string[] = new Array();
			// codes.push("def search(n):" + "\n"+"	l, r = 0, n + 1"+"\n"+ "	while l < r:" + "\n" + "		mid = l + (r - l) // 2" + "\n" +"		if check(mid):" +
			//  "\n" + "			l = mid + 1" + "\n" + "		else:" + "\n" + "			r = mid" + "\n" + "	return l - 1");			
			// for(let i=0; i<codes.length; i++){
			// 	webView.postMessage({command:'addCode', code:codes[i], num:0, codeId:i});
			// }
			webView.postMessage({ command: 'addCode', code: code, num: index, codeId: index });
			codes.push(code);
			const result: CodeSearchResult = { title: "result " + String(index), url: "", codes: codes };
			this._codeSearchResults.push(result);
			// await subPazge.close();
		} catch (e) {
			console.log(e);
			// await subPage.close();
		}
	}


}


// Returns a nonce
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

// Returns webview options
function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

// Returns WebviewPanelOptions
function getWebviewPanelOptions(): vscode.WebviewPanelOptions {
	return {
		// Keep the webview panel's content even when the panel become hidden
		retainContextWhenHidden: true
	}
}

// Returns if the host of the url is available
function getQuerySelector(url: URL) {
	for (let querySelector of querySelectors) {
		if (url.hostname.endsWith(querySelector.hostname)) {
			return querySelector.selector;
		}
	}
	return false;
}

function makeErrorHtml() {
	const html = `
		<!DOCTYPE html>
		<html lang="ja">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>code-search</title>
		</head>
		<body>
			<h1>Code-Search</h1>
			<h3>Error has occured!</h3>
			<p>Please check your internet connection.</p>
		</body>
		</html>
	`;
	return html;
}

function makeNotFoundHtml() {
	const html = `
		<!DOCTYPE html>
		<html lang="ja">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>code-search</title>
		</head>
		<body>
			<h1>Code-Search</h1>
			<h3>No page was found</h3>
		</body>
		</html>
	`;
	return html;
}