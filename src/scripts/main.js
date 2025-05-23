const MODULE_ID = "token-orientation";

Hooks.once("init", () => {
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

// ActorDirectionImageConfig remains the same as previously corrected
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
        return {
            config: config,
            isGM: game.user.isGM
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

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
            const newFieldset = `
                <fieldset data-type="${type}">
                    <legend>${type}</legend>
                    ${['N', 'E', 'S', 'W'].map(dir => `
                        <div class="form-group">
                            <label>${dir}</label>
                            <input type="text" name="config.${type}.${dir}" value="" placeholder="Image URL for ${dir}" data-dtype="String"/>
                            <a class="file-picker" data-type="image" data-target="config.${type}.${dir}" title="Browse Files"><i class="fas fa-file-import fa-fw"></i></a>
                        </div>`).join('')}
                    <button type="button" class="remove-type" data-type="${type}"><i class="fas fa-trash"></i> Remove</button>
                </fieldset>
            `;
            container.append(newFieldset);
            typeInput.val('');
            this._activateFilePickers(html); // Make sure this line exists if you have _activateFilePickers
            this.render(true);
        });

        html.find('.remove-type').on('click', async event => {
            const button = $(event.currentTarget);
            const typeToRemove = button.data('type');

            if (typeToRemove === "default") {
                ui.notifications.error("The 'default' movement type cannot be removed.");
                return;
            }

            const currentConfig = this.actor.getFlag(MODULE_ID, "directionImages") || {};
            if (currentConfig[typeToRemove]) {
                const dialogResult = await Dialog.confirm({
                    title: "Confirm Removal",
                    content: `<p>Are you sure you want to remove the "${typeToRemove}" movement type and all its directional images?</p>`,
                    yes: () => true,
                    no: () => false,
                    defaultYes: false
                });

                if (!dialogResult) return;

                const newConfig = duplicate(currentConfig);
                delete newConfig[typeToRemove];
                await this.actor.setFlag(MODULE_ID, "directionImages", newConfig);
                this.render(true);
            }
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
        await this.actor.setFlag(MODULE_ID, "directionImages", newConfig);
    }
}


// Hook to add the new tab to the character sheet
Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;
    if (game.user.role < game.settings.get(MODULE_ID, "configPermission")) return;

    // Use app._tabs to get the tab group.
    // The dnd5e sheet's primary tabs are usually in app._tabs[0]
    const tabs = app._tabs.find(t => t.group === "primary"); // More robust way to find the primary tab group

    if (!tabs) {
        console.warn(`${MODULE_ID} | Could not find primary tab group on ActorSheet5eCharacter.`);
        return;
    }

    // Add a new tab button
    // Ensure the data-tab matches the tab content data-tab
    const tabButton = $(`<a class="item" data-tab="token-orientation"><i class="fas fa-compass"></i> Orientation</a>`);
    const tabContent = $(`<div class="tab" data-tab="token-orientation"></div>`);

    // Append the tab button to the navigation
    tabs._nav.append(tabButton);

    // Append the tab content to the sheet body
    app.element.find('.sheet-body').append(tabContent);

    // Render the ActorDirectionImageConfig form inside the new tab content
    const form = new ActorDirectionImageConfig(app.actor, { parent: app });
    // Use .then() to ensure the form is rendered before attempting to activate the tab
    form.render(true, { html: tabContent }).then(() => {
        // Activate the new tab using Foundry's tab management
        // This makes sure the tab is visible after rendering
        tabs.activate("token-orientation");
    });
});


// Hook for token movement
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

// Add a context menu option to tokens to set their movement action
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