import { app, BrowserWindow, Menu, protocol, shell } from 'electron';
import * as path from 'path';
import * as url from 'url';

const IS_DEV = process.argv.slice(2).includes('--is-dev');

let window: BrowserWindow;

function createWindow() {
	protocol.interceptFileProtocol('file', (req, callback) => {
		let url = req.url.substr(5);
		url = path.normalize(path.join(__dirname, 'core', url)).split('?')[0];

		callback(url);
	});

	let preloadPath: string = path.join(__dirname, 'preload.js');

	window = new BrowserWindow({
		width: 1100,
		height: 800,
		backgroundColor: '#607d8b',
		autoHideMenuBar: true,
		webPreferences: {
			/* This may seem bad, but I'm enabling most of the things this disables afterwards.
			 * Electron has added a new security setting blocking file loads from within iframes, which broke
			 * ASCIIMaths. There isn't a manual toggle for that change, so this has to be done.
			 */
			webSecurity: false,

			allowRunningInsecureContent: false,
			nodeIntegration: false,
			contextIsolation: false, // Despite what the Electron docs say, this now blocks access to window, so I have to disable it
			enableRemoteModule: true,
			preload: preloadPath
		}
	});

	const appMenu = Menu.buildFromTemplate([
		{
			label: (process.platform === 'darwin') ? app.getName() : 'File',
			submenu: [
				{ role: 'quit' }
			]
		},
		{
			id: 'edit-menu',
			label: 'Edit',
			submenu: [
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },

				{ role: 'copy' },
				{ role: 'cut' },
				{ role: 'paste' },
				{ role: 'selectAll' },
				{ role: 'delete' },
				{ type: 'separator' }
			]
		},
		{
			label: 'View',
			submenu: [
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ role: 'resetZoom' }
			]
		},
		{ role: 'windowMenu' }
	]);

	Menu.setApplicationMenu(appMenu);

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

	if (IS_DEV) window.webContents.openDevTools();
}

function quitApp() {
	window = null;
	app.quit();
}

if (!app.requestSingleInstanceLock()) {
	// Another instance of this app is already running
	quitApp();
} else {
	if (!!app.name) {
		// Electron 7
		app.name = 'µPad';
	} else {
		// Electron 6
		app.setName('µPad');
	}

	app.allowRendererProcessReuse = true;
	app.disableHardwareAcceleration(); // This should fix https://github.com/MicroPad/Electron/issues/2
	app.on('ready', createWindow);
}
