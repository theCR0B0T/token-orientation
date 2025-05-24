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
    data.config = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || {
      rules: [],
      defaults: { directionMode: "single", images: {} }
    });
    data.movementActions = this.actor.system?.attributes?.movement
      ? Object.keys(this.actor.system.attributes.movement).filter(k => k !== "hover" && k !== "units")
      : ["walk", "fly", "swim", "burrow", "climb"];
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#add-rule").on("click", () => {
      const rulesContainer = html.find("#rules-container");
      const index = rulesContainer.find(".rule-block").length;
      const newRule = {
        conditions: {
          movement: "walk",
          status: "",
          hpBelow: null,
          inCombat: false
        },
        directionMode: "nesw",
        images: {}
      };
      const config = this.object.getFlag(MODULE_ID, "directionImages") || { rules: [] };
      config.rules.push(newRule);
      this.object.setFlag(MODULE_ID, "directionImages", config).then(() => this.render());
    });

    html.find(".delete-rule").on("click", ev => {
      const index = Number(ev.currentTarget.dataset.index);
      let config = duplicate(this.object.getFlag(MODULE_ID, "directionImages") || { rules: [] });
      config.rules.splice(index, 1);
      this.object.setFlag(MODULE_ID, "directionImages", config).then(() => this.render());
    });
  }

  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    await this.actor.setFlag(MODULE_ID, "directionImages", expanded.config);
  }
}
