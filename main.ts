import { app, BrowserWindow, protocol, shell } from 'electron';
import * as path from 'path';
import * as url from 'url';

let window: BrowserWindow;

function createWindow() {
	protocol.interceptFileProtocol('file', (req, callback) => {
		let url = req.url.substr(5);
		url = path.normalize(path.join(__dirname, 'core', url)).split('?')[0];

		callback(url);
	});

	window = new BrowserWindow({
		width: 1000,
		height: 800,
		webPreferences: {
			nodeIntegration: false,
			preload: path.join(__dirname, 'preload.js')
		}
	});
	window.loadURL(url.format({
		pathname: 'index.html',
		protocol: 'file:',
		slashes: true
	}));

	window.webContents.on('new-window', (event, url) => {
		event.preventDefault();
		shell.openExternal(url);
		return true;
	});

	window.on('closed', () => quitApp());
}

function quitApp() {
	window = null;
	app.quit();
}

app.on('ready', createWindow);
