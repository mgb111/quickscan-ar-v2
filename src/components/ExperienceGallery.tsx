import React, { useState, useEffect } from 'react';
import { Play, Eye, Calendar, FileText, Loader2, RefreshCw } from 'lucide-react';
import { getExperiences } from '../lib/supabase';
import type { ARExperience } from '../types';

interface ExperienceGalleryProps {
  onViewExperience: (experience: ARExperience) => void;
  onCreateNew: () => void;
}

export default function ExperienceGallery({ onViewExperience, onCreateNew }: ExperienceGalleryProps) {
  const [experiences, setExperiences] = useState<ARExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExperiences = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExperiences();
      setExperiences(data);
    } catch (err) {
      console.error('Failed to load experiences:', err);
      setError('Failed to load experiences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiences();
  }, []);

  const getStatusColor = (status: ARExperience['status']) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: ARExperience['status']) => {
    switch (status) {
      case 'ready': return 'Ready';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading experiences...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadExperiences}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AR Experiences</h1>
              <p className="text-gray-600 mt-1">Create and manage your augmented reality experiences</p>
            </div>
            <button
              onClick={onCreateNew}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>Create New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {experiences.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm p-12 max-w-md mx-auto">
              <div className="text-gray-400 mb-6">
                <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Experiences Yet</h3>
              <p className="text-gray-600 mb-6">Create your first AR experience to get started</p>
              <button
                onClick={onCreateNew}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                <span>Create First Experience</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {experiences.map((experience) => (
              <div key={experience.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Marker Preview */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  <img
                    src={experience.marker_image_url}
                    alt={`${experience.name} marker`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(experience.status)}`}>
                      {getStatusText(experience.status)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 truncate">{experience.name}</h3>
                  {experience.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{experience.description}</p>
                  )}
                  
                  <div className="flex items-center text-xs text-gray-500 mb-4 space-x-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(experience.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="w-3 h-3" />
                      <span className="capitalize">{experience.content_type}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onViewExperience(experience)}
                    disabled={experience.status !== 'ready'}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                      experience.status === 'ready'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : experience.status === 'processing'
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-red-100 text-red-600 cursor-not-allowed'
                    }`}
                  >
                    {experience.status === 'processing' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : experience.status === 'ready' ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>View AR</span>
                      </>
                    ) : (
                      <>
                        <span>Failed</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}