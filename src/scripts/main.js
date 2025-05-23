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
            closeOnSubmit: false, // Don't close the sheet when this inner form submits
            submitOnChange: true, // Automatically save changes when fields are modified
            submitOnClose: true // Save changes when the sheet is closed
        });
    }

    /**
     * Get the data for the form.
     * Includes both actor-specific and world-level default images for display.
     */
    getData() {
        // Get actor's specific configuration
        const actorConfig = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || {});
        // Get world's default configuration
        const defaultConfig = game.settings.get(MODULE_ID, "defaultDirectionImages");

        // Merge default config into actorConfig to ensure all directions are displayed
        // If an actor has no specific images for 'walk', but world default has them,
        // they will appear as placeholders. Actor's defined images take precedence.
        const config = mergeObject(defaultConfig, actorConfig);

        console.log(`${MODULE_ID} | ActorDirectionImageConfig getData:`, {actorConfig, defaultConfig, config});
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
        console.log(`${MODULE_ID} | ActorDirectionImageConfig activateListeners fired.`);

        // Add Movement Type button handler
        html.find('#add-type').on('click', event => {
            const typeInput = html.find('#new-type-name');
            const type = typeInput.val().trim();
            if (!type) {
                ui.notifications.warn("Please enter a movement type name.");
                return;
            }
            // Check if this movement type already exists for the actor
            if (this.object.getFlag(MODULE_ID, `directionImages.${type}`)) {
                ui.notifications.warn(`Movement type "${type}" already exists.`);
                return;
            }

            // Manually add the new fieldset to the DOM
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
            typeInput.val(''); // Clear the input field

            // Re-render the form with the new data to ensure it's properly bound and saved
            // Using false for re-render to prevent scrolling to top
            this.render(false);
        });

        // Remove Movement Type button handler
        html.find('.remove-type').on('click', async event => {
            const button = $(event.currentTarget);
            const typeToRemove = button.data('type');

            if (typeToRemove === "default") {
                ui.notifications.error("The 'default' movement type cannot be removed as it serves as a fallback.");
                return;
            }

            // Confirmation dialog before removal
            const dialogResult = await Dialog.confirm({
                title: "Confirm Removal",
                content: `<p>Are you sure you want to remove the "${typeToRemove}" movement type and all its directional images?</p>`,
                yes: () => true,
                no: () => false,
                defaultYes: false
            });

            if (!dialogResult) return; // User cancelled

            // Get current actor flags and remove the specified type
            const currentConfig = this.actor.getFlag(MODULE_ID, "directionImages") || {};
            const newConfig = duplicate(currentConfig);
            delete newConfig[typeToRemove];
            await this.actor.setFlag(MODULE_ID, "directionImages", newConfig);

            // Re-render the form to reflect the change
            this.render(true); // Re-render to refresh the UI completely
        });

        // File picker integration for image inputs
        html.find('.file-picker').on('click', event => {
            const target = event.currentTarget.dataset.target; // e.g., config.default.N
            new FilePicker({
                type: "image",
                current: this.object.getFlag(MODULE_ID, target), // Get current path for picker
                callback: path => {
                    const input = html.find(`[name="${target}"]`);
                    input.val(path);
                    input.trigger('change'); // Trigger change event to update preview and save
                }
            }).browse();
        });

        // Image preview functionality
        html.find('input[type="text"]').on('change', event => {
            const input = $(event.currentTarget);
            const imgPath = input.val();
            let preview = input.siblings('.image-preview'); // Find the adjacent image-preview img tag

            if (preview.length === 0) { // If for some reason preview wasn't found (e.g. dynamic add without re-render)
                preview = $('<img class="image-preview" src="" />');
                input.after(preview);
            }

            if (imgPath) {
                preview.attr('src', imgPath);
                preview.show(); // Show the image
            } else {
                preview.hide(); // Hide the image if path is empty
            }
        }).trigger('change'); // Trigger on load to show existing previews correctly
    }

    /**
     * This method is called when the form is submitted (e.g., via submitOnChange or submitOnClose).
     * @param {Event} event The submit event.
     * @param {Object} formData The form data (expanded by Foundry).
     */
    async _updateObject(event, formData) {
        const expanded = expandObject(formData);
        // We only care about the 'config' part of the expanded data
        const newConfig = expanded.config || {};
        console.log(`${MODULE_ID} | Saving directionImages:`, newConfig);
        await this.actor.setFlag(MODULE_ID, "directionImages", newConfig);
    }
}


