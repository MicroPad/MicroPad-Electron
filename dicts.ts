import * as fs from 'fs';
import * as path from 'path';
/** @type {import('./types/typo-js')} */
import Typo from 'typo-js';

export async function getDicts(){
    const dictAU = new Typo('en_AU', await readFile(path.join(__dirname, 'node_modules/dictionary-en-au/index.aff')), await readFile(path.join(__dirname, '/node_modules/dictionary-en-au/index.dic')));
    const dictUS = new Typo('en_US', await readFile(path.join(__dirname, 'node_modules/dictionary-en/index.aff')), await readFile(path.join(__dirname, '/node_modules/dictionary-en/index.dic')));
    return {AU: dictAU, US: dictUS}
}


function readFile(path: string): Promise<string> {
	return new Promise<string>(resolve => {
		fs.readFile(path, (err, data) => {
			if (!!err) resolve('');
			resolve(data.toString());
		});
	});
}