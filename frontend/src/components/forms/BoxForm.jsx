import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { getBoxTypes } from '../../api/boxtypes';

export default function BoxForm({ objectId, layoutId, position, onSubmit, onCancel }) {
  const [boxTypes, setBoxTypes] = useState([]);
  const [formData, setFormData] = useState({
    box_type_id: '',
    notes: '',
    active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBoxTypes();
  }, []);

  const loadBoxTypes = async () => {
    try {
      const response = await getBoxTypes();
      setBoxTypes(response.data || []);
      if (response.data && response.data.length > 0) {
        setFormData(prev => ({ ...prev, box_type_id: response.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load box types:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        object_id: objectId,
        layout_id: layoutId,
        box_type_id: parseInt(formData.box_type_id),
        pos_x: position.x,
        pos_y: position.y,
        notes: formData.notes || null,
        active: formData.active
      });
    } catch (error) {
      console.error('Submit error:', error);
      alert('Fehler beim Erstellen der Box');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Box Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Box-Typ *
        </label>
        <select
          value={formData.box_type_id}
          onChange={(e) => setFormData(prev => ({ ...prev, box_type_id: e.target.value }))}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          required
        >
          {boxTypes.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* Position */}
      <div className="bg-gray-700 rounded p-3">
        <p className="text-sm text-gray-300">
          <strong>Position:</strong> X: {position.x}, Y: {position.y}
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Notizen
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="Optional"
        />
      </div>

      {/* Active */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="box-active"
          checked={formData.active}
          onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
          className="w-4 h-4"
        />
        <label htmlFor="box-active" className="text-sm text-gray-300">
          Box ist aktiv
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading} className="flex-1">
          Box erstellen
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}