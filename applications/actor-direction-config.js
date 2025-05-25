import { MODULE_ID } from "../scripts/constants.js";

export class ActorDirectionImageConfig extends FormApplication {
  constructor(actor) {
    super(actor);
    this.actor = actor;
    this.activeRuleIndex = 0; // Default to global defaults
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "actor-direction-image-config",
      title: "Directional Token Images",
      template: "modules/token-orientation/templates/actor-direction-config.html",
      width: 800,
      height: "auto",
      closeOnSubmit: true
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
    data.activeRuleIndex = this.activeRuleIndex;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#rule-selector").on("change", ev => {
      const val = ev.currentTarget.value;
      if (val === "add") {
        const config = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || { rules: [] });
        config.rules.push({
          name: "New Rule",
          conditions: {
            movement: "walk",
            status: "",
            hpBelow: null,
            inCombat: false
          },
          directionMode: "nesw",
          images: {}
        });
        this.actor.setFlag(MODULE_ID, "directionImages", config).then(() => {
          this.activeRuleIndex = config.rules.length; // New rule is last (+1 after global)
          this.render();
        });
      } else {
        this.activeRuleIndex = parseInt(val);
        this.render();
      }
    });

    html.find(".delete-rule").on("click", ev => {
      const index = Number(ev.currentTarget.dataset.index);
      if (index === 0) return; // Prevent deleting global defaults
      const config = duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || { rules: [] });
      config.rules.splice(index - 1, 1); // index - 1 because 0 is global
      this.actor.setFlag(MODULE_ID, "directionImages", config).then(() => {
        this.activeRuleIndex = 0;
        this.render();
      });
    });
  }

  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    const config = expanded.config || { rules: [], defaults: {} };

    if (config.rules && typeof config.rules === "object" && !Array.isArray(config.rules)) {
      config.rules = Object.values(config.rules);
    }

    await this.actor.setFlag(MODULE_ID, "directionImages", config);
  }
}
