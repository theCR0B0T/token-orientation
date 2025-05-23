const MODULE_ID = "token-orientation";

// Import ActorSheet5eCharacter for extending, not for direct modification
import { ActorSheet5eCharacter } from "../../../systems/dnd5e/module/actor/sheets/character.js";

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
        config: false, // This setting is not directly configurable via the settings menu
        type: Object,
        default: {
            "default": { // Ensure a default movement type is always present
                "N": "",
                "E": "",
                "S": "",
                "W": ""
            }
        }
    });
});

// ActorDirectionImageConfig remains largely the same, but it doesn't need to extend FormApplication directly in this usage.
// It will be rendered *within* the ActorSheet, so it's more of a template and data renderer.
// However, keeping it as a FormApplication is fine if you intend to use its submission logic later.
class ActorDirectionImageConfig extends FormApplication {
    constructor(object, options) {
        super(object, options);
        this.actor = object;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "actor-direction-image-config",
            title: "Actor Directional Image Configuration",
            template: `modules/${MODULE_ID}/templates/actor-direction-config.html`, // Correct template path
            width: 600,
            height: "auto",
            closeOnSubmit: false, // We don't want the inner form to close the whole sheet
            submitOnChange: true, // Automatically save changes when fields are modified
            submitOnClose: true // Save changes when the sheet is closed
        });
    }

    /**
     * Get the data for the form.
     * Includes both actor-specific and world-level default images.
     */
    getData() {
        const actorConfig = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || {});
        const defaultConfig = game.settings.get(MODULE_ID, "defaultDirectionImages");

        // Merge actor-specific config with default images to ensure all directions are present
        // and to show placeholders for default images.
        const config = mergeObject(defaultConfig, actorConfig);

        return {
            config: config,
            isGM: game.user.isGM // Pass GM status to the template for conditional rendering
        };
    }

    /**
     * Activates event listeners for the form.
     * @param {jQuery} html The rendered HTML of the form.
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Add Movement Type button
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

            // Manually add the new fieldset to the DOM and then call render to update the form data
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
            typeInput.val(''); // Clear the input field

            // Re-bind file pickers for the new elements
            this._activateFilePickers(html);

            // Important: Call render again to refresh the data and potentially save changes
            this.render(true);
        });

        // Remove Movement Type button
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

                // Create a new object without the type to remove
                const newConfig = duplicate(currentConfig);
                delete newConfig[typeToRemove];
                await this.actor.setFlag(MODULE_ID, "directionImages", newConfig);

                // Re-render the form to reflect the change
                this.render(true);
            }
        });

        // Add a "browse" button for image selection
        html.find('.file-picker').on('click', event => {
            const target = event.currentTarget.dataset.target;
            new FilePicker({
                type: "image",
                current: this.object.getFlag(MODULE_ID, target),
                callback: path => {
                    const input = html.find(`[name="${target}"]`);
                    input.val(path);
                    input.trigger('change'); // Trigger change to ensure _updateObject picks it up
                }
            }).browse();
        });

        // Add preview functionality
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
        }).trigger('change'); // Trigger on load to show existing previews
    }

    /**
     * This method is called when the form is submitted.
     * @param {Event} event The submit event.
     * @param {Object} formData The form data.
     */
    async _updateObject(event, formData) {
        const expanded = expandObject(formData);
        // We only care about the 'config' part of the expanded data
        const newConfig = expanded.config || {};

        // Get current actor flags
        const currentFlags = this.actor.getFlag(MODULE_ID, "directionImages") || {};

        // Merge the new configuration with the existing flags.
        // This handles additions, deletions, and updates correctly.
        // We need to be careful with merging, as deep merging can be tricky for removals.
        // A simpler approach is to replace the whole flag with the updated data.
        await this.actor.setFlag(MODULE_ID, "directionImages", newConfig);
    }
}


// Hook to add the new tab to the character sheet
Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
    // Only add the tab if the module is enabled and the user has permission
    if (!game.settings.get(MODULE_ID, "enableModule")) return;
    if (game.user.role < game.settings.get(MODULE_ID, "configPermission")) return;

    // Get the navigation tabs
    const tabs = app._tabs[0]; // Assuming the first tab group is the primary navigation

    // Add a new tab button
    const tabButton = $(`<a class="item" data-tab="token-orientation"><i class="fas fa-compass"></i> Orientation</a>`);
    const tabContent = $(`<div class="tab" data-tab="token-orientation"></div>`);

    // Append the tab button to the navigation
    tabs._nav.append(tabButton);

    // Append the tab content to the sheet body
    app.element.find('.sheet-body').append(tabContent);

    // Render the ActorDirectionImageConfig form inside the new tab content
    const form = new ActorDirectionImageConfig(app.actor, { parent: app });
    form.render(true, { html: tabContent });

    // Activate the new tab using Foundry's tab management
    tabs.activate("token-orientation");
});


// Hook for token movement
Hooks.on("preUpdateToken", async (tokenDoc, updateData, options, userId) => {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;
    // Only proceed if x or y coordinates are changing
    if (!("x" in updateData || "y" in updateData)) return;

    const token = tokenDoc.object; // Get the Token object from the TokenDocument
    if (!token) return;

    // Calculate movement delta
    const dx = (updateData.x ?? token.x) - token.x;
    const dy = (updateData.y ?? token.y) - token.y;

    // If there's no actual movement, skip
    if (dx === 0 && dy === 0) return;

    let dir;
    // Determine primary direction
    if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? "E" : "W";
    } else { // dy is greater or equal to dx (including vertical-only movement)
        dir = dy > 0 ? "S" : "N";
    }

    const actor = token.actor;
    if (!actor) return;

    // Get current movement action from token document (or default to 'default')
    const movementAction = token.document.getFlag(MODULE_ID, "movementAction") || "default";

    // Retrieve images from actor flags and world settings
    const actorImages = actor.getFlag(MODULE_ID, "directionImages") || {};
    const defaultImages = game.settings.get(MODULE_ID, "defaultDirectionImages") || {};

    // Prioritize actor's specific images, then actor's 'default', then world 'default'
    let image = actorImages?.[movementAction]?.[dir];
    if (!image) {
        image = actorImages?.default?.[dir]; // Fallback to actor's default movement type
    }
    if (!image) {
        image = defaultImages?.default?.[dir]; // Fallback to world's default movement type
    }

    if (image && token.document.texture.src !== image) {
        // Prevent infinite loop if texture.src is updated
        options.tokenOrientationApplied = true;
        await token.document.update({ texture: { src: image } });
    }
});

// Add a context menu option to tokens to set their movement action
Hooks.on("getTokenConfigButtons", (config, buttons) => {
    if (!game.user.isGM) return; // Only GMs can set movement action for now
    buttons.unshift({
        label: "Set Movement Action",
        class: "set-movement-action",
        icon: "fas fa-running",
        onclick: async () => {
            const token = config.token;
            const currentAction = token.document.getFlag(MODULE_ID, "movementAction") || "default";

            // Get available movement types from the actor's configuration
            const actorImages = token.actor.getFlag(MODULE_ID, "directionImages") || {};
            const movementTypes = Object.keys(actorImages);
            if (!movementTypes.includes("default")) {
                movementTypes.unshift("default"); // Ensure 'default' is always an option
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