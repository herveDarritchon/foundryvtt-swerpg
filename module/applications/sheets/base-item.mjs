const {api, sheets} = foundry.applications;

/**
 * A base ItemSheet built on top of ApplicationV2 and the Handlebars rendering backend.
 */
export default class SwerpgBaseItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ["swerpg", "item", "standard-form"],
        tag: "form",
        position: {
            width: 560,
            height: "auto"
        },
        actions: {
            actionAdd: SwerpgBaseItemSheet.#onActionAdd,
            actionDelete: SwerpgBaseItemSheet.#onActionDelete,
            actionEdit: SwerpgBaseItemSheet.#onActionEdit,
            hookAdd: SwerpgBaseItemSheet.#onHookAdd,
            hookDelete: SwerpgBaseItemSheet.#onHookDelete,
            editImage: SwerpgBaseItemSheet.#onEditImage
        },
        form: {
            submitOnChange: true
        },
        item: {
            type: undefined, // Defined by subclass
            includesActions: false,
            includesHooks: false,
            advancedDescription: false
        }
    };

    /**
     * A template path used to render a single action.
     * @type {string}
     */
    static ACTION_PARTIAL = "systems/swerpg/templates/sheets/partials/included-action.hbs";

    /** @override */
    static PARTS = {
        header: {
            id: "header",
            template: "systems/swerpg/templates/sheets/partials/item-header.hbs"
        },
        tabs: {
            id: "tabs",
            template: "templates/generic/tab-navigation.hbs"
        },
        description: {
            id: "description",
            template: "systems/swerpg/templates/sheets/partials/item-description.hbs"
        },
        config: {
            id: "config",
            template: undefined, // Populated during _initializeItemSheetClass
        }
    };

    /**
     * Define the structure of tabs used by this Item Sheet.
     * @type {Record<string, Array<Record<string, ApplicationTab>>>}
     */
    static TABS = {
        sheet: [
            {id: "description", group: "sheet", icon: "fa-solid fa-book", label: "ITEM.TABS.DESCRIPTION"},
            {id: "config", group: "sheet", icon: "fa-solid fa-cogs", label: "ITEM.TABS.CONFIGURATION"}
        ]
    }

    /** @override */
    tabGroups = {
        sheet: "description",
        description: "public" // Used by advancedDescription
    };

    /* -------------------------------------------- */

    /**
     * A method which can be called by subclasses in a static initialization block to refine configuration options at the
     * class level.
     */
    static _initializeItemSheetClass() {
        const item = this.DEFAULT_OPTIONS.item;
        this.PARTS = foundry.utils.deepClone(this.PARTS);
        this.TABS = foundry.utils.deepClone(this.TABS);

        // Item Type Configuration
        this.DEFAULT_OPTIONS.classes = [this.DEFAULT_OPTIONS.item.type];
        this.PARTS.config.template = `systems/swerpg/templates/sheets/partials/${item.type}-config.hbs`;
        this.PARTS.config.scrollable = [""] ;

        // Includes Actions
        if (item.includesActions) {
            this.PARTS.actions = {
                id: "actions",
                template: "systems/swerpg/templates/sheets/partials/item-actions.hbs",
                templates: [this.ACTION_PARTIAL]
            }
            this.TABS.sheet.push({
                id: "actions",
                group: "sheet",
                icon: "fa-solid fa-bullseye",
                label: "ITEM.TABS.ACTIONS"
            });
        }

        // Includes Hooks
        if (item.includesHooks) {
            this.PARTS.hooks = {
                id: "hooks",
                template: "systems/swerpg/templates/sheets/partials/item-hooks.hbs"
            }
            this.TABS.sheet.push({id: "hooks", group: "sheet", icon: "fa-solid fa-cogs", label: "ITEM.TABS.HOOKS"});
        }

        // Advanced Description
        if (item.advancedDescription) {
            this.PARTS.description.template = "systems/swerpg/templates/sheets/partials/item-description-advanced.hbs";
            this.TABS.description = [
                {id: "public", group: "description", label: "ITEM.TABS.PUBLIC"},
                {id: "secret", group: "description", label: "ITEM.TABS.SECRET"}
            ];
        }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        if (this.options.item.includesHooks && !game.user.isGM) {
            options.parts.findSplice(p => p === "hooks");
        }
    }

    /* -------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
        console.debug("base item options", this, options);
        const tabGroups = this._getTabs();
        return {
            item: this.document,
            isEditable: this.isEditable,
            fieldDisabled: this.isEditable ? "" : "disabled",
            source: this.document.toObject(),
            fields: this.document.system.schema.fields,
            tabGroups,
            tabs: tabGroups.sheet,
            tabsPartial: this.constructor.PARTS.tabs.template,
            tags: this.document.getTags()
        };
    }

    /* -------------------------------------------- */

    /** @override */
    async _preparePartContext(partId, context) {
        switch (partId) {
            case "actions":
                context.actionPartial = this.constructor.ACTION_PARTIAL;
                const actions = this.document.system.actions;
                context.actions = this.constructor.prepareActions(actions);
                break;
            case "hooks":
                context.actorHooks = this.#prepareActorHooks();
                context.actorHookChoices = Object.entries(SYSTEM.ACTOR_HOOKS).map(([hookId, cfg]) => ({
                    value: hookId,
                    label: hookId,
                    group: game.i18n.localize(cfg.group),
                    disabled: hookId in context.actorHooks
                }));
                break;
        }
        return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare data for the actor hooks currently registered by this item.
     * @returns {Record<string, {label: string, signature: string, argNames: string[]}>}
     */
    #prepareActorHooks() {
        const hooks = {};
        for (const h of this.document.system.actorHooks) {
            const cfg = SYSTEM.ACTOR_HOOKS[h.hook];
            const label = `${h.hook}(actor, ${cfg.argNames.join(", ")})`;
            hooks[h.hook] = {label, ...h};
        }
        return hooks;
    }

    /* -------------------------------------------- */

    /**
     * Configure the tabs used by this sheet.
     * @returns {Record<string, Record<string, ApplicationTab>>}
     * @protected
     */
    _getTabs() {
        const tabs = {};
        for (const [groupId, config] of Object.entries(this.constructor.TABS)) {
            const group = {};
            for (const t of config) {
                const active = this.tabGroups[t.group] === t.id;
                group[t.id] = Object.assign({active, cssClass: active ? "active" : ""}, t);
            }
            tabs[groupId] = group;
        }

        // Suppress GM access to hooks
        if (!game.user.isGM) delete tabs.sheet.hooks;
        return tabs;
    }

    /* -------------------------------------------- */

    /**
     * Prepare an array of actions for sheet rendering.
     * @param {SwerpgAction[]} actions    The actions being rendered
     * @returns {object[]}                  An object of data suitable for sheet rendering
     */
    static prepareActions(actions) {
        return actions.map(action => ({
            id: action.id,
            name: action.name,
            img: action.img,
            condition: action.condition,
            description: action.description,
            tags: action.getTags(),
            effects: action.effects
        }));
    }

    /* -------------------------------------------- */

    /*  HTML Rendering Helpers
    /* -------------------------------------------- */

    /**
     * A helper for quickly creating HTML elements.
     * @returns {HTMLElement}
     * @internal
     */
    static _createElement(tagName, {innerText, className} = {}) {
        const el = document.createElement(tagName);
        if (innerText) el.innerText = innerText;
        if (className) el.className = className;
        return el;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */

    /* -------------------------------------------- */

    /**
     * Prepare submission data for the form when needed as a side effect of some other workflow.
     * @param {Event} event
     * @returns {object}
     * @protected
     */
    _getSubmitData(event) {
        const fd = new FormDataExtended(this.element);
        return this._prepareSubmitData(event, this.element, fd);
    }

    /* -------------------------------------------- */

    /** @override */
    _processFormData(event, form, formData) {
        const submitData = foundry.utils.expandObject(formData.object);
        if (this.options.item.includesHooks) {
            submitData.system.actorHooks = Object.values(submitData.system.actorHooks || {});
        }
        return submitData;
    }

    /* -------------------------------------------- */

    /**
     * Edit the Item image.
     * TODO Port this to DocumentSheetV2 and remove this in V13.
     * @this {SwerpgBaseItemSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onEditImage(event) {
        const attr = event.target.dataset.edit;
        const current = foundry.utils.getProperty(this.document, attr);
        const fp = new FilePicker({
            current,
            type: "image",
            callback: path => {
                event.target.src = path;
                if (this.options.form.submitOnChange) {
                    const submit = new Event("submit");
                    this.element.dispatchEvent(submit);
                }
            },
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        await fp.browse();
    }

    /* -------------------------------------------- */

    /**
     * Add a new Action to the Item.
     * @this {SwerpgBaseItemSheet}
     * @param {PointerEvent} event          The initiating click event
     * @returns {Promise<void>}
     */
    static async #onActionAdd(event) {
        const fd = this._getSubmitData(event);
        const actions = this.document.system.toObject().actions;

        // Configure Action data
        const suffix = actions.length ? actions.length + 1 : "";
        const actionData = {id: swerpg.api.methods.generateId(this.document.name)};
        if (actions.length) {
            actionData.id += suffix;
            actionData.name = `${this.document.name} ${suffix}`
        }

        // Add data to the actions array
        const action = new swerpg.api.models.SwerpgAction(actionData, {parent: this.document.system});
        actions.push(action.toObject());
        fd.system.actions = actions;
        await this.document.update(fd);

        // Render the action configuration sheet
        await action.sheet.render({force: true});
    }

    /* -------------------------------------------- */

    /**
     * Delete an Action from the Item.
     * @this {SwerpgBaseItemSheet}
     * @param {PointerEvent} event          The initiating click event
     * @param {HTMLAnchorElement} button    The clicked button element
     * @returns {Promise<void>}
     */
    static async #onActionDelete(event, button) {
        const actionId = button.closest(".action").dataset.actionId;
        const idx = this.document.system.actions.findIndex(a => a.id === actionId);
        const action = this.document.system.actions[idx];
        if (!action) throw new Error(`Invalid Action id "${actionId}" requested for deletion`);

        // Prompt for confirmation
        const confirm = await api.DialogV2.confirm({
            title: game.i18n.format("ACTION.ACTIONS.DELETE", {name: action.name}),
            content: `<p>${game.i18n.format("ACTION.ACTIONS.DELETE_CONFIRM", {
                name: action.name,
                parent: this.document.name,
                type: game.i18n.localize(CONFIG.Item.typeLabels[this.document.type])
            })}</p>`
        });
        if (!confirm) return;
        if (action.sheet.rendered) action.sheet.close();

        // Remove the action and save
        const fd = this._getSubmitData(event);
        const actions = this.document.system.toObject().actions;
        actions.splice(idx, 1);
        fd.system.actions = actions;
        await this.document.update(fd);
    }

    /* -------------------------------------------- */

    /**
     * Edit an Action from the Item.
     * @this {SwerpgBaseItemSheet}
     * @param {PointerEvent} event          The initiating click event
     * @param {HTMLAnchorElement} button    The clicked button element
     * @returns {Promise<void>}
     */
    static async #onActionEdit(event, button) {
        const actionId = button.closest(".action").dataset.actionId;
        const action = this.document.system.actions.find(a => a.id === actionId);
        await action.sheet.render(true);
    }

    /* -------------------------------------------- */

    /**
     * Add a new hooked function to this Talent.
     * @this {TalentSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onHookAdd(event) {
        const hook = event.target.previousElementSibling.value
        const submitData = this._getSubmitData(event);
        submitData.system.actorHooks ||= [];
        if (submitData.system.actorHooks.find(h => h.hook === hook)) {
            ui.notifications.warn(`${this.document.name} already declares a function for the "${hook}" hook.`);
            return;
        }
        submitData.system.actorHooks.push({hook, fn: "// Hook code here"});
        await this.document.update(submitData);
    }

    /* -------------------------------------------- */

    /**
     * Delete a hooked function from this Talent.
     * @this {TalentSheet}
     * @param {PointerEvent} event
     * @returns {Promise<void>}
     */
    static async #onHookDelete(event) {
        const hook = event.target.closest(".hook").querySelector("input[type=hidden]").value;
        const submitData = this._getSubmitData(event);
        submitData.system.actorHooks.findSplice(h => h.hook === hook);
        await this.document.update(submitData);
    }
}
