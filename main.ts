import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell } from 'electron';
import * as path from 'path';
import ContextMenu from 'electron-context-menu';
import { getDicts } from './dicts';

const IS_DEV = process.argv.slice(2).includes('--is-dev');

let window: BrowserWindow | null;

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
			contextIsolation: true,
			spellcheck: false, // We handle spellcheck with custom code in `preload.ts`
			sandbox: false,
			preload: preloadPath
		}
	});

	window.webContents.session.setSpellCheckerEnabled(false);

	ipcMain.on('initalShouldSpellCheck', (_event, shouldSpellCheck) => {
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
	
		initSpellcheck(shouldSpellCheck)
			.catch(e => console.error(e));
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

async function initSpellcheck(shouldSpellCheck: boolean): Promise<void> {
	if (!shouldSpellCheck) {
		ContextMenu({ showInspectElement: false });
		return;
	}

	const dicts = await getDicts();

	(() => {
		ContextMenu({
			menu: (defaultActions, params) => {
				const spellSuggestions = params.misspelledWord
					? Array.from(new Set([...dicts.AU.suggest(params.misspelledWord), ...dicts.US.suggest(params.misspelledWord)]))
					: [];

				const spellSuggestionOptions = spellSuggestions.map(w => {
					return {
						label: w,
						click(selected) {
							window?.webContents.replaceMisspelling(selected.label)
						}
					};
				});

				const learnSpelling = params.misspelledWord ? [
					defaultActions.separator(),
					{
						label: 'Add to dictionary',
						click() {
							window?.webContents.send('addToUserDict', params.misspelledWord);
						}
					}
				] : [];

				return [
					...spellSuggestionOptions,
					...learnSpelling,
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
				];
			}
		});
	})();
}

if (!app.requestSingleInstanceLock()) {
	// Another instance of this app is already running
	quitApp();
} else {
	app.name = 'µPad';
	app.disableHardwareAcceleration(); // This should fix https://github.com/MicroPad/Electron/issues/2
	app.on('ready', createWindow);
}
