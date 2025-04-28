const BikeRider = require("../models/BikeRider");
const Delivery = require("../models/Delivery");
const Order = require("../models/Order");
const Partner = require("../models/Partner");
const StoreNotification = require("../models/StoreNotification");

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
    const duplicateCheck = await BikeRider.findOne({
      $or: [
        { username },
        { email },
        { phoneNumber },
        { aadharNumber },
        { panNumber },
        { bikeLicenceNumber },
      ],
    });

    if (duplicateCheck) {
      let conflictField = "";

      if (duplicateCheck.username === username) {
        conflictField = "Username";
      } else if (duplicateCheck.email === email) {
        conflictField = "Email";
      } else if (duplicateCheck.phoneNumber === phoneNumber) {
        conflictField = "Phone number";
      } else if (duplicateCheck.aadharNumber === aadharNumber) {
        conflictField = "Aadhar number";
      } else if (duplicateCheck.panNumber === panNumber) {
        conflictField = "PAN number";
      } else if (duplicateCheck.bikeLicenceNumber === bikeLicenceNumber) {
        conflictField = "Bike Licence number";
      }

      return res
        .status(400)
        .json({ message: `${conflictField} already exists` });
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
  console.log("Updating delivery status:", { orderId, deliveryId, status });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate status
    if (!["true", "false"].includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid status value" });
    }

    const delivery = await Delivery.findById(deliveryId).session(session);
    if (!delivery) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Delivery not found" });
    }

    const order = await Order.findOne({ invoice: orderId }).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Order not found" });
    }

    const isDelivered = status === "true";

    // Extra safety check: Don't allow cancelling already delivered order
    if (delivery.status === true && !isDelivered) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Cannot cancel a delivered order" });
    }

    // Extra safety check: Don't deliver already delivered order
    if (delivery.status === true && isDelivered) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Order already delivered" });
    }

    if (isDelivered) {
      // Mark as Delivered
      delivery.status = true;
      delivery.orderCompletionTime = new Date();
      delivery.amount = order.total;
      order.status = "Delivered";
    } else {
      // Mark as Cancelled
      delivery.status = false;
      delivery.orderCompletionTime = null;
      delivery.amount = 0;
      order.status = "Cancelled";
    }

    // Create the notification message
    const notificationMessage = isDelivered
      ? `Order ${order.invoice} delivered successfully by rider ${order.riderName} (id: ${delivery.bikeRiderId})`
      : `Order ${order.invoice} was cancelled. Rider: ${order.riderName} (id: ${delivery.bikeRiderId})`;

    const notification = new StoreNotification({
      zipCode: order.user_info.zipCode,
      message: notificationMessage,
      orderStatus: isDelivered ? "delivered" : "cancelled",
    });

    // Save everything atomically
    await Promise.all([
      delivery.save({ session }),
      order.save({ session }),
      notification.save({ session }),
    ]);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: isDelivered
        ? "Order Delivered Successfully"
        : "Order Cancelled Successfully",
    });
  } catch (err) {
    console.error("Error updating delivery status:", err);
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
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

exports.getBikeRiderById = async (req, res) => {
  const { id } = req.params; // Destructure for cleaner code

  try {
    if (!id) {
      return res.status(400).json({ message: "ID is required" });
    }

    const rider = await BikeRider.findById(id);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.status(200).json(rider);
  } catch (err) {
    console.error("Error fetching bike rider:", err);
    res.status(500).json({ message: "Something went wrong!" });
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

    const data = await Promise.all(
      pendingDeliveries.map(async (pending) => {
        const order = await Order.findOne({
          invoice: pending.orderId,
          status: "Processing",
        });

        if (!order) return null; // Skip orders that are not "Processing"

        return {
          ...pending._doc,
          order,
        };
      })
    );

    // Filter out null values (i.e., deliveries where order.status !== "Processing")
    const filteredData = data.filter((item) => item !== null);

    if (!filteredData.length) {
      return res.status(404).json({
        message: "No pending deliveries with Processing orders found",
      });
    }

    res.status(200).json(filteredData);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error, unable to fetch pending deliveries" });
  }
};

exports.deleteRider = async (req, res) => {
  const { riderId } = req.params;

  // Validate ObjectId
  if (!riderId) {
    return res.status(400).json({ message: "Invalid rider ID format" });
  }

  try {
    // Check if the rider exists
    const rider = await BikeRider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ message: "Bike rider not found" });
    }

    // Delete the rider
    await BikeRider.findByIdAndDelete(riderId);
    res.status(200).json({ message: "Bike rider deleted successfully" });
  } catch (error) {
    console.error("Error deleting bike rider:", error);
    res.status(500).json({ message: "Server error, unable to delete rider" });
  }
};

exports.getMyDeleveries = async (req, res) => {
  const { id } = req.params;
  console.log(id);

  try {
    // Fetch deliveries and correctly populate `orderId`
    // Fetch deliveries
    const deliveries = await Delivery.find({ bikeRiderId: id });

    if (!deliveries.length) {
      return res
        .status(404)
        .json({ status: false, message: "No deliveries found" });
    }

    // Extract all orderIds
    const orderIds = deliveries.map((delivery) => delivery.orderId);
    // console.log(orderIds);

    // Fetch corresponding orders manually
    const orders = await Order.find({ invoice: { $in: orderIds } });
    // console.log(orders);

    // Attach order data to deliveries
    // const deliveriesWithOrders = deliveries.map((delivery) => ({
    //   ...delivery._doc,
    //   order:
    //     orders.find(
    //       (order) => order._id.toString() === delivery.orderId.toString()
    //     ) || null,
    // }));

    res.status(200).json({ status: true, data: orders });

    // res.status(200).json({ status: true, data: deliveries }); // Send the deliveries as the response
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error, unable to fetch deliveries",
    });
  }
};
