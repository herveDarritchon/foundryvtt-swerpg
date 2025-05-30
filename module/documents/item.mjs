import TalentFactory from "../lib/talents/talent-factory.mjs";
import ErrorTalent from "../lib/talents/error-talent.mjs";

/**
 * An Item subclass which handles system specific logic for the Item document type.
 */
export default class SwerpgItem extends Item {

    /* -------------------------------------------- */
    /*  Item Attributes                             */

    /* -------------------------------------------- */

    /**
     * Item-specific configuration data which is constructed before any additional data preparation steps.
     * @type {object}
     */
    get config() {
        return this.system.config;
    }

    /**
     * An array of actions that this Item provides.
     * @type {SwerpgAction}
     */
    get actions() {
        return this.system.actions;
    }

    /**
     * Current talent rank for this Item
     * @type {TalentRankData}
     */
    get rank() {
        return this.system.currentRank;
    }

    /* -------------------------------------------- */
    /*  Item Data Preparation                       */

    /* -------------------------------------------- */

    /** @override */
    prepareBaseData() {
        switch (this.type) {
            case "skill":
                this.system.config = SYSTEM.skills.skills[this.system.skill] || {};
                break;
        }
        return super.prepareBaseData();
    }

    /* -------------------------------------------- */

    /** @override */
    prepareDerivedData() {
        switch (this.type) {
            case "skill":
                return this._prepareSkillData();
        }
    }

    /* -------------------------------------------- */

    /**
     * Prepare additional data for Skill type Items.
     */
    _prepareSkillData() {
        const skill = this.config || {};

        // Copy and merge skill data
        this.name = skill.name;
        this.img = skill.icon;
        this.category = skill.category;
        this.abilities = skill.abilities;

        // Skill rank
        let current = null;
        let next = null;
        this.ranks = foundry.utils.deepClone(skill.ranks).map(r => {
            r.purchased = (r.rank > 0) && (r.rank <= this.rank);
            if (r.rank === this.rank) current = r;
            else if (r.rank === this.rank + 1) next = r;
            return r;
        });
        this.currentRank = current;
        this.nextRank = next;

        // Skill progression paths
        let path = null;
        this.paths = foundry.utils.deepClone(skill.paths).map(p => {
            p.active = p.id === this.path;
            if (p.active) path = p;
            return p;
        });
        this.path = path;
    }

    /* -------------------------------------------- */
    /*  Helper Methods                              */

    /* -------------------------------------------- */

    /**
     * Provide an array of detail tags which are shown in each item description
     * @param {string} [scope="full"]       The scope of tags being retrieved, "full" or "short"
     * @returns {Record<string, string>}    The tags which describe this Item
     */
    getTags(scope = "full") {
        return this.system.getTags?.(scope) || {};
    }

    /* -------------------------------------------- */
    /*  Database Workflows                          */

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preCreate(data, options, user) {
        await super._preCreate(data, options, user);
        if (this.isOwned) {
            switch (data.type) {
                case "ancestry":
                    if (this.parent.type === "character") await this.parent.system.applyAncestry(this);
                    return false;   // Prevent creation
                case "archetype":
                    if (this.parent.type === "adversary") await this.parent.system.applyArchetype(this);
                    return false;   // Prevent creation
                case "background":
                    if (this.parent.type === "character") await this.parent.system.applyBackground(this);
                    return false;   // Prevent creation
                case "origin":
                    if (this.parent.type === "character") await this.parent.system.applyOrigin(this);
                    return false;   // Prevent creation
                case "spell":
                    try {
                        this.parent.canLearnIconicSpell(this);
                    } catch (err) {
                        return false;
                    }
                    options.keepId = true;
                    break;
                case "talent":
                    options.keepId = true;
                    options.keepEmbeddedIds = true;
                    break;          // Allow creation
                case "taxonomy":
                    if (this.parent.type === "adversary") await this.parent.system.applyTaxonomy(this);
                    return false;   // Prevent creation
            }
        }
    }

    /* -------------------------------------------- */

    /**
     * Deletes the talent associated with the current object instance.
     *
     * Logs the name of the talent and its data to the console.
     *
     * Cette méthode est appelé dynamiquement lors de l'appel de la méthode
     * SwerpgBaseActorSheet.#onItemDelete puis item.deleteDialog?.({...})
     *
     * @return {void} No return value.
     */
    async deleteTalent() {
        // Build the skill class depending on the context
        const talentClass = TalentFactory.build(this.actor, this, {
            action: "forget",
            isCreation: true,
        }, {});

        if (talentClass instanceof ErrorTalent) {
            ui.notifications.warn(talentClass.options.message);
            return;
        }

        console.debug(`[Before] onToggleTrainedTalent talent ('${talentClass}') with id '${this.id}', is Career ${this.system.isRanked} and values:`, this.actor, this.system.rank);

        // Evaluate the talent following the action processed
        const talentEvaluated = talentClass.process();

        // Display a warning if the talent action is not valid
        if (talentEvaluated instanceof ErrorTalent) {
            ui.notifications.warn(talentEvaluated.options.message);
            return;
        }

        // Update the talent state in the Database
        const talentUpdated = await talentEvaluated.updateState();

        // Display a warning if the talent action is not valid
        if (talentUpdated instanceof ErrorTalent) {
            ui.notifications.warn(talentUpdated.options.message);
            return;
        }

        console.debug(`[After] onToggleTrainedTalent talent with id '${talentUpdated.data.id}', is ranked ${talentUpdated.data.system.isRanked} and values:`, talentUpdated.actor, talentUpdated.data.system.rank);
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    _onUpdate(data, options, userId) {
        this._displayScrollingStatus(data);
        return super._onUpdate(data, options, userId);
    }

    /* -------------------------------------------- */

    /**
     * Display changes to the Item as scrolling combat text.
     * @private
     */
    _displayScrollingStatus(changed) {
        if (!this.isOwned) return;
        if (!["armor", "weapon"].includes(this.type)) return;
        const tokens = this.actor.getActiveTokens(true);

        // Equipment changes
        if (changed.system?.equipped !== undefined) {
            const text = `${changed.system.equipped ? "+" : "-"}(${this.name})`;
            for (let token of tokens) {
                canvas.interface.createScrollingText(token.center, text, {
                    anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
                    direction: CONST.TEXT_ANCHOR_POINTS[changed.system.equipped ? "TOP" : "BOTTOM"],
                    fontSize: 36,
                    stroke: 0x000000,
                    strokeThickness: 4
                });
            }
        }
    }
}
