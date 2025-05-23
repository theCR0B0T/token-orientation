import { MODULE_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { addConfigButton } from "./config-button.js";
import { handleTokenMove } from "./direction-manager.js";

Hooks.once("init", registerSettings);

Hooks.on("renderCharacterActorSheet", addConfigButton);
Hooks.on("preUpdateToken", handleTokenMove);
