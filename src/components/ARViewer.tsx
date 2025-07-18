import React, { useEffect, useRef, useState } from 'react';
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
  const mindarContainerRef = useRef<HTMLDivElement>(null);
  const mindarInstanceRef = useRef<any>(null);

  // Helper to load external scripts/styles
  const loadScript = (src: string) => {
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  };
  const loadStyle = (href: string) => {
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector(`link[href="${href}"]`)) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load style: ${href}`));
      document.head.appendChild(link);
    });
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setArReady(false);
    setLoadingStep('Initializing AR...');
    if (!experience.marker_image_url) {
      setError('No marker image found for this experience.');
      setIsLoading(false);
      return;
    }

    let mindar;
    let renderer, scene, camera, anchor;
    let videoTexture, videoMesh, modelLoader, model;
    let animationId: number;

    const initializeMindAR = async () => {
      try {
        setLoadingStep('Loading MindAR libraries...');
        await loadStyle('https://cdn.jsdelivr.net/npm/mind-ar@1.2.4/dist/mindar-image.prod.css');
        await loadScript('https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/mind-ar@1.2.4/dist/mindar-image.prod.js');

        setLoadingStep('Setting up AR scene...');
        // @ts-ignore
        const { MindARThree } = window['MINDAR'];
        // @ts-ignore
        const THREE = window['THREE'];
        if (!MindARThree || !THREE) throw new Error('MindAR or THREE not loaded');

        // Download marker image and convert to blob for MindAR
        setLoadingStep('Downloading marker...');
        const markerRes = await fetch(experience.marker_image_url);
        const markerBlob = await markerRes.blob();
        const markerArrayBuffer = await markerBlob.arrayBuffer();
        const markerFile = new File([markerArrayBuffer], 'marker.mind', { type: 'application/octet-stream' });

        // Setup MindAR
        mindar = new MindARThree({
          container: mindarContainerRef.current,
          imageTargetSrc: markerFile,
          maxTrack: 1,
        });
        mindarInstanceRef.current = mindar;
        ({ renderer, scene, camera } = mindar);
        anchor = mindar.addAnchor(0);

        // Add AR content
        if (experience.content_type === 'video') {
          setLoadingStep('Loading video...');
          const video = document.createElement('video');
          video.src = experience.content_url;
          video.crossOrigin = 'anonymous';
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          await video.play().catch(() => {});
          videoTexture = new THREE.VideoTexture(video);
          videoMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 0.9),
            new THREE.MeshBasicMaterial({ map: videoTexture })
          );
          anchor.group.add(videoMesh);
        } else if (experience.content_type === 'model') {
          setLoadingStep('Loading 3D model...');
          await loadScript('https://cdn.jsdelivr.net/npm/three@0.152.2/examples/js/loaders/GLTFLoader.js');
          // @ts-ignore
          modelLoader = new window['THREE'].GLTFLoader();
          await new Promise<void>((resolve, reject) => {
            modelLoader.load(
              experience.content_url,
              (gltf: any) => {
                model = gltf.scene;
                model.scale.set(1, 1, 1);
                anchor.group.add(model);
                resolve();
              },
              undefined,
              (err: any) => reject(err)
            );
          });
        }

        setLoadingStep('Starting camera...');
        await mindar.start();
        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
        setArReady(true);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize MindAR');
        setIsLoading(false);
      }
    };

    initializeMindAR();

    return () => {
      setIsLoading(false);
      setArReady(false);
      setError(null);
      if (mindarInstanceRef.current) {
        mindarInstanceRef.current.stop();
        mindarInstanceRef.current = null;
      }
      if (animationId) cancelAnimationFrame(animationId);
      if (mindarContainerRef.current) mindarContainerRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">AR Error</h2>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <div className="space-y-3">
            <button
              onClick={onBack}
              className="w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
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
                <p className="font-medium">Point your camera at your uploaded marker image</p>
                <p className="text-sm text-gray-300">Make sure the marker is well-lit and visible</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MindAR Container */}
      <div
        ref={mindarContainerRef}
        className="w-full h-full min-h-screen bg-black"
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}