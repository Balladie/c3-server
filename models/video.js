var mongoose = require("mongoose");

var videoSchema = mongoose.Schema({
      title: String,
      madeAt: Date,
      registeredAt: {type: Date, default: Date.now},
      contentDescription: String,
      keywords: [String],
      platforms: [String],
      size: String,
      duration: String,
      resolution: String
});

module.exports = videoSchema;
