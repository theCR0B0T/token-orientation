import { MODULE_ID } from "./constants.js";
import { ActorDirectionImageConfig } from "../applications/actor-direction-config.js";

export function addConfigButton(app, html, data) {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;
  const configPermission = game.settings.get(MODULE_ID, "configPermission");
  if (game.user.role < configPermission) return;

  const nav = $(html).find("nav.tabs-right");
  const tabs = $(html).find(".sheet-body .tab")
  if (!nav.length || !tabs.length) return;

  // Add a new navigation tab
  const button = $(`<a class="item" data-tab="direction-images"><i class="fas fa-compass"></i></a>`);
  button.on('click', () => {
    new ActorDirectionImageConfig(app.actor).render(true);
  });
  nav.append(button);
}
