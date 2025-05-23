const MODULE_ID = "token-orientation";

export class ActorDirectionImageConfig extends FormApplication {
  constructor(actor) {
    super(actor);
    this.actor = actor;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "actor-direction-image-config",
      title: "Actor Directional Image Configuration",
      template: `modules/${MODULE_ID}/templates/actor-direction-config.html`,
      width: 700,
      height: "auto",
      classes: ["sheet", "actor-direction-config", "dark-theme"],
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
      resizable: true
    });
  }

  getData() {
    const config = foundry.utils.duplicate(this.actor.getFlag(MODULE_ID, "directionImages") || {});
    const availableActions = this._getAvailableMovementActions(config);
    return {
      config,
      availableActions
    };
  }

  _getAvailableMovementActions(currentConfig) {
    const knownActions = ["default", "walk", "fly", "climb", "swim", "burrow"];
    return knownActions.filter(a => !(a in currentConfig));
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Add file pickers to all .file-picker elements
    html.find(".file-picker").each((_, el) => {
      FilePicker.fromButton(el).render(true);
    });

    // Handle image preview updates on input change
    html.on("change", ".image-url", event => {
      const input = event.currentTarget;
      const preview = input.closest(".form-group").querySelector(".image-preview");
      if (preview) preview.src = input.value;
    });

    // Handle layout mode change
    html.on("change", ".layout-mode", event => {
      const select = event.currentTarget;
      const container = select.closest("fieldset");
      const type = container.dataset.type;
      this._rebuildDirectionInputs(container, select.value, type);
    });

    // Add new movement type
    html.find("#add-type").on("click", () => {
      const select = html.find("#new-type-select")[0];
      const newType = select?.value?.trim();
      if (!newType) return;
      const movementContainer = html.find("#movement-types")[0];
      const template = this._buildMovementBlock(newType, "NESW");
      movementContainer.insertAdjacentHTML("beforeend", template);
      select.querySelector(`option[value="${newType}"]`).remove();
    });

    // Remove movement type
    html.on("click", ".remove-type", event => {
      const fieldset = event.currentTarget.closest("fieldset");
      fieldset?.remove();
    });
  }

  _rebuildDirectionInputs(container, mode, type) {
    const directionMap = {
      single: ["direction"],
      XY: ["X", "Y"],
      NESW: ["N", "E", "S", "W"]
    };
    const directions = directionMap[mode] || [];
    const groupContainer = container.querySelector(".direction-fields");
    groupContainer.innerHTML = directions.map(dir => `
      <div class="form-group">
        <label>${dir}</label>
        <div class="form-fields">
          <input type="text" name="config.${type}.${dir}" class="image-url" placeholder="Image URL" />
          <button type="button" class="file-picker" data-type="image" data-target="config.${type}.${dir}"><i class="fas fa-file-image"></i></button>
        </div>
        <img class="image-preview" src="" alt="Preview for ${dir}" />
      </div>
    `).join("");
  }

  _buildMovementBlock(type, mode = "NESW") {
    const directionMap = {
      single: ["direction"],
      XY: ["X", "Y"],
      NESW: ["N", "E", "S", "W"]
    };
    const directions = directionMap[mode] || [];
    const directionInputs = directions.map(dir => `
      <div class="form-group">
        <label>${dir}</label>
        <div class="form-fields">
          <input type="text" name="config.${type}.${dir}" class="image-url" placeholder="Image URL" />
          <button type="button" class="file-picker" data-type="image" data-target="config.${type}.${dir}"><i class="fas fa-file-image"></i></button>
        </div>
        <img class="image-preview" src="" alt="Preview for ${dir}" />
      </div>
    `).join("");

    return `
      <fieldset data-type="${type}">
        <legend>${type}</legend>
        <div class="form-group">
          <label>Layout Mode</label>
          <select class="layout-mode">
            <option value="single"${mode === "single" ? " selected" : ""}>Single</option>
            <option value="XY"${mode === "XY" ? " selected" : ""}>X/Y</option>
            <option value="NESW"${mode === "NESW" ? " selected" : ""}>N/E/S/W</option>
          </select>
        </div>
        <div class="direction-fields">
          ${directionInputs}
        </div>
        <button type="button" class="remove-type">Remove</button>
      </fieldset>
    `;
  }

  async _updateObject(_event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    await this.actor.setFlag(MODULE_ID, "directionImages", expanded.config);
  }
}
