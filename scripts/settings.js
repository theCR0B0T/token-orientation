import { MODULE_ID } from "./constants.js";

export function registerSettings() {
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
}
