import { webFrame } from 'electron';
import * as Typo from 'typo-js';
import * as fs from 'fs';
import * as ContextMenu from 'electron-context-menu';
import * as localforage from 'localforage';
import * as path from 'path';

interface IWindow {
	isElectron: boolean;
}

let userDict: Set<string> = new Set();
function init() {
	getWindow().isElectron = true;

	try {
		initSpellcheck();
	} catch (e) {
		alert(e);
	}
}

async function initSpellcheck(): Promise<void> {
	const dictAU = new Typo('en_AU', await readFile(path.join(__dirname, 'node_modules/dictionary-en-au/index.aff')), await readFile(path.join(__dirname, '/node_modules/dictionary-en-au/index.dic')));
	const dictUS = new Typo('en_US', await readFile(path.join(__dirname, 'node_modules/dictionary-en-us/index.aff')), await readFile(path.join(__dirname, '/node_modules/dictionary-en-us/index.dic')));

	let userDict: Set<string> = new Set(await localforage.getItem<string[]>('user dict'));

	setTimeout(() => {
		webFrame.setSpellCheckProvider('en-AU', false, {
			spellCheck(word) {
				// Don't spellcheck anything with a number in it
				if (/\d/.test(word)) return true;

				return userDict.has(word) || dictAU.check(word) || dictUS.check(word);
			}
		});
	}, 1000);

	ContextMenu({
		showInspectElement: false,
		prepend: (params) => {
			const word: string = params.misspelledWord;
			if (!word) return [];

			// Get suggestions
			return [
				...dictAU.suggest(word),
				...dictUS.suggest(word)
			].map(w => {
				return {
					label: w,
					click(selected) {
						// Replace selected text
						const replacement: string = selected.label;
						const input: HTMLInputElement = document.activeElement as HTMLInputElement;
						const start = input.selectionStart;
						const end = input.selectionEnd;

						setNativeValue(input, input.value.substring(0, start) + replacement + input.value.substring(end, input.value.length));
						input.dispatchEvent(new Event('input', { bubbles: true }));
					}
				};
			});
		},
		append: (params) => {
			if (params.misspelledWord) return [
				{
					label: 'Add to dictionary',
					click() {
						userDict.add(params.misspelledWord);
						localforage.setItem('user dict', Array.from(userDict));
					}
				}
			];

			return [];
		}
	});
}

// Thanks to https://github.com/facebook/react/issues/10135#issuecomment-314441175
function setNativeValue(element: HTMLInputElement, value: string) {
	const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
	const prototype = Object.getPrototypeOf(element);
	const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

	if (valueSetter && valueSetter !== prototypeValueSetter) {
		prototypeValueSetter.call(element, value);
	} else {
		valueSetter.call(element, value);
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
