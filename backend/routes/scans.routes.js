const express = require("express");
const router = express.Router();
const scansController = require("../controllers/scans.controller");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const upload = require("../middleware/upload");

router.get("/", authenticate, asyncHandler(scansController.getHistory));
router.post("/", authenticate, upload.single("photo"), asyncHandler(scansController.create));

module.exports = router;