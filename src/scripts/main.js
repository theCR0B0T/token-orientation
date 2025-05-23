const MODULE_ID = "token-orientation";

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
    config: false,
    type: Object,
    default: {}
  });
});

class TokenOrientationSheet extends ActorSheet5eCharacter {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.tabs[0].groups.push("direction-images");
    return options;
  }

  async _renderInner(...args) {
    const html = await super._renderInner(...args);

    if (!game.settings.get(MODULE_ID, "enableModule")) return html;
    if (game.user.role < game.settings.get(MODULE_ID, "configPermission")) return html;

    const nav = html.querySelector("nav.tabs[data-group='primary']");
    const sheetBody = html.querySelector(".sheet-body");

    if (!nav || !sheetBody) return html;

    const tabButton = document.createElement("a");
    tabButton.classList.add("item");
    tabButton.dataset.tab = "direction-images";
    tabButton.innerHTML = `<i class="fas fa-compass"></i>`;
    nav.appendChild(tabButton);

    const tabContent = document.createElement("div");
    tabContent.classList.add("tab");
    tabContent.dataset.tab = "direction-images";
    tabContent.innerHTML = `<div class="direction-config"></div>`;
    sheetBody.appendChild(tabContent);

    const form = new ActorDirectionImageConfig(this.actor);
    const inner = await form._renderInner();
    tabContent.querySelector(".direction-config").appendChild(inner);

    return html;
  }
}

Hooks.once("init", () => {
  Actors.unregisterSheet("dnd5e", ActorSheet5eCharacter);
  Actors.registerSheet(MODULE_ID, TokenOrientationSheet, {
    types: ["character"],
    makeDefault: true
  });
});

Hooks.on("preUpdateToken", async (tokenDoc, updateData, options, userId) => {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;
  if (!("x" in updateData || "y" in updateData)) return;

  const token = canvas.tokens.get(tokenDoc.id);
  if (!token) return;

  const dx = (updateData.x ?? token.x) - token.x;
  const dy = (updateData.y ?? token.y) - token.y;

  let dir;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? "E" : "W";
  } else if (Math.abs(dy) > 0) {
    dir = dy > 0 ? "S" : "N";
  }

  if (!dir) return;

  const actor = token.actor;
  if (!actor) return;

  const movementAction = token.document.movementAction || "default";
  const actorImages = actor.getFlag(MODULE_ID, "directionImages") || {};
  const defaultImages = game.settings.get(MODULE_ID, "defaultDirectionImages") || {};

  const image = actorImages?.[movementAction]?.[dir] || defaultImages?.default?.[dir];

  if (image && token.document.texture.src !== image) {
    await token.document.update({ texture: { src: image } });
  }
});

class ActorDirectionImageConfig extends FormApplication {
  constructor(object) {
    super(object);
    this.actor = object;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "actor-direction-image-config",
      title: "Actor Directional Image Configuration",
      template: "modules/token-orientation/templates/actor-direction-config.html",
      width: 600,
      height: "auto",
      closeOnSubmit: true
    });
  }

  getData() {
    const config = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || {});
    return { config };
  }

  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    await this.actor.setFlag(MODULE_ID, "directionImages", expanded.config);
  }
}
