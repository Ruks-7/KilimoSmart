import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Styling/CameraCapture.css';

const CameraCapture = ({ onCapture, onClose, maxPhotos = 5 }) => {
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [error, setError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Stop existing stream first
      stopCamera();

      // Request camera access
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
      } else {
        setError('Unable to access camera. Please check your device settings.');
      }
      
      setIsCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Start camera on mount and when facingMode changes
  useEffect(() => {
    startCamera();
    
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [facingMode, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || capturedPhotos.length >= maxPhotos) {
      return;
    }

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const photoUrl = URL.createObjectURL(blob);
        const photoFile = new File([blob], `product_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        setCapturedPhotos(prev => [...prev, {
          url: photoUrl,
          file: photoFile,
          timestamp: Date.now()
        }]);
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.95);
  };

  const removePhoto = (index) => {
    setCapturedPhotos(prev => {
      const newPhotos = [...prev];
      // Revoke object URL to free memory
      URL.revokeObjectURL(newPhotos[index].url);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleDone = () => {
    const photoFiles = capturedPhotos.map(photo => photo.file);
    onCapture(photoFiles);
    stopCamera();
    onClose();
  };

  const handleCancel = () => {
    // Clean up object URLs
    capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.url));
    stopCamera();
    onClose();
  };

  return (
    <div className="camera-capture-overlay">
      <div className="camera-capture-container">
        <div className="camera-header">
          <h3>📸 Take Product Photos</h3>
          <button 
            className="close-btn"
            onClick={handleCancel}
            aria-label="Close camera"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="camera-error">
            <p>⚠️ {error}</p>
            <button onClick={startCamera} className="retry-btn">
              🔄 Retry
            </button>
          </div>
        )}

        <div className="camera-content">
          <div className="camera-viewfinder">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera-video ${isCameraActive ? 'active' : ''}`}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {isCameraActive && (
              <>
                <div className="camera-overlay-frame"></div>
                <div className="camera-controls">
                  <button
                    className="camera-switch-btn"
                    onClick={switchCamera}
                    title="Switch camera"
                  >
                    🔄
                  </button>
                  <button
                    className={`camera-capture-btn ${isCapturing ? 'capturing' : ''}`}
                    onClick={capturePhoto}
                    disabled={isCapturing || capturedPhotos.length >= maxPhotos}
                  >
                    {isCapturing ? '⏳' : '📷'}
                  </button>
                  <div className="photo-counter">
                    {capturedPhotos.length}/{maxPhotos}
                  </div>
                </div>
              </>
            )}
          </div>

          {capturedPhotos.length > 0 && (
            <div className="captured-photos-preview">
              <h4>Captured Photos ({capturedPhotos.length})</h4>
              <div className="photos-grid">
                {capturedPhotos.map((photo, index) => (
                  <div key={photo.timestamp} className="photo-preview-item">
                    <img src={photo.url} alt={`Captured ${index + 1}`} />
                    <button
                      className="remove-photo-btn"
                      onClick={() => removePhoto(index)}
                      title="Remove photo"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="camera-footer">
          <button
            className="btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleDone}
            disabled={capturedPhotos.length === 0}
          >
            Done ({capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
