import * as vscode from 'vscode';  

const window = (vscode as any).window as any;
const commands = (vscode as any).commands as any;
const ExtensionContext = (vscode as any).ExtensionContext as any;

let connected_users: any = [];

const port = 33882;
const server = require('http').createServer();

const websocket = require('ws');

const wss = new websocket.Server({ server });

const universalOutputChannel = window.createOutputChannel("StarHub Universal Output");

wss.on('connection', (ws: any) => {
	setTimeout(() => {
		if (connected_users.some((user: any) => user.WS === ws)) {
			return;
		}

		ws.close();
		window.showErrorMessage("Connection user failed authentication");
	}, 1000);

	ws.on('message', (message: any) => {
		let data = JSON.parse(message);

		// Example data: { "type": "auth", "name": "user1" }
		if (data.type === "auth") {
			console.log("Connected user: " + data.name);
			window.showInformationMessage("Connected user: " + data.name);
			connected_users.push({
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
			console.log(connected_users);
		}

		// Example data: { "type": "compile_error", "error": "error message" }
		if (data.type === "compile_error") {
			window.showErrorMessage("Error in " + (connected_users.find((user: any) => user.WS === ws)).name + "'s code: " + data.error);
		}

		// Example data: { "type": "output", "output_type": "info", "output": "output message" }
		if (data.type === "output") {
			let output_type = data.output_type;
			let output = data.output;

			let colored_output = `[${output_type}] ${output}`;
			(connected_users.find((user: any) => user.WS === ws)).outputChannel.appendLine(colored_output);
			universalOutputChannel.appendLine(`[${(connected_users.find((user: any) => user.WS === ws)).name}] ${colored_output}`);
		}
	});

	ws.on('close', () => {
		console.log("User disconnected: " + connected_users.find((user: any) => user.WS === ws).name);
		window.showInformationMessage("User disconnected: " + connected_users.find((user: any) => user.WS === ws).name);
		connected_users.find((user: any) => user.WS === ws).outputChannel.dispose();
		connected_users.find((user: any) => user.WS === ws).WS.close();
		connected_users = connected_users.filter((user: any) => user.WS !== ws);
	});
});

server.listen(port, () => {
	console.log(`Server started on port ${port}`);
});

export function activate(context: typeof ExtensionContext) {
	console.log('Congratulations, your extension "starhub-ws-serv" is now active!');

	context.subscriptions.push(commands.registerCommand("starhub-ws-serv.activate", () => {
		console.log("starhub-ws-serv activated");
	}));

	context.subscriptions.push(
		commands.registerCommand('starhub-ws-serv.executeCode', () => {
			let editor = window.activeTextEditor;
			if (!editor) {
				window.showErrorMessage("No active editor");
				return;
			}

			let code = editor.document.getText();

			if (connected_users.length === 0) {
				window.showErrorMessage("No users connected");
				return;
			}

			let selected_user;

			if (connected_users.length === 1) {
				selected_user = connected_users[0];
				selected_user.WS.send(code);
				window.showInformationMessage("Code sent to " + selected_user.name);
			} else {
				const user_names = Object.values(connected_users).map((user: any) => {
					return { label: user.name, description: "Connected user" };
				});

				window.showQuickPick(user_names).then((selected_user_name: any) => {

					if (!selected_user_name) {
						console.log('No user selected.');
						return;
					}

					console.log(selected_user_name);
					selected_user = connected_users.find((user: any) => user.name === selected_user_name.label);

					if (selected_user) {
					    window.showInformationMessage("Code sent to " + selected_user.name);
						selected_user.WS.send(code);
					} else {
						console.log('No user selected or user not found.');
					}
				});
				
			}
		})
	);

	context.subscriptions.push(commands.registerCommand('starhub-ws-serv.helloWorld', () => {
		window.showInformationMessage('Hello World from starhub-ws-serv!');
	}));

	let button = window.createStatusBarItem((vscode as any).StatusBarAlignment.Left);
	button.text = "$(debug-start) Execute code";
	button.command = "starhub-ws-serv.executeCode";
	button.tooltip = "Execute code on a connected user";
	button.show();
}

export function deactivate() {
	console.log('Congratulations, your extension "starhub-ws-serv" is now deactivated!');
	connected_users.forEach((user: any) => {
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
