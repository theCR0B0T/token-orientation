const MODULE_ID = "token-orientation";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "defaultDirectionImages", {
    name: "Default Directional Images",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.registerMenu(MODULE_ID, "actorDirectionImageConfig", {
    name: "Configure Actor Directional Images",
    label: "Configure",
    hint: "Set directional images per movement type for this actor.",
    type: ActorDirectionImageConfig,
    restricted: false
  });
});

Hooks.on("renderActorSheet", (app, html, data) => {
  const button = $(`<a class="configure-direction-images"><i class="fas fa-directions"></i> Directional Images</a>`);
  button.click(() => new ActorDirectionImageConfig(app.actor).render(true));
  html.closest('.app').find('.configure-sheet').before(button);
});

Hooks.on("preUpdateToken", async (tokenDoc, updateData, options, userId) => {
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

  const movementAction = token.document.movementAction || "walk";
  const actorImages = actor.getFlag(MODULE_ID, "directionImages") || {};
  const defaultImages = game.settings.get(MODULE_ID, "defaultDirectionImages");

  const image = actorImages?.[movementAction]?.[dir] || defaultImages?.[movementAction]?.[dir];

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
