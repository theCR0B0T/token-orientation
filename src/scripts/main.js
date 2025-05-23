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
    default: {}
  });
});

Hooks.on("renderCharacterActorSheet", (app, html, data) => {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;
  const configPermission = game.settings.get(MODULE_ID, "configPermission");
  if (game.user.role < configPermission) return;

  const nav = $(html).find("nav.tabs-right");
  const tabs = $(html).find(".sheet-body .tab")
  if (!nav.length || !tabs.length) return;

  // Add a new navigation tab
  const button = $(`<a class="item" data-tab="direction-images"><i class="ph=compass"></i> Directional Images</a>`);
  button.on('click', () => {
    new ActorDirectionImageConfig(app.actor).render(true);
  });
  nav.append(button);
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
