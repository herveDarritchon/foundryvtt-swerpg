/**
 * Extend and replace the core CombatTracker class to add Swerpg-specific UI customizations.
 */
export default class SwerpgCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {

    /** @inheritDoc */
    async _renderInner(data) {
        const html = await super._renderInner(data);
        for (const i of html.find(".combatant-control.roll")) i.remove();
        return html;
    }
}
