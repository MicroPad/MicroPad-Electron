import { ipcRenderer } from 'electron';
import localforage from 'localforage';

const { contextBridge } = require('electron')

function init() {
	contextBridge.exposeInMainWorld('isElectron', true);

	initSpellcheck()
		.catch(e => console.error(e));
}

/* Spellchecking itself is handled by Chromium's built-in checker, configured in
 * `main.ts`. All that is left here is remembering whether the user wants it,
 * which has to happen in the renderer because the preference lives in
 * localforage alongside the rest of MicroPad's storage. */
async function initSpellcheck(): Promise<void> {
	await localforage.ready();

	const shouldSpellCheck = (await localforage.getItem<boolean>('should spell check')) !== false;

	ipcRenderer.on('updateShouldSpellCheck', async (event, newShouldSpellCheck) => {
		await localforage.setItem<boolean>('should spell check', newShouldSpellCheck);
	});

	ipcRenderer.send('initialShouldSpellCheck', shouldSpellCheck);
}

init();