/**
 * Hook to add the new "Orientation" tab to the D&D 5e Character Sheet.
 */
Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
    console.log(`${MODULE_ID} | renderActorSheet5eCharacter hook fired for actor:`, app.actor.name);

    // 1. Check if the module is enabled in world settings
    if (!game.settings.get(MODULE_ID, "enableModule")) {
        console.log(`${MODULE_ID} | Module is disabled in settings. Tab will not be added.`);
        return;
    }

    // 2. Check user permissions
    if (game.user.role < game.settings.get(MODULE_ID, "configPermission")) {
        console.log(`${MODULE_ID} | User role (${game.user.role}) is below required permission (${game.settings.get(MODULE_ID, "configPermission")}). Tab will not be added.`);
        return;
    }

    // 3. Find the primary tab group on the sheet
    let tabs;
    // Attempt 1: Try the common 'primary' group
    tabs = app._tabs.find(t => t.group === "primary");

    // If 'primary' isn't found, try looking for the first tab group that has a navigation element
    if (!tabs) {
        tabs = app._tabs.find(t => t._nav && t._nav.length > 0);
        if (tabs) {
            console.log(`${MODULE_ID} | Found tab group by checking for _nav element:`, tabs.group);
        } else {
            console.warn(`${MODULE_ID} | Could not find any suitable tab group on ActorSheet5eCharacter. This might be due to a custom sheet or D&D5e version.`);
            console.warn(`${MODULE_ID} | Available app._tabs:`, app._tabs);
            return; // Exit if no suitable tab group is found
        }
    }

    console.log(`${MODULE_ID} | Found tab group. Nav element:`, tabs._nav);
    console.log(`${MODULE_ID} | Sheet body element:`, app.element.find('.sheet-body'));

    // Create the tab button and content div
    const tabButton = $(`<a class="item" data-tab="token-orientation"><i class="fas fa-compass"></i> Orientation</a>`);
    const tabContent = $(`<div class="tab" data-tab="token-orientation"></div>`);

    // Prevent adding the tab multiple times if the sheet is re-rendered
    if (tabs._nav.find('[data-tab="token-orientation"]').length > 0) {
        console.log(`${MODULE_ID} | Tab already exists, skipping re-addition of HTML elements.`);
        // If the tab HTML already exists, just ensure its content is re-rendered and it's activated
        const existingTabContent = app.element.find('.sheet-body .tab[data-tab="token-orientation"]');
        if (existingTabContent.length > 0) {
             const form = new ActorDirectionImageConfig(app.actor, { parent: app });
             // Render the form's content into the existing tab div, without scrolling
             form.render(false, { html: existingTabContent });
        }
        // Ensure the tab is activated if it was the last active tab on re-render
        tabs.activate("token-orientation");
        return; // Exit as the tab structure is already there
    }

    // Append the tab button to the navigation
    tabs._nav.append(tabButton);

    // Append the tab content to the sheet body
    app.element.find('.sheet-body').append(tabContent);

    console.log(`${MODULE_ID} | Tab button and content appended to the sheet.`);

    // Instantiate and render the ActorDirectionImageConfig form inside the new tab content
    const form = new ActorDirectionImageConfig(app.actor, { parent: app });
    form.render(true, { html: tabContent }) // Render and force a full render of the form
        .then(() => {
            console.log(`${MODULE_ID} | ActorDirectionImageConfig rendered into new tab content.`);
            // Activate the newly added tab to make it visible
            tabs.activate("token-orientation");
            console.log(`${MODULE_ID} | New tab activated.`);
        })
        .catch(error => {
            console.error(`${MODULE_ID} | Error rendering ActorDirectionImageConfig into tab:`, error);
        });
});


/**
 * Hook to update token image on movement.
 */
Hooks.on("preUpdateToken", async (tokenDoc, updateData, options, userId) => {
    if (!game.settings.get(MODULE_ID, "enableModule")) return; // Module disabled

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
    // Determine primary movement direction (N, S, E, W)
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

    // Prioritize image lookup:
    // 1. Actor's specific movement action for the direction
    // 2. Actor's 'default' movement action for the direction
    // 3. World's 'default' movement action for the direction
    let image = actorImages?.[movementAction]?.[dir];
    if (!image) {
        image = actorImages?.default?.[dir];
    }
    if (!image) {
        image = defaultImages?.default?.[dir];
    }

    // Update token texture if a valid image is found and it's different from current
    if (image && token.document.texture.src !== image) {
        // Add an option flag to prevent infinite loops if other hooks react to texture changes
        options.tokenOrientationApplied = true;
        await token.document.update({ texture: { src: image } });
    }
});

/**
 * Adds a context menu option to Token Configuration to set the token's movement action.
 */
Hooks.on("getTokenConfigButtons", (config, buttons) => {
    // Only GMs should be able to set movement action via this button
    if (!game.user.isGM) return;

    buttons.unshift({ // Add to the beginning of the buttons array
        label: "Set Movement Action",
        class: "set-movement-action",
        icon: "fas fa-running",
        onclick: async () => {
            const token = config.token;
            const currentAction = token.document.getFlag(MODULE_ID, "movementAction") || "default";

            // Get available movement types from the actor's configured images
            const actorImages = token.actor.getFlag(MODULE_ID, "directionImages") || {};
            let movementTypes = Object.keys(actorImages);
            // Ensure 'default' is always an option
            if (!movementTypes.includes("default")) {
                movementTypes.unshift("default");
            }

            // Create dialog content with a select dropdown
            const content = `<div class="form-group">
                <label>Movement Action:</label>
                <select name="movementAction">
                    ${movementTypes.map(type => `<option value="${type}" ${type === currentAction ? "selected" : ""}>${type}</option>`).join('')}
                </select>
            </div>`;

            // Open a Dialog to let the GM choose the movement action
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
                default: "save" // Default button when Enter is pressed
            }).render(true);
        }
    });
});