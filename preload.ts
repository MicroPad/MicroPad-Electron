import { webFrame } from 'electron';
/** @type {import("./types/typo-js")} */
import Typo from 'typo-js';
import * as fs from 'fs';
import ContextMenu from 'electron-context-menu';
import * as path from 'path';
import { BrowserWindow, dialog, Menu, MenuItem } from '@electron/remote';
import localforage from 'localforage';

interface IWindow {
	isElectron: boolean;
}

let userDict: Set<string> = new Set();
let shouldSpellCheck = true;

function init() {
	getWindow().isElectron = true;

	initSpellcheck()
		.then(() => addSpellCheckMenuItem())
		.catch(e => console.error(e));
}

console.log(BrowserWindow.getAllWindows());

async function initSpellcheck(): Promise<void> {
	await localforage.ready();

	shouldSpellCheck = (await localforage.getItem<boolean>('should spell check')) !== false;
	if (!shouldSpellCheck) {
		const process = { type: 'browser' };
		ContextMenu({ showInspectElement: false });
		return;
	}

	const dictAU = new Typo('en_AU', await readFile(path.join(__dirname, 'node_modules/dictionary-en-au/index.aff')), await readFile(path.join(__dirname, '/node_modules/dictionary-en-au/index.dic')));
	const dictUS = new Typo('en_US', await readFile(path.join(__dirname, 'node_modules/dictionary-en/index.aff')), await readFile(path.join(__dirname, '/node_modules/dictionary-en/index.dic')));

	userDict = new Set(await localforage.getItem<string[]>('user dict'));

	setTimeout(() => {
		webFrame.setSpellCheckProvider('en-AU', {
			spellCheck(words, callback) {
				const misspelt = words
					.filter(word => !/\d/.test(word)) // Don't spellcheck anything with a number in it
					.filter(word => !(userDict.has(word) || dictAU.check(word) || dictUS.check(word)));

				callback(misspelt);
			}
		});
	}, 1000);

	(() => {
		const process = { type: 'browser' };
		ContextMenu({
			showInspectElement: false,
			// @ts-ignore
			prepend: (actions, params) => {
				const word: string = params.misspelledWord;
				if (!word) return [];

				// Get suggestions
				return [
					...dictAU.suggest(word),
					...dictUS.suggest(word)
				].map(w => {
					return new MenuItem({
						label: w,
						click(selected) {
							// Replace selected text
							const replacement: string = selected.label;
							const input: HTMLInputElement = document.activeElement as HTMLInputElement;
							const start = input.selectionStart;
							const end = input.selectionEnd;
							if (start === null || end === null) {
								return;
							}

							const replacementEnd = start + replacement.length;

							setNativeValue(input, input.value.substring(0, start) + replacement + input.value.substring(end, input.value.length));
							input.setSelectionRange(replacementEnd, replacementEnd);
							input.dispatchEvent(new Event('input', { bubbles: true }));
						}
					});
				});
			},
			// @ts-ignore
			append: (actions, params) => {
				if (params.misspelledWord) return [
					new MenuItem({
						label: 'Add to dictionary',
						click() {
							userDict.add(params.misspelledWord);
							localforage.setItem('user dict', Array.from(userDict));
						}
					})
				];

				return [];
			}
		});
	})();
}

function addSpellCheckMenuItem() {
	const menu = Menu.getApplicationMenu() as any;
	menu.getMenuItemById('edit-menu').submenu.append(new MenuItem({
		type: 'checkbox',
		label: 'Spell Checking',
		checked: shouldSpellCheck,
		click: async menuItem => {
			await localforage.setItem<boolean>('should spell check', menuItem.checked);
			await dialog.showMessageBox({ message: `When you restart MicroPad, the spell checker will be ${menuItem.checked ? 'enabled' : 'disabled'}.` });
		}
	}));
}

// Thanks to https://github.com/facebook/react/issues/10135#issuecomment-314441175
function setNativeValue(element: HTMLInputElement, value: string) {
	const valueProp = Object.getOwnPropertyDescriptor(element, 'value') ?? Object.getOwnPropertyDescriptor(element['__proto__'], 'value');

	const valueSetter = valueProp?.set;
	const prototype = Object.getPrototypeOf(element);
	const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

	if (valueSetter && valueSetter !== prototypeValueSetter) {
		prototypeValueSetter?.call(element, value);
	} else {
		valueSetter!.call(element, value);
	}
}

function readFile(path: string): Promise<string> {
	return new Promise<string>(resolve => {
		fs.readFile(path, (err, data) => {
			if (!!err) resolve('');
			resolve(data.toString());
		});
	});
}

function getWindow(): IWindow {
	return window as any;
}

init();
