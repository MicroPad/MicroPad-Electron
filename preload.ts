import { SpellCheckHandler, ContextMenuListener, ContextMenuBuilder } from 'electron-spellchecker';

function initSpellcheck() {
	getWindow().spellCheckHandler = new SpellCheckHandler();

	getWindow().spellCheckHandler.switchLanguage('en-NZ');

	// const contextMenuBuilder = new ContextMenuBuilder(getWindow().spellCheckHandler);
	// const contextMenuListener = new ContextMenuListener(info => contextMenuBuilder.showPopupMenu(info));
}
initSpellcheck();
setInterval(() => {
	try {
		getWindow().spellCheckHandler.attachToInput();
	} catch (err) {}
}, 1000);

interface IWindow {
	spellCheckHandler: SpellCheckHandler;
}
function getWindow(): IWindow {
	return window as any;
}
