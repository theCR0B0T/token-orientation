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

  // Register Handlebars helpers
  Handlebars.registerHelper("inc", value => parseInt(value) + 1);
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("array", (...args) => args.slice(0, -1));
  Handlebars.registerHelper("checked", value => value ? "checked" : "");
});
