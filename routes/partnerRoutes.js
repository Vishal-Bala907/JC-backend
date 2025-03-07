const express = require("express");
const router = express.Router();
const Partner = require("../models/Partner");

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

module.exports = router;
