import { useState } from 'react';
import Button from '../ui/Button';
import { Upload } from 'lucide-react';

export default function LayoutForm({ objectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    width: 1920,
    height: 1080
  });
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setFormData(prev => ({
            ...prev,
            width: img.width,
            height: img.height
          }));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Upload image to Supabase Storage first
      // For now, use placeholder URL
      const imageUrl = 'https://via.placeholder.com/1920x1080';

      await onSubmit({
        object_id: objectId,
        name: formData.name,
        description: formData.description,
        image_url: imageUrl,
        width: formData.width,
        height: formData.height
      });
    } catch (error) {
      console.error('Submit error:', error);
      alert('Fehler beim Erstellen des Lageplans');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Lageplan-Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="z.B. Erdgeschoss"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Beschreibung
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="Optional"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Lageplan-Bild *
        </label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
            required
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 mb-1">
              {imageFile ? imageFile.name : 'Klicken zum Hochladen'}
            </p>
            <p className="text-xs text-gray-500">PNG, JPG bis zu 10MB</p>
          </label>
        </div>
      </div>

      {/* Dimensions (auto-detected) */}
      {imageFile && (
        <div className="bg-gray-700 rounded p-3 text-sm text-gray-300">
          <p>Bildgröße: {formData.width} × {formData.height} px</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading} className="flex-1">
          Lageplan erstellen
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}