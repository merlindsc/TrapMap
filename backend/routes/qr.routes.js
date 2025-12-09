const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const qr = require("../controllers/qr.controller");

router.post("/generate", authenticate, qr.generate);
router.get("/check/:code", authenticate, qr.check);
router.post("/assign", authenticate, qr.assign);

module.exports = router;
