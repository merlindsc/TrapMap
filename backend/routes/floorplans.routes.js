// ============================================
// FLOORPLANS ROUTES
// Lageplan-spezifische Endpoints
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');

const { authenticate, requireEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const floorplansController = require('../controllers/floorplans.controller');

// Multer for image upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// ========================================================
// GET all floor plans for an object
// GET /api/floorplans/object/:objectId
// ========================================================
router.get(
  '/object/:objectId',
  authenticate,
  asyncHandler(floorplansController.getByObjectId)
);

// ========================================================
// GET unplaced boxes for object (must be before /:id)
// GET /api/floorplans/object/:objectId/unplaced
// ========================================================
router.get(
  '/object/:objectId/unplaced',
  authenticate,
  asyncHandler(floorplansController.getUnplacedBoxes)
);

// ========================================================
// GET GPS-placed boxes for object
// GET /api/floorplans/object/:objectId/gps
// ========================================================
router.get(
  '/object/:objectId/gps',
  authenticate,
  asyncHandler(floorplansController.getGpsBoxes)
);

// ========================================================
// GET boxes on a floor plan
// GET /api/floorplans/:id/boxes
// ========================================================
router.get(
  '/:id/boxes',
  authenticate,
  asyncHandler(floorplansController.getBoxesOnPlan)
);

// ========================================================
// GET single floor plan
// GET /api/floorplans/:id
// ========================================================
router.get(
  '/:id',
  authenticate,
  asyncHandler(floorplansController.getById)
);

// ========================================================
// UPLOAD floor plan image to Supabase Storage
// POST /api/floorplans/upload
// ========================================================
router.post(
  '/upload',
  authenticate,
  requireEditor,
  upload.single('image'),
  asyncHandler(floorplansController.uploadImage)
);

// ========================================================
// CREATE floor plan
// POST /api/floorplans
// ========================================================
router.post(
  '/',
  authenticate,
  requireEditor,
  asyncHandler(floorplansController.create)
);

// ========================================================
// UPDATE floor plan
// PUT /api/floorplans/:id
// ========================================================
router.put(
  '/:id',
  authenticate,
  requireEditor,
  asyncHandler(floorplansController.update)
);

// ========================================================
// DELETE floor plan
// DELETE /api/floorplans/:id
// ========================================================
router.delete(
  '/:id',
  authenticate,
  requireEditor,
  asyncHandler(floorplansController.delete)
);

// ========================================================
// UPDATE box position on floor plan
// PUT /api/floorplans/:id/boxes/:boxId
// ========================================================
router.put(
  '/:id/boxes/:boxId',
  authenticate,
  requireEditor,
  asyncHandler(floorplansController.placeBox)
);

// ========================================================
// ADD box to floor plan (create new box on plan)
// POST /api/floorplans/:id/boxes
// ========================================================
router.post(
  '/:id/boxes',
  authenticate,
  requireEditor,
  asyncHandler(floorplansController.createBoxOnPlan)
);

// ========================================================
// REMOVE box from floor plan
// DELETE /api/floorplans/boxes/:boxId
// ========================================================
router.delete(
  '/boxes/:boxId',
  authenticate,
  requireEditor,
  asyncHandler(floorplansController.removeBoxFromPlan)
);

module.exports = router;