const BikeRider = require("../models/BikeRider");
const Delivery = require("../models/Delivery");
const Order = require("../models/Order");

exports.addBikeRider = async (req, res) => {
  const {
    username,
    password,
    fullName,
    phoneNumber,
    email,
    aadharNumber,
    panNumber,
    bikeLicenceNumber,
    vehicleDetails,
    address,
  } = req.body;

  try {
    // Check if the bike rider already exists
    const existingRider = await BikeRider.findOne({ username });
    if (existingRider) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password before saving

    const newBikeRider = new BikeRider({
      username,
      password,
      fullName,
      phoneNumber,
      email,
      aadharNumber,
      panNumber,
      bikeLicenceNumber,
      vehicleDetails,
      address,
    });

    await newBikeRider.save();
    res.status(201).json({ message: "Bike rider added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error, unable to add bike rider" });
  }
};
exports.getAllBikeRiders = async (req, res) => {
  try {
    const bikeRiders = await BikeRider.find();
    res.status(200).json(bikeRiders);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error, unable to fetch bike riders" });
  }
};
exports.getRiderByNameOrNumber = async (req, res) => {
  const { identifier } = req.params;

  try {
    const isPhoneNumber = /^\d{10}$/.test(identifier);
    const query = isPhoneNumber
      ? { phoneNumber: identifier }
      : { username: identifier };

    const bikeRider = await BikeRider.findOne(query);

    if (!bikeRider) {
      return res.status(404).json({ message: "Bike rider not found" });
    }

    res.status(200).json(bikeRider);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error, unable to fetch bike rider" });
  }
};

exports.assignBikeRider = async (req, res) => {
  const { orderId, riderId, shopId } = req.params;

  try {
    // Check the current status of the BikeRider
    const bikeRider = await BikeRider.findById(riderId);

    if (!bikeRider) {
      return res.status(404).json({ message: "Bike rider not found" });
    }

    if (bikeRider.status === true) {
      return res
        .status(400)
        .json({ message: "Rider is already on his way to deliver an order" });
    }

    // Update BikeRider status to true only if status is false
    const updatedRider = await BikeRider.findByIdAndUpdate(
      riderId,
      { status: true },
      { new: true }
    );

    // Save delivery data with shopId included
    const deliveryData = new Delivery({
      orderId,
      bikeRiderId: riderId,
      storeId: shopId,
      orderAssignTime: new Date(),
    });

    await deliveryData.save();

    res.status(200).json({
      message: "Rider status updated and delivery data saved successfully",
      updatedRider,
      deliveryData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error, unable to update status and save delivery data",
    });
  }
};

exports.updateOrderCompletionStatus = async (req, res) => {
  const { orderId, riderId } = req.params;

  try {
    // Check the current status of the BikeRider
    const bikeRider = await BikeRider.findById(riderId);

    if (!bikeRider) {
      return res.status(404).json({ message: "Bike rider not found" });
    }

    if (bikeRider.status === false) {
      return res
        .status(400)
        .json({ message: "Rider is already marked as inactive" });
    }

    // Update BikeRider status to false
    const updatedRider = await BikeRider.findByIdAndUpdate(
      riderId,
      { status: false },
      { new: true }
    );

    // Check if delivery data exists
    const deliveryData = await Delivery.findOne({
      orderId,
      bikeRiderId: riderId,
    });

    if (!deliveryData) {
      return res.status(404).json({ message: "Delivery data not found" });
    }

    // Update order completion time and status
    await Delivery.findByIdAndUpdate(deliveryData._id, {
      orderCompletionTime: new Date(),
      status: true,
    });
    // Update order status to Delivered
    await Order.findByIdAndUpdate(orderId, { status: "Delivered" });

    res.status(200).json({
      message:
        "Rider status updated to inactive and order marked as completed successfully",
      updatedRider,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error, unable to update status and complete order",
    });
  }
};

exports.pendingDeliveries = async (req, res) => {
  const { riderId } = req.params;

  try {
    const pendingDeliveries = await Delivery.find({
      bikeRiderId: riderId,
      status: false,
    });

    if (!pendingDeliveries.length) {
      return res.status(404).json({ message: "No pending deliveries found" });
    }

    res.status(200).json(pendingDeliveries);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error, unable to fetch pending deliveries" });
  }
};
