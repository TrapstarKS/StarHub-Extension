import * as vscode from 'vscode';

const server = require('http').createServer();
const wss = new (require('ws')).Server({ server });

const { window, commands } = vscode;

interface ConnectedUser {
	name: string;
	outputChannel: vscode.OutputChannel;
	close: () => void;
	send: (data: any) => void;
	WS: any;
}

const connectedUsers: ConnectedUser[] = [];
const port = 33882;
const universalOutputChannel = window.createOutputChannel("StarHub Universal Output");

wss.on('connection', (ws: any) => {
	setTimeout(() => {
		if (connectedUsers.some((user) => user.WS === ws)) {
			return;
		}

		ws.close();
		window.showErrorMessage("Connection user failed authentication");
	}, 1000);

	ws.on('message', (message: any) => {
		let data = JSON.parse(message);

		if (data.type === "auth") {
			console.log("Connected user: " + data.name);
			window.showInformationMessage("Connected user: " + data.name);
			connectedUsers.push({
				name: data.name,
				outputChannel: window.createOutputChannel("StarHub: " + data.name),
				close: () => {
					ws.close();
				},
				send: (data: any) => {
					ws.send(data);
				},
				WS: ws
			});
			console.log(connectedUsers);
		}

		if (data.type === "compile_error") {
			const user = connectedUsers.find((user) => user.WS === ws);
			if (user) {
				window.showErrorMessage("Error in " + user.name + "'s code: " + data.error);
			}
		}

		if (data.type === "output") {
			const user = connectedUsers.find((user) => user.WS === ws);
			if (user) {
				let { output_type, output } = data;
				let colored_output = `[${output_type}] ${output}`;
				user.outputChannel.appendLine(colored_output);
				universalOutputChannel.appendLine(`[${user.name}] ${colored_output}`);
			}
		}
	});

	ws.on('close', () => {
		const user = connectedUsers.find((user) => user.WS === ws);
		if (user) {
			console.log("User disconnected: " + user.name);
			window.showInformationMessage("User disconnected: " + user.name);
			user.outputChannel.dispose();
			user.WS.close();
			connectedUsers.splice(connectedUsers.indexOf(user), 1);
		}
	});
});

server.listen(port, () => {
	console.log(`Server started on port ${port}`);
});

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "starhub-ws-serv" is now active!');
	context.subscriptions.push(commands.registerCommand("starhub-ws-serv.activate", () => {
		console.log("starhub-ws-serv activated");
	}));

	context.subscriptions.push(
		vscode.commands.registerCommand("starhub-ws-serv.executeSelectedCode", () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.selection.isEmpty) {
				vscode.window.showErrorMessage("No code selected to execute.");
				return;
			}

			const code = editor.document.getText(editor.selection);

			if (connectedUsers.length === 0) {
				vscode.window.showErrorMessage("No users connected");
				return;
			}

			const selectedUser = connectedUsers.length === 1 ? connectedUsers[0] : undefined;

			if (selectedUser) {
				selectedUser.WS.send(code);
				vscode.window.showInformationMessage(`Code sent to ${selectedUser.name}`);
			} else {
				vscode.window.showQuickPick(connectedUsers.map((user) => user.name)).then((selectedName) => {
					const user = connectedUsers.find((u) => u.name === selectedName);
					if (user) {
						user.WS.send(code);
						vscode.window.showInformationMessage(`Code sent to ${user.name}`);
					}
				});
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("starhub-ws-serv.executeCode", () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage("No active editor.");
				return;
			}

			const code = editor.document.getText();

			if (connectedUsers.length === 0) {
				vscode.window.showErrorMessage("No users connected");
				return;
			}

			const selectedUser = connectedUsers.length === 1 ? connectedUsers[0] : undefined;

			if (selectedUser) {
				selectedUser.WS.send(code);
				vscode.window.showInformationMessage(`Code sent to ${selectedUser.name}`);
			} else {
				vscode.window.showQuickPick(connectedUsers.map((user) => user.name)).then((selectedName) => {
					const user = connectedUsers.find((u) => u.name === selectedName);
					if (user) {
						user.WS.send(code);
						vscode.window.showInformationMessage(`Code sent to ${user.name}`);
					}
				});
			}
		})
	);

	context.subscriptions.push(commands.registerCommand('starhub-ws-serv.helloWorld', () => {
		window.showInformationMessage('Hello World from starhub-ws-serv!');
	}));

	const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    button.text = "$(debug-start) Execute Code";
    button.command = "starhub-ws-serv.executeCode";
    button.tooltip = "Execute code on a connected user";
    button.show();
    context.subscriptions.push(button);
}

export function deactivate() {
	console.log('Congratulations, your extension "starhub-ws-serv" is now deactivated!');
	connectedUsers.forEach((user) => {
		if (user.WS.readyState !== user.WS.OPEN) {
			return;
		}
		user.outputChannel.dispose();
		user.WS.close();
	});
	universalOutputChannel.dispose();
	server.close();
	wss.close();
}
