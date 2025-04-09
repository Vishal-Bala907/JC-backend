const { orders } = require("@paypal/checkout-server-sdk");
const mongoose = require("mongoose");

const telecallerAndUser = new mongoose.Schema({
  telecallerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Telecaller",
    required: true,
  },
  userMobileNumber: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("TelecallerAndCustomer", telecallerAndUser);
