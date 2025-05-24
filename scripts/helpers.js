Hooks.once("init", () => {
  Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper("getDirectionFields", function(directionMode) {
    switch (directionMode) {
      case "single":
        return ["All"];
      case "xy":
        return ["X", "Y"];
      case "nesw":
        return ["N", "E", "S", "W"];
      default:
        return [];
    }
  });
});
