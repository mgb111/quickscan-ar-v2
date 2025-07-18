import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Loader2, AlertCircle, Eye, Camera } from 'lucide-react';
import type { ARExperience } from '../types';

interface ARViewerProps {
  experience: ARExperience;
  onBack: () => void;
}

export default function ARViewer({ experience, onBack }: ARViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arReady, setArReady] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Initializing AR...');
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (experience.status !== 'ready') {
      setError('Experience is not ready yet. Please try again later.');
      setIsLoading(false);
      return;
    }

    initializeAR();

    return () => {
      cleanup();
    };
  }, [experience]);

  const cleanup = () => {
    // Stop any active camera streams
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {
          // Ignore cleanup errors
        });
    }
  };

  const initializeAR = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setArReady(false);

      // Step 1: Check camera permissions
      setLoadingStep('Requesting camera access...');
      await checkCameraPermissions();

      // Step 2: Load AR libraries
      setLoadingStep('Loading AR libraries...');
      await loadARLibraries();

      // Step 3: Create AR scene
      setLoadingStep('Setting up AR scene...');
      await createARScene();

      setArReady(true);
      setIsLoading(false);

    } catch (err) {
      console.error('Failed to initialize AR:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize AR');
      setIsLoading(false);
    }
  };

  const checkCameraPermissions = async (): Promise<void> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access is not supported in this browser. Please use Chrome, Firefox, or Safari.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      // Stop the stream immediately - we just needed to check permissions
      stream.getTracks().forEach(track => track.stop());
      
      // Small delay to ensure camera is properly released
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Camera access denied. Please allow camera permissions and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        throw new Error('No camera found. Please ensure your device has a camera.');
      } else {
        throw new Error(`Camera error: ${err.message}`);
      }
    }
  };

  const loadARLibraries = async (): Promise<void> => {
    // Load A-Frame
    if (typeof (window as any).AFRAME === 'undefined') {
      await loadScript('https://aframe.io/releases/1.4.0/aframe.min.js');
    }

    // Load AR.js (simpler and more reliable than MindAR)
    if (typeof (window as any).THREEx === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.min.js');
    }

    // Wait for libraries to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      const timeout = setTimeout(() => {
        script.remove();
        reject(new Error(`Timeout loading script: ${src}`));
      }, 10000);

      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        reject(new Error(`Failed to load script: ${src}`));
      };

      document.head.appendChild(script);
    });
  };

  const createARScene = async (): Promise<void> => {
    if (!sceneRef.current) {
      throw new Error('Scene container not found');
    }

    // Clear any existing content
    sceneRef.current.innerHTML = '';

    // Create AR scene using AR.js with better camera handling
    const sceneHTML = `
      <a-scene
        embedded
        arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3; trackingMethod: best; sourceWidth: 640; sourceHeight: 480; displayWidth: 640; displayHeight: 480;"
        vr-mode-ui="enabled: false"
        style="width: 100%; height: 100vh;"
      >
        <a-assets timeout="10000">
          ${experience.content_type === 'model' 
            ? `<a-asset-item id="arContent" src="${experience.content_url}"></a-asset-item>`
            : `<video 
                 id="arContent" 
                 autoplay 
                 loop 
                 muted 
                 playsinline 
                 webkit-playsinline 
                 crossorigin="anonymous"
                 src="${experience.content_url}"
                 style="display: none;">
               </video>`
          }
        </a-assets>

        <a-marker preset="hiro" id="marker">
          ${experience.content_type === 'model'
            ? `<a-gltf-model 
                 src="#arContent" 
                 position="0 0 0" 
                 scale="1 1 1" 
                 animation="property: rotation; to: 0 360 0; loop: true; dur: 10000">
               </a-gltf-model>`
            : `<a-video 
                 src="#arContent" 
                 width="1.6" 
                 height="0.9" 
                 position="0 0 0" 
                 rotation="-90 0 0">
               </a-video>`
          }
        </a-marker>

        <a-entity camera look-controls-enabled="false" arjs-look-controls="smoothingFactor: 0.1"></a-entity>
      </a-scene>
    `;

    sceneRef.current.innerHTML = sceneHTML;

    // Wait for scene to initialize and check if camera is working
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('AR scene failed to initialize camera'));
      }, 8000);

      const checkCamera = () => {
        const video = document.querySelector('video[data-aframe-canvas]') || 
                     document.querySelector('#ar-scene video') ||
                     document.querySelector('video');
        
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          clearTimeout(timeout);
          resolve(void 0);
        } else {
          setTimeout(checkCamera, 200);
        }
      };

      // Start checking after a brief delay
      setTimeout(checkCamera, 1000);
    });
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setArReady(false);
    
    // Clear the scene
    if (sceneRef.current) {
      sceneRef.current.innerHTML = '';
    }
    
    // Restart initialization
    setTimeout(() => {
      initializeAR();
    }, 500);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">AR Error</h2>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            
            <button
              onClick={onBack}
              className="w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h3 className="font-medium text-gray-900 mb-2">Troubleshooting:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Allow camera permissions</li>
              <li>• Use Chrome or Firefox</li>
              <li>• Ensure HTTPS connection</li>
              <li>• Check internet connection</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black bg-opacity-50 p-4">
        <div className="flex items-center justify-between text-white">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 bg-black bg-opacity-50 px-4 py-2 rounded-lg backdrop-blur-sm hover:bg-opacity-70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="text-center">
            <h1 className="font-bold">{experience.name}</h1>
            {experience.description && (
              <p className="text-sm text-gray-300">{experience.description}</p>
            )}
          </div>
          
          <div className="w-20" />
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-40">
          <div className="text-center text-white max-w-sm mx-auto px-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">{loadingStep}</p>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-300 mb-4">
              <Camera className="w-4 h-4" />
              <span>Please allow camera access when prompted</span>
            </div>
            
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-300 text-sm underline"
            >
              Go back to gallery
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isLoading && arReady && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-black bg-opacity-50 p-4">
          <div className="bg-black bg-opacity-50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3 text-white">
              <Eye className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium">Point your camera at the HIRO marker</p>
                <p className="text-sm text-gray-300">Download and print the HIRO marker from AR.js documentation</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AR Scene Container */}
      <div 
        ref={sceneRef}
        className="w-full h-full min-h-screen bg-black"
        style={{ 
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      />
    </div>
  );
}