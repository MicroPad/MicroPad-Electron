import { webFrame } from 'electron';
import * as Typo from 'typo-js';
import * as fs from 'fs';
import * as ContextMenu from 'electron-context-menu';
import * as localforage from 'localforage';

interface IWindow {
	isElectron: boolean;
}

let userDict: Set<string> = new Set();

function init() {
	getWindow().isElectron = true;

	initSpellcheck();
}

function initSpellcheck() {
	const dictAU = new Typo('en_AU', fs.readFileSync('./node_modules/dictionary-en-au/index.aff').toString(), fs.readFileSync('./node_modules/dictionary-en-au/index.dic').toString());
	const dictUS = new Typo('en_US', fs.readFileSync('./node_modules/dictionary-en-us/index.aff').toString(), fs.readFileSync('./node_modules/dictionary-en-us/index.dic').toString());

	localforage.getItem('user dict')
		.then((dict: string[]) => {
			if (!!dict) userDict = new Set(dict);

			setTimeout(() => {
				webFrame.setSpellCheckProvider('en-AU', false, {
					spellCheck(word) {
						// Don't spellcheck anything with a number in it
						if (/\d/.test(word)) return true;

						return userDict.has(word) || dictAU.check(word) || dictUS.check(word);
					}
				});
			}, 1000);
		});

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

						input.value = input.value.substring(0, start) + replacement + input.value.substring(end, input.value.length);
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

function getWindow(): IWindow {
	return window as any;
}

init();
