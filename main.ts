import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell, net } from 'electron';
import * as path from 'path';
import { pathToFileURL } from 'url';
import ContextMenu from 'electron-context-menu';
import windowStateKeeper from 'electron-window-state';

const IS_DEV = process.argv.slice(2).includes('--is-dev');
const CORE_DIR = path.join(__dirname, 'core');

const SPELLCHECK_LANGUAGES = ['en-AU', 'en-GB', 'en-US'];

let window: BrowserWindow | null;

function createWindow() {
	// Route file URIs correctly so our web workers don't just dieeee
	const coreUrl = pathToFileURL(CORE_DIR).toString() + '/';
	protocol.handle('file', (req) => {
		const url = req.url.startsWith(coreUrl)
			? req.url
			: new URL(path.join(CORE_DIR, new URL(req.url).pathname), 'file:').toString();
		return net.fetch(url, { bypassCustomProtocolHandlers: true });
	});

	const windowState = windowStateKeeper({
		defaultWidth: 1100,
		defaultHeight: 800
	})

	const preloadPath: string = path.join(__dirname, 'preload.js');
	window = new BrowserWindow({
		width: windowState.width,
		height: windowState.height,
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
			contextIsolation: true,
			sandbox: false,
			preload: preloadPath
		}
	});
	windowState.manage(window);

	// No-op on macOS, where the OS spellchecker chooses the language itself.
	if (process.platform !== 'darwin') {
		window.webContents.session.setSpellCheckerLanguages(SPELLCHECK_LANGUAGES);
	}
	window.webContents.setUserAgent(window.webContents.getUserAgent().replaceAll('µPad', 'MicroPad'));

	ipcMain.on('initialShouldSpellCheck', (_event, shouldSpellCheck) => {
		window?.webContents.session.setSpellCheckerEnabled(shouldSpellCheck);

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
					{
						type: 'checkbox',
						label: 'Spell Checking',
						checked: shouldSpellCheck,
						click: async menuItem => {
							window?.webContents.send('updateShouldSpellCheck', menuItem.checked);
							await dialog.showMessageBox({ message: `When you restart µPad, the spell checker will be ${menuItem.checked ? 'enabled' : 'disabled'}.` });
						}
					},
					{ type: 'separator' }
				]
			},
			{
				label: 'View',
				submenu: [
					{ role: 'zoomIn' },
					// https://github.com/MicroPad/MicroPad-Electron/issues/47
					{ role: 'zoomIn', accelerator: 'CommandOrControl+=', visible: false },
					{ role: 'zoomOut' },
					{ role: 'resetZoom' }
				]
			},
			{ role: 'windowMenu' }
		]);
		Menu.setApplicationMenu(appMenu);
	
		initSpellcheck(shouldSpellCheck);
	});


	window.loadURL(pathToFileURL(path.join(CORE_DIR, 'index.html')).toString());

	window.webContents.setWindowOpenHandler(details => {
		shell.openExternal(details.url);
		return { action: 'deny' };
	});

	window.on('closed', () => quitApp());

	if (IS_DEV) window.webContents.openDevTools();
}

function quitApp() {
	window = null;
	app.quit();
}

function initSpellcheck(shouldSpellCheck: boolean): void {
	if (!shouldSpellCheck) {
		ContextMenu({ showInspectElement: false });
		return;
	}

	ContextMenu({
		showInspectElement: false,
		// Chromium has already flagged the misspelling and produced the
		// suggestions, and `learnSpelling` writes the word through to the OS
		// dictionary, so there is nothing left for us to compute.
		menu: (defaultActions, params, _win, dictionarySuggestions) => [
			...dictionarySuggestions,
			...(params.misspelledWord ? [defaultActions.separator(), defaultActions.learnSpelling({})] : []),
			defaultActions.separator(),
			defaultActions.lookUpSelection({}),
			defaultActions.separator(),
			defaultActions.searchWithGoogle({}),
			defaultActions.cut({}),
			defaultActions.copy({}),
			defaultActions.paste({}),
			defaultActions.separator(),
			defaultActions.saveImage({}),
			defaultActions.saveImageAs({}),
			...(params.linkURL.startsWith('file:///') ? [] : [defaultActions.copyLink({})]),
			defaultActions.copyImage({}),
		]
	});
}

if (!app.requestSingleInstanceLock()) {
	// Another instance of this app is already running
	quitApp();
} else {
	app.name = 'µPad';
	app.disableHardwareAcceleration(); // This should fix https://github.com/MicroPad/Electron/issues/2
	app.on('ready', createWindow);
}
