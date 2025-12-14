const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/components/BoxEditDialogFloorPlan.jsx',
  'frontend/src/components/PhotoUploadDialog.jsx',
  'frontend/src/components/map/LayoutImageMap.jsx',
  'frontend/src/components/map/BoxPopup.jsx',
  'frontend/src/components/forms/LayoutForm.jsx',
  'frontend/src/components/forms/BoxForm.jsx',
  'frontend/src/components/boxes/BoxDialog.jsx',
  'frontend/src/components/boxes/BoxDetails.jsx',
  'frontend/src/components/boxes/BoxHistoryModal.jsx',
  'frontend/src/components/ui/ModalManager.jsx',
  'frontend/src/components/ui/OfflineBanner.jsx'
];

files.forEach(f => {
  const p = path.join(__dirname, '..', f.replace(/\//g, path.sep));
  try {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log('Deleted', p);
    } else {
      console.log('Not found', p);
    }
  } catch (err) {
    console.error('Error deleting', p, err.message);
  }
});
