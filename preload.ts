import { ipcRenderer, webFrame } from 'electron';
import localforage from 'localforage';
import { getDicts } from './dicts';

const { contextBridge } = require('electron')

let userDict: Set<string> = new Set();

function init() {
	contextBridge.exposeInMainWorld('isElectron', true);

	initSpellcheck()
		.catch(e => console.error(e));
}

async function initSpellcheck(): Promise<void> {
	await localforage.ready();

	let shouldSpellCheck = (await localforage.getItem<boolean>('should spell check')) !== false;
	userDict = new Set(await localforage.getItem<string[]>('user dict'));

	ipcRenderer.on('updateShouldSpellCheck', async (event, newShouldSpellCheck) => {
		await localforage.setItem<boolean>('should spell check', newShouldSpellCheck);
	});
	ipcRenderer.on('addToUserDict', async (event, misspelledWord) => {
		userDict.add(misspelledWord);
		await localforage.setItem('user dict', Array.from(userDict));
	});

	ipcRenderer.send('initialShouldSpellCheck', shouldSpellCheck);

	if(!shouldSpellCheck){
		return;
	}

	const dicts = await getDicts();

	setTimeout(() => {
		webFrame.setSpellCheckProvider('en-AU', {
			spellCheck(words, callback) {
				const misspelt = words
					.filter(word => !/\d/.test(word)) // Don't spellcheck anything with a number in it
					.filter(word => !(userDict.has(word) || dicts.AU.check(word) || dicts.US.check(word)));

				callback(misspelt);
			}
		});
	}, 1000);
}

init();
