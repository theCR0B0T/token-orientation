export const registerSettings = function () {
    game.settings.register("8bit-movement", "gmMode", {
        name: game.i18n.format("8BITMOVEMENT.GM-Mode_name"),
        hint: game.i18n.format("8BITMOVEMENT.GM-Mode_hint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        onChange: () => window.location.reload()
    });
    game.settings.register("8bit-movement", "tokenMode", {
        name: game.i18n.format("8BITMOVEMENT.Token-Mode_name"),
        hint: game.i18n.format("8BITMOVEMENT.Token-Mode_hint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        onChange: () => window.location.reload()
    });
    game.settings.register("8bit-movement", "settingsMode", {
        name: game.i18n.format("8BITMOVEMENT.Settings-Mode_name"),
        hint: game.i18n.format("8BITMOVEMENT.Settings-Mode_hint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        onChange: () => window.location.reload()
    });
    game.settings.register("8bit-movement", "diagonalMode", {
        name: game.i18n.format("8BITMOVEMENT.Diagonal-Mode_name"),
        hint: game.i18n.format("8BITMOVEMENT.Diagonal-Mode_hint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: () => window.location.reload()
    });
    game.settings.register("8bit-movement", "warnings", {
        name: game.i18n.format("8BITMOVEMENT.Settings-Warn_name"),
        hint: game.i18n.format("8BITMOVEMENT.Settings-Warn_hint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: () => window.location.reload()
    });
    if (foundry.utils.isNewerVersion(game.version, "12")) {
        game.settings.register("8bit-movement", "disableRotationAnimation", {
            name: game.i18n.format("8BITMOVEMENT.Disable-Rotation-Animation_name"),
            hint: game.i18n.format("8BITMOVEMENT.Disable-Rotation-Animation_hint"),
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
            onChange: () => window.location.reload()
        });
    }
};