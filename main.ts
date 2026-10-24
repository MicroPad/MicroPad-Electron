import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell, net } from 'electron';
import * as path from 'path';
import ContextMenu from 'electron-context-menu';
import windowStateKeeper from 'electron-window-state';

const IS_DEV = process.argv.slice(2).includes('--is-dev');

/* Chromium's built-in spellchecker. On macOS it hands off to the OS checker and
 * works out the language itself, so this list is ignored there; everywhere else
 * it needs to be told, and downloads the matching hunspell dictionaries from the
 * Chromium CDN the first time it needs them.
 *
 * There is no en-NZ dictionary -- Chromium ships en, en-AU, en-CA, en-GB,
 * en-GB-oxendict and en-US -- so en-GB stands in for it, NZ English following
 * the same -ise/-our spellings. A word is only flagged when it is missing from
 * every language in this list. */
const SPELLCHECK_LANGUAGES = ['en-AU', 'en-GB', 'en-US'];

let window: BrowserWindow | null;

function createWindow() {
	protocol.handle('file', (req) => {
		let file = new URL(req.url).pathname;
		return net.fetch(new URL(path.join(__dirname, 'core', file), 'file:').toString(), {
			bypassCustomProtocolHandlers: true
		});
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


	window.loadURL(new URL('index.html', 'file:').toString());

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
