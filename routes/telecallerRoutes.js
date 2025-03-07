const express = require("express");
const router = express.Router();
const Telecaller = require("../models/Telecaller");

// Create a new Telecaller (POST)
router.post("/telecaller/add", async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      city,
      state,
      pinCode,
      pan,
      aadhar,
      bankAccNumber,
      IFSC,
      accountHolderName,
    } = req.body;

    // Check required fields
    if (
      !name ||
      !email ||
      !mobile ||
      !city ||
      !state ||
      !pinCode ||
      !pan ||
      !aadhar
    ) {
      return res
        .status(400)
        .json({ error: "All required fields must be provided." });
    }

    const newTelecaller = new Telecaller({
      name,
      email,
      mobile,
      city,
      state,
      pinCode,
      pan,
      aadhar,
      bankAccNumber: bankAccNumber || null,
      IFSC: IFSC || null,
      accountHolderName: accountHolderName || null,
    });

    await newTelecaller.save();
    res
      .status(201)
      .json({ message: "Telecaller added successfully", data: newTelecaller });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error:
          "Duplicate entry. Email, mobile, PAN, Aadhar, or Bank Account already exists.",
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get Telecaller by ID (GET)
router.get("/telecaller/:id", async (req, res) => {
  try {
    const telecaller = await Telecaller.findById(req.params.id);
    if (!telecaller) {
      return res.status(404).json({ message: "Telecaller not found" });
    }
    res.json(telecaller);
  } catch (error) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

// Get All Telecallers (GET)
router.get("/telecallers/all", async (req, res) => {
  try {
    const telecallers = await Telecaller.find();
    res.json(telecallers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Telecaller Status (PATCH)
router.put("/telecaller/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Accepted", "Rejected", "Hold"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updatedTelecaller = await Telecaller.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedTelecaller) {
      return res.status(404).json({ message: "Telecaller not found" });
    }

    res.json({
      message: "Status updated successfully",
      data: updatedTelecaller,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Telecaller (DELETE)
router.delete("/telecaller/:id", async (req, res) => {
  try {
    const deletedTelecaller = await Telecaller.findByIdAndDelete(req.params.id);
    if (!deletedTelecaller) {
      return res.status(404).json({ message: "Telecaller not found" });
    }

    res.json({ message: "Telecaller deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

module.exports = router;
