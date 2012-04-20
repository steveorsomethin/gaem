module.exports = function(rootDirectory) {
  var express = require("express");

  var app = express.createServer();
  app.use("/client", express.static(rootDirectory + "/client"));
  app.use("/shared", express.static(rootDirectory + "/shared"));
  app.listen(8080);
  
  console.log("Server running...");
};