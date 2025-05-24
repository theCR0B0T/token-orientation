import { MODULE_ID } from "./constants.js";

/**
 * Check if the token matches the conditions of a rule.
 */
function matchesConditions(token, rule) {
  const cond = rule.conditions || {};
  const movement = token.document.movementAction || "walk";
  const statusSet = new Set(token.actor?.effects?.map(e => e.label.toLowerCase()));

  const hp = token.actor?.system?.attributes?.hp;
  const hpBelow = cond.hpBelow != null && hp ? (hp.value / hp.max) * 100 < cond.hpBelow : true;
  const inCombat = cond.inCombat == null || token.inCombat === cond.inCombat;

  return (
    (!cond.movement || cond.movement === movement) &&
    (!cond.status || statusSet.has(cond.status.toLowerCase())) &&
    hpBelow &&
    inCombat
  );
}

/**
 * Determine direction from movement delta.
 */
function determineDirection(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "E" : "W";
  } else if (Math.abs(dy) > 0) {
    return dy > 0 ? "S" : "N";
  }
  return null;
}

/**
 * Main movement handler.
 */
export async function handleTokenMove(tokenDoc, updateData, options, userId) {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;
  if (!("x" in updateData || "y" in updateData)) return;

  const token = canvas.tokens.get(tokenDoc.id);
  if (!token) return;

  const dx = (updateData.x ?? token.x) - token.x;
  const dy = (updateData.y ?? token.y) - token.y;
  const dir = determineDirection(dx, dy);
  if (!dir) return;

  const actor = token.actor;
  if (!actor) return;

  const config = actor.getFlag(MODULE_ID, "directionImages") || {};
  const rules = config.rules || [];
  const defaults = config.defaults || { directionMode: "single", images: {} };

  // Find matching rule
  let matchedRule = rules.find(rule => matchesConditions(token, rule));

  let image = null;

  if (matchedRule) {
    const images = matchedRule.images || {};
    const mode = matchedRule.directionMode || "single";

    if (mode === "single") {
      image = images.All;
    } else if (mode === "x-y") {
      image = ["E", "W"].includes(dir) ? images.X : images.Y;
    } else if (mode === "nesw") {
      image = images[dir];
    }
  }

  // Fallback to default
  if (!image) {
    const mode = defaults.directionMode || "single";
    const images = defaults.images || {};
    if (mode === "single") {
      image = images.All;
    } else if (mode === "x-y") {
      image = ["E", "W"].includes(dir) ? images.X : images.Y;
    } else if (mode === "nesw") {
      image = images[dir];
    }
  }

  if (image && token.document.texture.src !== image) {
    await token.document.update({ texture: { src: image } });
  }
}
