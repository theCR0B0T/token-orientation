// ... (previous main.js code unchanged) ...

Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
    console.log(`${MODULE_ID} | renderActorSheet5eCharacter hook fired for actor:`, app.actor.name);

    if (!game.settings.get(MODULE_ID, "enableModule")) {
        console.log(`${MODULE_ID} | Module is disabled in settings.`);
        return;
    }
    if (game.user.role < game.settings.get(MODULE_ID, "configPermission")) {
        console.log(`${MODULE_ID} | User role (${game.user.role}) is below required permission (${game.settings.get(MODULE_ID, "configPermission")}).`);
        return;
    }

    // --- Start of potential fix for tab finding ---
    let tabs;
    // Attempt 1: Try the common 'primary' group
    tabs = app._tabs.find(t => t.group === "primary");

    // If 'primary' isn't found, try looking for the first tab group that has a navigation element
    if (!tabs) {
        tabs = app._tabs.find(t => t._nav && t._nav.length > 0);
        if (tabs) {
            console.log(`${MODULE_ID} | Found tab group by checking for _nav element.`);
        } else {
            console.warn(`${MODULE_ID} | Could not find any suitable tab group on ActorSheet5eCharacter.`);
            console.warn(`${MODULE_ID} | Available app._tabs:`, app._tabs);
            return;
        }
    }
    // --- End of potential fix for tab finding ---


    console.log(`${MODULE_ID} | Found tab group. Nav element:`, tabs._nav);
    console.log(`${MODULE_ID} | Sheet body element:`, app.element.find('.sheet-body'));


    // Add a new tab button
    const tabButton = $(`<a class="item" data-tab="token-orientation"><i class="fas fa-compass"></i> Orientation</a>`);
    const tabContent = $(`<div class="tab" data-tab="token-orientation"></div>`);

    // Check if the tab already exists to prevent duplication on re-render
    if (tabs._nav.find('[data-tab="token-orientation"]').length > 0) {
        console.log(`${MODULE_ID} | Tab already exists, skipping re-addition.`);
        const existingTabContent = app.element.find('.sheet-body .tab[data-tab="token-orientation"]');
        if (existingTabContent.length > 0) {
             const form = new ActorDirectionImageConfig(app.actor, { parent: app });
             form.render(false, { html: existingTabContent }); // Render without re-scrolling
        }
        // Even if it already exists, ensure it's activated if we're re-rendering
        tabs.activate("token-orientation");
        return;
    }


    tabs._nav.append(tabButton);
    app.element.find('.sheet-body').append(tabContent);

    console.log(`${MODULE_ID} | Tab button and content appended.`);


    const form = new ActorDirectionImageConfig(app.actor, { parent: app });
    form.render(true, { html: tabContent }).then(() => {
        console.log(`${MODULE_ID} | ActorDirectionImageConfig rendered into new tab.`);
        tabs.activate("token-orientation");
        console.log(`${MODULE_ID} | New tab activated.`);
    }).catch(error => {
        console.error(`${MODULE_ID} | Error rendering ActorDirectionImageConfig:`, error);
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