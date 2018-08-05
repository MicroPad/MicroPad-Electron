import { app, BrowserWindow, protocol, shell, Menu, MenuItem, TouchBar, nativeImage } from 'electron';
const { TouchBarLabel, TouchBarButton, TouchBarSpacer } = TouchBar;
import * as path from 'path';
import * as url from 'url';

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
			nodeIntegration: false,
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
			label: 'Edit',
			submenu: [
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },

				{ role: 'copy' },
				{ role: 'cut' },
				{ role: 'paste' },
				{ role: 'selectAll' },
				{ role: 'delete' }
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
	initTouchbar();

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

function initTouchbar() {
	if (process.platform !== 'darwin') return;

	const touchbar = new TouchBar({
		items: [
			new TouchBarButton({
				icon: nativeImage.createFromNamedImage('NSTouchBarEnterFullScreenTemplate', [-1, 0, 1]),
				iconPosition: 'left',
				label: 'Toggle Fullscreen'
			})
		]
	});

	window.setTouchBar(touchbar);
}

function quitApp() {
	window = null;
	app.quit();
}

app.setName('µPad');
app.disableHardwareAcceleration(); // This should fix https://github.com/MicroPad/Electron/issues/2
app.on('ready', createWindow);
