import { MODULE_ID } from "./constants.js";

export async function handleTokenMove(tokenDoc, updateData, options, userId) {
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
}
