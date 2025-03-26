const mongoose = require("mongoose");

const storeNotificationSchema = new mongoose.Schema(
  {
    zipCode: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["read", "unread"],
      default: "unread",
    },
  },
  { timestamps: true }
);

const StoreNotification = mongoose.model(
  "StoreNotification",
  storeNotificationSchema
);

module.exports = StoreNotification;
