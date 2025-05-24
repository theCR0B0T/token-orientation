import { MODULE_ID } from "../scripts/constants.js";

export class ActorDirectionImageConfig extends FormApplication {
  constructor(actor) {
    super(actor);
    this.actor = actor;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "actor-direction-image-config",
      title: "Directional Token Images",
      template: "modules/token-orientation/templates/actor-direction-config.html",
      width: 700,
      height: "auto",
      closeOnSubmit: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".tab", initial: "rules" }]
    });
  }

  getData() {
    const data = super.getData();
    const config = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || {
      rules: [],
      defaults: { directionMode: "single", images: {} }
    });
    data.config = config;
    data.rules = config.rules;
    data.defaults = config.defaults;
    data.movementActions = this.actor.system?.attributes?.movement
      ? Object.keys(this.actor.system.attributes.movement).filter(k => k !== "hover" && k !== "units")
      : ["walk", "fly", "swim", "burrow", "climb"];
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#add-rule").on("click", () => {
      const config = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || { rules: [] });
      config.rules.push({
        conditions: {
          movement: "walk",
          status: "",
          hpBelow: null,
          inCombat: false
        },
        directionMode: "nesw",
        images: {}
      });
      this.actor.setFlag(MODULE_ID, "directionImages", config).then(() => this.render());
    });

    html.find(".delete-rule").on("click", ev => {
      const index = Number(ev.currentTarget.dataset.index);
      const config = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || { rules: [] });
      config.rules.splice(index, 1);
      this.actor.setFlag(MODULE_ID, "directionImages", config).then(() => this.render());
    });
  }

  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    const config = expanded.config || { rules: [], defaults: {} };
    console.log("Expanded config:", config);
    await this.actor.setFlag(MODULE_ID, "directionImages", config);
  }
}
