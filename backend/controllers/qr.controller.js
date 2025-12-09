const qrService = require("../services/qr.service");

// generate codes
exports.generate = async (req, res) => {
  const { count } = req.body;
  const org = req.user.organisation_id;

  const codes = await qrService.generateCodes(org, count);
  res.json({ codes });
};

// check if qr exists + assigned
exports.check = async (req, res) => {
  const code = req.params.code;

  const result = await qrService.checkCode(code);

  if (!result) {
    return res.status(404).json({ message: "QR does not exist" });
  }

  res.json(result);
};

// assign qr to box
exports.assign = async (req, res) => {
  const { code, box_id } = req.body;

  await qrService.assignCode(code, box_id);
  res.json({ message: "QR linked successfully" });
};
