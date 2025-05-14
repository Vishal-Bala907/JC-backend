const mongoose = require("mongoose");

const pincodeSchema = new mongoose.Schema({
  pincode: {
    type: String,
    required: true,
    ununique: true,
  },
  flag: {
    type: Boolean,
    lowercase: true,
    default: false,
  },
});

module.exports = mongoose.model("Pincode", pincodeSchema);
