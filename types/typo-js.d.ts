/**
 * Typo is a JavaScript implementation of a spellchecker using hunspell-style
 * dictionaries.
 */
declare class Typo {

	/**
	 * Typo constructor.
	 *
	 * @param {String} [dictionary] The locale code of the dictionary being used. e.g.,
	 *                              "en_US". This is only used to auto-load dictionaries.
	 * @param {String} [affData]    The data from the dictionary's .aff file. If omitted
	 *                              and Typo.js is being used in a Chrome extension, the .aff
	 *                              file will be loaded automatically from
	 *                              lib/typo/dictionaries/[dictionary]/[dictionary].aff
	 *                              In other environments, it will be loaded from
	 *                              [settings.dictionaryPath]/dictionaries/[dictionary]/[dictionary].aff
	 * @param {String} [wordsData]  The data from the dictionary's .dic file. If omitted
	 *                              and Typo.js is being used in a Chrome extension, the .dic
	 *                              file will be loaded automatically from
	 *                              lib/typo/dictionaries/[dictionary]/[dictionary].dic
	 *                              In other environments, it will be loaded from
	 *                              [settings.dictionaryPath]/dictionaries/[dictionary]/[dictionary].dic
	 * @param {Object} [settings]   Constructor settings. Available properties are:
	 *                              {String} [dictionaryPath]: path to load dictionary from in non-chrome
	 *                              environment.
	 *                              {Object} [flags]: flag information.
	 *                              {Boolean} [asyncLoad]: If true, affData and wordsData will be loaded
	 *                              asynchronously.
	 *                              {Function} [loadedCallback]: Called when both affData and wordsData
	 *                              have been loaded. Only used if asyncLoad is set to true. The parameter
	 *                              is the instantiated Typo object.
	 *
	 * @returns {Typo} A Typo object.
	 */
	constructor(
		dictionary: string,
		affData: string,
		wordsData: string,
		settings: {
			dictionaryPath: string,
			flags: Flags,
			asyncLoad: boolean,
			loadedCallback: (typo: Typo) => void
		}
	);

	/**
	 * Loads a Typo instance from a hash of all of the Typo properties.
	 *
	 * @param object obj A hash of Typo properties, probably gotten from a JSON.parse(JSON.stringify(typo_instance)).
	 */
	load(object: any): Typo;

	/**
	 * Checks whether a word or a capitalization variant exists in the current dictionary.
	 * The word is trimmed and several variations of capitalizations are checked.
	 * If you want to check a word without any changes made to it, call checkExact()
	 *
	 * @see http://blog.stevenlevithan.com/archives/faster-trim-javascript re:trimming function
	 *
	 * @param {String} aWord The word to check.
	 * @returns {Boolean}
	 */
	check(aWord: string): boolean;

	/**
	 * Returns a list of suggestions for a misspelled word.
	 *
	 * @see http://www.norvig.com/spell-correct.html for the basis of this suggestor.
	 * This suggestor is primitive, but it works.
	 *
	 * @param {String} word The misspelling.
	 * @param {Number} [limit=5] The maximum number of suggestions to return.
	 * @returns {String[]} The array of suggestions.
	 */
	suggest(word: string, limit?: number): string[];

	/**
	 * Read the contents of a file.
	 *
	 * @param {String} path The path (relative) to the file.
	 * @param {String} [charset="ISO8859-1"] The expected charset of the file
	 * @param {Boolean} async If true, the file will be read asynchronously. For node.js this does nothing, all
	 *        files are read synchronously.
	 * @returns {String} The file data if async is false, otherwise a promise object. If running node.js, the data is
	 *          always returned.
	 */
	private _readFile(path: string, charset: string = 'ISO8859-1', async: boolean): string | Promise<string>;
}

type Flags = 'PFX' | 'SFX' | 'REP' | 'FLAG' | 'COMPOUNDMIN' | 'COMPOUNDRULE' | 'ONLYINCOMPOUND' | 'KEEPCASE' | 'NOSUGGEST' | 'NEEDAFFIX';

module.exports = Typo;
