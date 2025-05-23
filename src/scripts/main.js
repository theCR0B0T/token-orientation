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

Hooks.on("ready", () => {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;
  const configPermission = game.settings.get(MODULE_ID, "configPermission");

  const dnd5eSystem = game.systems.get("dnd5e");
  if (!dnd5eSystem || !CONFIG.Actor.sheetClasses.character) return;

  const sheetClass = CONFIG.Actor.sheetClasses.character["dnd5e.CharacterSheet5e"].cls;
  if (!sheetClass.prototype._originalRender) {
    sheetClass.prototype._originalRender = sheetClass.prototype._render;
    sheetClass.prototype._render = async function (...args) {
      await this._originalRender(...args);

      if (game.user.role < configPermission) return;

      const html = this.element;
      const titleElement = html.find('.window-title');
      if (!titleElement.length) return;

      if (!html.find('.direction-image-config').length) {
        const button = $(`<a class="direction-image-config" style="margin-left: 5px;" title="Configure Directional Images"><i class="fas fa-compass"></i></a>`);
        button.on('click', () => {
          new ActorDirectionImageConfig(this.actor).render(true);
        });
        titleElement.append(button);
      }
    };
  }
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
