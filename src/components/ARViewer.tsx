import React from 'react';
import type { ARExperience } from '../types';

interface ARViewerProps {
  experience: ARExperience;
  onBack: () => void;
}

export default function ARViewer({ experience, onBack }: ARViewerProps) {
  // Use MindAR A-Frame integration for maximum reliability
  // Use experience.marker_image_url and experience.content_url
  const markerUrl = experience.marker_image_url;
  const isModel = experience.content_type === 'model';
  const contentUrl = experience.content_url;

  // Generate the AR HTML as a string
  const arHtml = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
      </head>
      <body style="margin:0;overflow:hidden;">
        <a-scene mindar-image="imageTargetSrc: ${markerUrl};" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false" style="width:100vw;height:100vh;">
          <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
          <a-entity mindar-image-target="targetIndex: 0">
            ${isModel
              ? `<a-gltf-model src='${contentUrl}' scale="1 1 1" position="0 0 0"></a-gltf-model>`
              : `<a-video src='${contentUrl}' width="1.6" height="0.9" position="0 0 0"></a-video>`
            }
          </a-entity>
        </a-scene>
      </body>
    </html>
  `;

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black', position: 'relative' }}>
      <button
        onClick={onBack}
        style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
      >
        ← Back
      </button>
      <iframe
        title="AR Experience"
        srcDoc={arHtml}
        style={{ width: '100vw', height: '100vh', border: 'none' }}
        allow="camera; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}