import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Video, Box, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ARExperience } from '../types';

interface UploadInterfaceProps {
  onUploadComplete: (experience: ARExperience) => void;
}

interface ValidationResult {
  quality: number;
  issues: string[];
  recommendations: string[];
}

export default function UploadInterface({ onUploadComplete }: UploadInterfaceProps) {
  const [markerFile, setMarkerFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [markerValidation, setMarkerValidation] = useState<ValidationResult | null>(null);
  const [dragOver, setDragOver] = useState<'marker' | 'content' | null>(null);

  const validateMarkerImage = useCallback(async (file: File): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Calculate contrast and edge density
        let totalContrast = 0;
        let edgeCount = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          
          // Simple edge detection
          if (i > img.width * 4) {
            const prevBrightness = (data[i - img.width * 4] + data[i - img.width * 4 + 1] + data[i - img.width * 4 + 2]) / 3;
            const contrast = Math.abs(brightness - prevBrightness);
            totalContrast += contrast;
            if (contrast > 30) edgeCount++;
          }
        }

        const avgContrast = totalContrast / (data.length / 4);
        const edgeDensity = edgeCount / (data.length / 4);
        
        // Calculate quality score (more forgiving)
        const quality = Math.min(100, Math.max(60, (avgContrast / 30) * 100 + (edgeDensity * 1000)));

        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check resolution (lowered requirement)
        if (img.width < 256 || img.height < 256) {
          issues.push('Image resolution is too low');
          recommendations.push('Use images with at least 256x256 resolution');
        }

        // Check aspect ratio
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.5 || aspectRatio > 2) {
          issues.push('Unusual aspect ratio detected');
          recommendations.push('Use images with aspect ratios between 1:2 and 2:1');
        }

        // Check contrast (more lenient)
        if (avgContrast < 15) {
          issues.push('Low contrast detected');
          recommendations.push('Use images with clear, high-contrast features');
        }

        // Check edge density
        if (edgeDensity < 0.1) {
          recommendations.push('Add more distinct features or patterns for better tracking');
        }

        resolve({ quality, issues, recommendations });
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleMarkerUpload = useCallback(async (file: File) => {
    setMarkerFile(file);
    if (file.type.startsWith('image/')) {
      const validation = await validateMarkerImage(file);
      setMarkerValidation(validation);
    }
  }, [validateMarkerImage]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'marker' | 'content') => {
    e.preventDefault();
    setDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (!file) return;

    if (type === 'marker' && file.type.startsWith('image/')) {
      handleMarkerUpload(file);
    } else if (type === 'content' && (file.type.startsWith('video/') || file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
      setContentFile(file);
    }
  }, [handleMarkerUpload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markerFile || !contentFile || !name.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('markerImage', markerFile);
      formData.append('contentFile', contentFile);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('contentType', contentFile.type.startsWith('video/') ? 'video' : 'model');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-experience`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const experience = await response.json();
      onUploadComplete(experience);
      
      // Reset form
      setMarkerFile(null);
      setContentFile(null);
      setName('');
      setDescription('');
      setMarkerValidation(null);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create AR Experience</h2>
          <p className="text-gray-600">Upload a marker image and 3D model or video to create your AR experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Experience Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Experience Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="My AR Experience"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Describe your AR experience"
              />
            </div>
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Marker Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Marker Image *
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragOver === 'marker'
                    ? 'border-blue-500 bg-blue-50'
                    : markerFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver('marker');
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, 'marker')}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleMarkerUpload(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {markerFile ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <div>
                      <p className="font-medium text-green-800">{markerFile.name}</p>
                      <p className="text-sm text-green-600">
                        {(markerFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="font-medium text-gray-900">Drop marker image here</p>
                      <p className="text-sm text-gray-500">or click to browse</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Marker Validation */}
              {markerValidation && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Marker Quality</span>
                    <span className={`text-sm font-bold ${
                      markerValidation.quality >= 80 ? 'text-green-600' :
                      markerValidation.quality >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {markerValidation.quality.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        markerValidation.quality >= 80 ? 'bg-green-500' :
                        markerValidation.quality >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${markerValidation.quality}%` }}
                    />
                  </div>

                  {markerValidation.issues.length > 0 && (
                    <div className="space-y-1">
                      {markerValidation.issues.map((issue, index) => (
                        <div key={index} className="flex items-center text-sm text-red-600">
                          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}

                  {markerValidation.recommendations.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {markerValidation.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start text-sm text-blue-600">
                          <span className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0">💡</span>
                          {rec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                3D Model or Video *
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragOver === 'content'
                    ? 'border-blue-500 bg-blue-50'
                    : contentFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver('content');
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, 'content')}
              >
                <input
                  type="file"
                  accept=".glb,.gltf,video/*"
                  onChange={(e) => e.target.files?.[0] && setContentFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {contentFile ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <div>
                      <p className="font-medium text-green-800">{contentFile.name}</p>
                      <p className="text-sm text-green-600">
                        {(contentFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-center space-x-2">
                      <Box className="w-6 h-6 text-gray-400" />
                      <Video className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Drop 3D model or video here</p>
                      <p className="text-sm text-gray-500">GLB, GLTF, MP4, WebM supported</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={!markerFile || !contentFile || !name.trim() || uploading}
              className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Experience...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Create AR Experience
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}