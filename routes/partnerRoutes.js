const express = require("express");
const router = express.Router();
const Partner = require("../models/Partner");
const Order = require("../models/Order");

// Create a new Store Owner (POST)
router.post("/partner/add", async (req, res) => {
  try {
    const newOwner = new Partner(req.body);
    await newOwner.save();
    res
      .status(201)
      .json({ message: "Store owner created successfully", data: newOwner });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Store Owner by ID (GET)
router.get("/partner/:id", async (req, res) => {
  try {
    const owner = await Partner.findById(req.params.id);
    if (!owner)
      return res.status(404).json({ message: "Store owner not found" });
    res.json(owner);
  } catch (error) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

// Get All Store Owners (GET)
router.get("/partners/all", async (req, res) => {
  try {
    const owners = await Partner.find();
    res.json(owners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Partner Status (PATCH)
router.put("/partner/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Accepted", "Rejected", "Hold"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updatedPartner = await Partner.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedPartner)
      return res.status(404).json({ message: "Partner not found" });

    res.json({ message: "Status updated successfully", data: updatedPartner });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET API to fetch orders by zip code
router.get("/orders/zip/:zipCode", async (req, res) => {
  const { zipCode } = req.params;

  try {
    const orders = await Order.find({ "user_info.zipCode": zipCode });

    if (orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for this zip code." });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders by zip code:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});
// GET API to fetch deliveries by storeId
router.get("/deliveries/store/:storeId", async (req, res) => {
  const { storeId } = req.params;

  try {
    const deliveries = await Delivery.find({ storeId });

    if (!deliveries || deliveries.length === 0) {
      return res
        .status(404)
        .json({ message: "No deliveries found for this store." });
    }

    res.status(200).json(deliveries);
  } catch (error) {
    console.error("Error fetching deliveries by storeId:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
