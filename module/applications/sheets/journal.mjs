/**
 * Define a custom JournalEntrySheet subclass used for the Swerpg rules journal entries.
 */
export default class SwerpgJournalEntrySheet extends foundry.applications.sheets.journal.JournalEntrySheet {

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ["swerpg", "themed", "theme-dark"]
    };

    /** @override */
    get title() {
        let title = super.title;
        if (this.document.pack === "swerpg.rules") title = `${game.i18n.localize("SWERPG.Rules")}: ${title}`;
        return title;
    }
}
