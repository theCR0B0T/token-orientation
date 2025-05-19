const DIRECTION_IMAGES = {
  N: "https://assets.forge-vtt.com/678456b573282f821685767d/Zombie_Default_P2.png",
  E: "https://assets.forge-vtt.com/678456b573282f821685767d/Zombie_Default_P1.png",
  S: "https://assets.forge-vtt.com/678456b573282f821685767d/Zombie_Default_P4.png",
  W: "https://assets.forge-vtt.com/678456b573282f821685767d/Zombie_Default_P3.png"
};

Hooks.on("preUpdateToken", async (tokenDoc, updateData, options, userId) => {
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

  if (dir && DIRECTION_IMAGES[dir]) {
    await token.document.updateSource({ texture: {src: DIRECTION_IMAGES[dir] } });
    token.draw();
  }
});