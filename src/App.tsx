import React, { useState } from 'react';
import UploadInterface from './components/UploadInterface';
import ExperienceGallery from './components/ExperienceGallery';
import ARViewer from './components/ARViewer';
import type { ARExperience } from './types';

type ViewMode = 'gallery' | 'upload' | 'viewer';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [selectedExperience, setSelectedExperience] = useState<ARExperience | null>(null);

  const handleCreateNew = () => {
    setViewMode('upload');
  };

  const handleUploadComplete = () => {
    setViewMode('gallery');
  };

  const handleViewExperience = (experience: ARExperience) => {
    setSelectedExperience(experience);
    setViewMode('viewer');
  };

  const handleBackToGallery = () => {
    setSelectedExperience(null);
    setViewMode('gallery');
  };

  switch (viewMode) {
    case 'upload':
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <UploadInterface onUploadComplete={handleUploadComplete} />
          <div className="text-center mt-6">
            <button
              onClick={handleBackToGallery}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Gallery
            </button>
          </div>
        </div>
      );

    case 'viewer':
      return selectedExperience ? (
        <ARViewer
          experience={selectedExperience}
          onBack={handleBackToGallery}
        />
      ) : null;

    default:
      return (
        <ExperienceGallery
          onViewExperience={handleViewExperience}
          onCreateNew={handleCreateNew}
        />
      );
  }
}

export default App;