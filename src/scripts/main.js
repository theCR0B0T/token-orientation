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

Hooks.on("renderActorSheet", (app, html, data) => {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;
  if (game.user.role < game.settings.get(MODULE_ID, "configPermission")) return;

  const navTabs = html.find("nav.tabs[data-group='primary']");
  const tabContent = html.find(".sheet-body");

  if (!navTabs.length || !tabContent.length) return;

  // Create tab button with compass icon
  const tabButton = $(`
    <a class="item" data-tab="direction-images" data-action="tab">
      <i class="fas fa-compass"></i>
    </a>
  `);
  navTabs.append(tabButton);

  // Create tab content container
  const tabPanel = $(`<div class="tab" data-tab="direction-images"></div>`);
  const wrapper = $(`<div class="direction-config"></div>`);
  tabPanel.append(wrapper);
  tabContent.append(tabPanel);

  // Inject custom UI
  const form = new ActorDirectionImageConfig(app.actor);
  form.render(false);
  form._renderInner().then(inner => {
    wrapper.append(inner);
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
