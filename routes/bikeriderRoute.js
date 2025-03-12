const express = require("express");
const {
  addBikeRider,
  getAllBikeRiders,
  getRiderByNameOrNumber,
  assignBikeRider,
  updateOrderCompletionStatus,
  pendingDeliveries,
} = require("../controller/bikeRiderController");
const router = express.Router();

//register a staff
router.post("/add-rider", addBikeRider);

//login a admin
router.get("/get-all-riders", getAllBikeRiders);

//forget-password
router.get("/get-rider/:identifier", getRiderByNameOrNumber);

//reset-password
router.get("/assign-rider/:orderId/:riderId/:shopId", assignBikeRider);

//add a staff
router.put("/order-deliverd/:orderId/:riderId", updateOrderCompletionStatus);

router.get("/pending-deliveries/:riderId", pendingDeliveries);

module.exports = router;
