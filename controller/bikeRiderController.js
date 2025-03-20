const BikeRider = require("../models/BikeRider");
const Delivery = require("../models/Delivery");
const Order = require("../models/Order");
const Partner = require("../models/Partner");

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
  const { partnerId } = req.params;

  try {
    // Check if the bike rider already exists
    const existingRider = await BikeRider.findOne({ username });
    if (existingRider) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Check if the partner (store) exists
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(400).json({ message: "Store not found" });
    }

    // Hash the password before saving
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Create new bike rider
    const newBikeRider = new BikeRider({
      username,
      password: password,
      fullName,
      phoneNumber,
      email,
      aadharNumber,
      panNumber,
      bikeLicenceNumber,
      vehicleDetails,
      address,
    });

    // Save bike rider
    const savedRider = await newBikeRider.save();

    // Add rider to the partner's `riders` array
    partner.riders.push(savedRider._id);
    await partner.save(); // Save the updated partner

    res
      .status(201)
      .json({ message: "Bike rider added successfully", savedRider });
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

exports.loginBikeRider = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the bike rider by username
    const bikeRider = await BikeRider.findOne({ username });

    if (!bikeRider) {
      return res.status(404).json({ message: "Bike rider not found" });
    }

    // Check if the password is correct
    if (bikeRider.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.status(200).json(bikeRider);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error, unable to login bike rider" });
  }
};

exports.updateOrderDeleveryStatus = async (req, res) => {
  const { orderId, deliveryId, status } = req.params;
  console.log({ orderId, deliveryId, status });
  // console.log(status === "true");
  try {
    const delivery = await Delivery.findById(deliveryId);
    const order = await Order.findOne({ invoice: orderId });
    if (!delivery || !order) {
      return res.status(404).json({ message: "Delivery or Oder not found" });
    }
    if (status === "true") {
      // order deliverd
      delivery.status = status;
      delivery.orderCompletionTime = new Date();
      delivery.amount = order.total;
      try {
        delivery.save();
      } catch (err) {
        console.log(err);
        return res
          .status(500)
          .json({ message: "Server error, unable to handle order" });
      }
      order.status = "Delivered";
      try {
        order.save();
      } catch (err) {
        console.log(err);
        return res
          .status(500)
          .json({ message: "Server error, unable to handle order" });
      }

      return res.status(200).json({ message: "Order Delevered Successfully" });
    } else {
      delivery.status = status;
      delivery.orderCompletionTime = 0;
      delivery.amount = 0;
      try {
        delivery.save();
      } catch (err) {
        console.log(err);
        return res
          .status(500)
          .json({ message: "Server error, unable to handle order" });
      }
      order.status = "Cancelled";
      try {
        order.save();
      } catch (err) {
        console.log(err);
        return res
          .status(500)
          .json({ message: "Server error, unable to handle order" });
      }
      return res.status(200).json({ message: "Order Canceled Successfully" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error, unable to handle order" });
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
  // Check if the order is already assigned to another rider
  const existingDelivery = await Delivery.findOne({ orderId });

  if (existingDelivery) {
    return res.status(400).json({
      message: "Order is already assigned to another rider",
    });
  }
  //
  try {
    // Check the current status of the BikeRider
    const bikeRider = await BikeRider.findById(riderId);

    if (!bikeRider) {
      return res.status(404).json({ message: "Bike rider not found" });
    }

    const rider = await BikeRider.findById(riderId);
    let order = await Order.findOne({ invoice: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.riderName = rider.fullName;
    order.status = "Processing";
    await order.save();

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
      bikeRider,
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

    // Fetch all orders in parallel
    const data = await Promise.all(
      pendingDeliveries.map(async (pending) => {
        const order = await Order.findOne({ invoice: pending.orderId }); // Use `findOne`
        return {
          ...pending._doc, // Spread the existing pending delivery data
          order, // Attach the order details
        };
      })
    );

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error, unable to fetch pending deliveries" });
  }
};
