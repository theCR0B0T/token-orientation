const MODULE_ID = "token-orientation";

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing module settings.`);
    game.settings.register(MODULE_ID, "enableModule", {
        name: "Enable Token Orientation Module",
        hint: "Turn on or off all features of the token-orientation module.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "configPermission", {
        name: "Who Can Configure Token Orientation",
        hint: "Minimum role required to configure token orientation images.",
        scope: "world",
        config: true,
        type: Number,
        default: CONST.USER_ROLES.GAMEMASTER,
        choices: {
            [CONST.USER_ROLES.PLAYER]: "Player",
            [CONST.USER_ROLES.TRUSTED]: "Trusted Player",
            [CONST.USER_ROLES.ASSISTANT]: "Assistant GM",
            [CONST.USER_ROLES.GAMEMASTER]: "GM"
        }
    });

    game.settings.register(MODULE_ID, "defaultDirectionImages", {
        name: "Default Directional Images",
        scope: "world",
        config: false,
        type: Object,
        default: {
            "default": {
                "N": "",
                "E": "",
                "S": "",
                "W": ""
            }
        }
    });
});

/**
 * FormApplication for configuring directional images on an Actor.
 * This class remains largely the same, as its internal logic is self-contained.
 */
class ActorDirectionImageConfig extends FormApplication {
    constructor(object, options) {
        super(object, options);
        this.actor = object;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "actor-direction-image-config",
            title: "Actor Directional Image Configuration",
            template: `modules/${MODULE_ID}/templates/actor-direction-config.html`,
            width: 600,
            height: "auto",
            closeOnSubmit: false,
            submitOnChange: true,
            submitOnClose: true
        });
    }

    getData() {
        const actorConfig = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || {});
        const defaultConfig = game.settings.get(MODULE_ID, "defaultDirectionImages");
        const config = mergeObject(defaultConfig, actorConfig);
        console.log(`${MODULE_ID} | ActorDirectionImageConfig getData:`, {actorConfig, defaultConfig, config});
        return {
            config: config,
            isGM: game.user.isGM
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        console.log(`${MODULE_ID} | ActorDirectionImageConfig activateListeners fired.`);

        html.find('#add-type').on('click', event => {
            const typeInput = html.find('#new-type-name');
            const type = typeInput.val().trim();
            if (!type) {
                ui.notifications.warn("Please enter a movement type name.");
                return;
            }
            if (this.object.getFlag(MODULE_ID, `directionImages.${type}`)) {
                ui.notifications.warn(`Movement type "${type}" already exists.`);
                return;
            }

            const container = html.find('#movement-types');
            const newFieldsetHtml = `
                <fieldset data-type="${type}">
                    <legend>${type}</legend>
                    ${['N', 'E', 'S', 'W'].map(dir => `
                        <div class="form-group">
                            <label>${dir}</label>
                            <input type="text" name="config.${type}.${dir}" value="" placeholder="Image URL for ${dir}" data-dtype="String"/>
                            <a class="file-picker" data-type="image" data-target="config.${type}.${dir}" title="Browse Files"><i class="fas fa-file-import fa-fw"></i></a>
                            <img class="image-preview" src="" style="max-width: 50px; max-height: 50px; margin-left: 5px; display: none;"/>
                        </div>`).join('')}
                    <button type="button" class="remove-type" data-type="${type}"><i class="fas fa-trash"></i> Remove</button>
                </fieldset>
            `;
            container.append(newFieldsetHtml);
            typeInput.val('');
            this.render(false);
        });

        html.find('.remove-type').on('click', async event => {
            const button = $(event.currentTarget);
            const typeToRemove = button.data('type');

            if (typeToRemove === "default") {
                ui.notifications.error("The 'default' movement type cannot be removed as it serves as a fallback.");
                return;
            }

            const dialogResult = await Dialog.confirm({
                title: "Confirm Removal",
                content: `<p>Are you sure you want to remove the "${typeToRemove}" movement type and all its directional images?</p>`,
                yes: () => true,
                no: () => false,
                defaultYes: false
            });

            if (!dialogResult) return;

            const currentConfig = this.actor.getFlag(MODULE_ID, "directionImages") || {};
            const newConfig = duplicate(currentConfig);
            delete newConfig[typeToRemove];
            await this.actor.setFlag(MODULE_ID, "directionImages", newConfig);

            this.render(true);
        });

        html.find('.file-picker').on('click', event => {
            const target = event.currentTarget.dataset.target;
            new FilePicker({
                type: "image",
                current: this.object.getFlag(MODULE_ID, target),
                callback: path => {
                    const input = html.find(`[name="${target}"]`);
                    input.val(path);
                    input.trigger('change');
                }
            }).browse();
        });

        html.find('input[type="text"]').on('change', event => {
            const input = $(event.currentTarget);
            const imgPath = input.val();
            let preview = input.siblings('.image-preview');
            if (preview.length === 0) {
                preview = $('<img class="image-preview" src="" />');
                input.after(preview);
            }
            if (imgPath) {
                preview.attr('src', imgPath);
                preview.show();
            } else {
                preview.hide();
            }
        }).trigger('change');
    }

    async _updateObject(event, formData) {
        const expanded = expandObject(formData);
        const newConfig = expanded.config || {};
        console.log(`${MODULE_ID} | Saving directionImages:`, newConfig);
        await this.actor.setFlag(MODULE_ID, "directionImages", newConfig);
    }
}


/**
 * NEW HOOK: Add a button to the actor sheet header for configuration.
 * This is the V11+ way to add custom buttons to existing sheets.
 */
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    console.log(`${MODULE_ID} | getActorSheetHeaderButtons hook fired for sheet:`, sheet.constructor.name);

    // Only add the button to D&D 5e Character Sheets
    // Check if the sheet is an instance of the D&D5e Character Sheet class (or a subclass)
    // dnd5e.applications.ActorSheet5eCharacter is the global reference.
    if (!(sheet instanceof dnd5e.applications.ActorSheet5eCharacter)) {
        console.log(`${MODULE_ID} | Sheet is not a D&D5e Character Sheet. Skipping button addition.`);
        return;
    }

    if (!game.settings.get(MODULE_ID, "enableModule")) {
        console.log(`${MODULE_ID} | Module is disabled in settings. Button will not be added.`);
        return;
    }

    if (game.user.role < game.settings.get(MODULE_ID, "configPermission")) {
        console.log(`${MODULE_ID} | User role (${game.user.role}) is below required permission (${game.settings.get(MODULE_ID, "configPermission")}). Button will not be added.`);
        return;
    }

    // Add the new button to the beginning of the buttons array
    buttons.unshift({
        label: "Orientation",
        class: "token-orientation-config",
        icon: "fas fa-compass",
        onclick: () => {
            console.log(`${MODULE_ID} | Opening Actor Directional Image Configuration for ${sheet.actor.name}`);
            new ActorDirectionImageConfig(sheet.actor).render(true);
        }
    });

    console.log(`${MODULE_ID} | "Orientation" button added to the actor sheet header.`);
});


// Hook for token movement (This part should already be working correctly in V11/V13)
Hooks.on("preUpdateToken", async (tokenDoc, updateData, options, userId) => {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;
    if (!("x" in updateData || "y" in updateData)) return;

    const token = tokenDoc.object;
    if (!token) return;

    const dx = (updateData.x ?? token.x) - token.x;
    const dy = (updateData.y ?? token.y) - token.y;

    if (dx === 0 && dy === 0) return;

    let dir;
    if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? "E" : "W";
    } else {
        dir = dy > 0 ? "S" : "N";
    }

    const actor = token.actor;
    if (!actor) return;

    const movementAction = token.document.getFlag(MODULE_ID, "movementAction") || "default";

    const actorImages = actor.getFlag(MODULE_ID, "directionImages") || {};
    const defaultImages = game.settings.get(MODULE_ID, "defaultDirectionImages") || {};

    let image = actorImages?.[movementAction]?.[dir];
    if (!image) {
        image = actorImages?.default?.[dir];
    }
    if (!image) {
        image = defaultImages?.default?.[dir];
    }

    if (image && token.document.texture.src !== image) {
        options.tokenOrientationApplied = true;
        await token.document.update({ texture: { src: image } });
    }
});

// Add a context menu option to tokens to set their movement action (This also should be fine)
Hooks.on("getTokenConfigButtons", (config, buttons) => {
    if (!game.user.isGM) return;
    buttons.unshift({
        label: "Set Movement Action",
        class: "set-movement-action",
        icon: "fas fa-running",
        onclick: async () => {
            const token = config.token;
            const currentAction = token.document.getFlag(MODULE_ID, "movementAction") || "default";

            const actorImages = token.actor.getFlag(MODULE_ID, "directionImages") || {};
            const movementTypes = Object.keys(actorImages);
            if (!movementTypes.includes("default")) {
                movementTypes.unshift("default");
            }

            const content = `<div class="form-group">
                <label>Movement Action:</label>
                <select name="movementAction">
                    ${movementTypes.map(type => `<option value="${type}" ${type === currentAction ? "selected" : ""}>${type}</option>`).join('')}
                </select>
            </div>`;

            new Dialog({
                title: "Set Token Movement Action",
                content: content,
                buttons: {
                    save: {
                        icon: '<i class="fas fa-save"></i>',
                        label: "Save",
                        callback: (html) => {
                            const newAction = html.find('[name="movementAction"]').val();
                            token.document.setFlag(MODULE_ID, "movementAction", newAction);
                            ui.notifications.info(`Movement action for ${token.name} set to "${newAction}".`);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel"
                    }
                },
                default: "save"
            }).render(true);
        }
    });
});