/**
 * An Application instance that renders the talent tree controls UI element.
 */
export default class SwerpgTalentTreeControls extends Application {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "swerpg-talent-controls",
            template: "systems/swerpg/templates/hud/talent-tree-controls.hbs",
            popOut: false
        });
    }

    /* -------------------------------------------- */

    /**
     * A convenience reference to the tree instance.
     * @returns {SwerpgTalentTree}
     */
    get tree() {
        return game.system.tree;
    }

    /* -------------------------------------------- */

    /** @override */
    getData(options = {}) {
        return {
            actor: this.tree.actor,
            cssClass: this.options.classes.join(" ")
        };
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        html.find("button.reset").click(() => this.tree.actor.resetTalents({dialog: true}));
        html.find("button.close").click(() => this.tree.close());
    }
}
