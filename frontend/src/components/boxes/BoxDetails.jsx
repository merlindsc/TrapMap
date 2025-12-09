import { useState } from 'react';
import { QrCode, Edit, Trash2 } from 'lucide-react';
import ScanHistory from '../scans/ScanHistory';
import ScanDialog from '../scans/ScanDialog';
import Button from '../ui/Button';

export default function BoxDetails({ box, onEdit, onDelete }) {
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (!box) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">Keine Box ausgewählt</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      green: 'bg-green-600',
      yellow: 'bg-yellow-600',
      red: 'bg-red-600',
      gray: 'bg-gray-600'
    };
    return colors[status] || 'bg-gray-600';
  };

  const handleScanComplete = () => {
    setShowScanDialog(false);
    // Reload box data here if needed
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Box #{box.number}
            </h3>
            <p className="text-gray-400">{box.box_type?.name || 'Unbekannter Typ'}</p>
          </div>
          <div className={`w-12 h-12 rounded-full ${getStatusColor(box.current_status)} flex items-center justify-center`}>
            <span className="text-white font-bold">{box.number}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setShowScanDialog(true)}
            className="flex-1"
          >
            <QrCode className="w-4 h-4" />
            <span>Scannen</span>
          </Button>
          <Button variant="ghost" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Aktueller Status</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(box.current_status)}`} />
            <span className="text-white capitalize">{box.current_status}</span>
          </div>
        </div>

        {box.current_symbol && box.current_symbol !== 'none' && (
          <div>
            <p className="text-sm text-gray-400 mb-1">Symbol</p>
            <p className="text-white">{box.current_symbol}</p>
          </div>
        )}

        {box.notes && (
          <div>
            <p className="text-sm text-gray-400 mb-1">Notizen</p>
            <p className="text-white">{box.notes}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-400 mb-1">Position</p>
          <p className="text-white">X: {box.pos_x}, Y: {box.pos_y}</p>
        </div>

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          {showHistory ? 'Historie ausblenden' : 'Historie anzeigen'}
        </button>

        {/* History */}
        {showHistory && (
          <div className="pt-4 border-t border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-4">Scan-Historie</h4>
            <ScanHistory boxId={box.id} />
          </div>
        )}
      </div>

      {/* Scan Dialog */}
      <ScanDialog
        isOpen={showScanDialog}
        onClose={handleScanComplete}
        box={box}
      />
    </div>
  );
}