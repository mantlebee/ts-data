var ghpages = require("gh-pages");

ghpages.publish("docs/api", function (err) {
  if (err) {
    console.error(err);
    process.exitCode = 1;
  }
});
