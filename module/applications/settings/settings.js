import * as chat from "../../chat.mjs";

export const registerSystemSettings = function () {

    /**
     * Track the system version upon which point a migration was last applied
     */
    game.settings.register(SYSTEM.id, "systemMigrationVersion", {
        name: "System Migration Version",
        scope: "world",
        config: false,
        type: String,
        default: ""
    });

    game.settings.register(SYSTEM.id, "worldKey", {
        name: "Unique world key for world tracking",
        scope: "world",
        config: false,
        type: String,
        default: "",
    })

    game.settings.register(SYSTEM.id, "devMode", {
        name: "A setting to enable or disable dev mode",
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
    })

    // Register settings
    game.settings.register("swerpg", "actionAnimations", {
        name: "Enable Action Animations",
        hint: "Enable automatic action animations using Sequencer and JB2A. Both modules must be installed and enabled for this feature to work.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("swerpg", "autoConfirm", {
        name: "SETTINGS.AutoConfirmName",
        hint: "SETTINGS.AutoConfirmHint",
        scope: "world",
        config: true,
        type: Number,
        choices: {
            0: "SETTINGS.AutoConfirmNone",
            1: "SETTINGS.AutoConfirmSelf",
            2: "SETTINGS.AutoConfirmAll"
        },
    });

    game.settings.register("swerpg", "welcome", {
        scope: "client",
        config: false,
        type: Boolean,
        default: false
    });

    // Register keybindings
    game.keybindings.register("swerpg", "confirm", {
        name: "KEYBINDINGS.ConfirmAction",
        hint: "KEYBINDINGS.ConfirmActionHint",
        editable: [{key: "KeyX"}],
        restricted: true,
        onDown: chat.onKeyboardConfirmAction
    });

    // TODO this needs to change to a Combat flag
    game.settings.register("swerpg", "heroism", {
        scope: "world",
        config: false,
        type: Number,
        default: 0
    });

}