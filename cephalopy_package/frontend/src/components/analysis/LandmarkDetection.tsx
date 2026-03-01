import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Slider, Modal, message, Checkbox } from 'antd';
import {
  UploadOutlined,
  ScanOutlined,
  SaveOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useLandmarkStore } from '@/stores/landmarkStore';
import { landmarkAPI, dataAPI, modelAPI } from '@/services/api';
import LandmarkCanvas from '@/components/canvas/LandmarkCanvas';

interface Props {
  onComplete: () => void;
}

const LandmarkDetection: React.FC<Props> = ({ onComplete }) => {
  const {
    setLandmarks,
    setCurrentImage,
    landmarks,
    currentImage,
    page1Frozen,
    setPage1Frozen,
    setPage1Notes,
    page1Notes,
    setPage1Images,
    landmarkSize,
    setLandmarkSize,
    showLandmarkLabels,
    setShowLandmarkLabels,
    fileName,
    setFileName,
    imageContrast,
    setImageContrast
  } = useLandmarkStore();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(currentImage?.url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOverlay, setShowOverlay] = useState(landmarks.length > 0);
  const [notesText, setNotesText] = useState<string>(page1Notes || "");
  const [isNotesModalVisible, setIsNotesModalVisible] = useState(false);
  const [imageCount, setImageCount] = useState<number>(0);
  const [activeModel, setActiveModel] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch current image count and active model on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const countResponse = await dataAPI.getDataCount();
        setImageCount(countResponse.count);

        const modelData = await modelAPI.getActiveModel();
        setActiveModel(modelData.active_model || 'Unknown');
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (currentImage && !imageUrl) {
      setImageUrl(currentImage.url);
      setShowOverlay(landmarks.length > 0);
    }
  }, [currentImage, landmarks.length]);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    setLandmarks([]);
    setShowOverlay(false);

    const img = new Image();
    img.onload = () => {
      setCurrentImage({
        id: Date.now().toString(),
        url,
        width: img.width,
        height: img.height,
      });
    };
    img.src = url;

    return false;
  };

  const handlePredict = async () => {
    if (!imageFile && !imageUrl) {
      message.error('Please upload an image first');
      return;
    }

    // If we have an image URL but no file (switched tabs), create a file from the image
    let fileToUse = imageFile;

    if (!fileToUse && imageUrl) {
      setIsLoading(true);
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        fileToUse = new File([blob], 'image.png', { type: blob.type });
        setImageFile(fileToUse);
      } catch (error) {
        message.error('Failed to process the image. Please re-upload.');
        setIsLoading(false);
        return;
      }
    }

    if (!fileToUse) {
      message.error('No valid image found. Please upload an image.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await landmarkAPI.predictLandmarks(fileToUse);

      const transformedLandmarks = response.landmarks.map((lm: any) => ({
        id: lm.symbol,
        name: lm.symbol,
        x: lm.value.x,
        y: lm.value.y,
        visible: true,
        isCustom: false,
      }));

      setLandmarks(transformedLandmarks);
      setShowOverlay(true);
      message.success('Landmarks detected successfully!');
    } catch (error) {
      message.error('Failed to detect landmarks. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePredictionToGCS = async () => {
    if (!imageFile || landmarks.length === 0) {
      // Try to create file from URL if needed
      if (imageUrl && landmarks.length > 0) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const fileToUse = new File([blob], 'image.png', { type: blob.type });
          setImageFile(fileToUse);

          // Now proceed with saving
          await savePrediction(fileToUse);
        } catch (error) {
          message.error('Failed to process the image for saving.');
        }
        return;
      }
      message.warning('No image or landmarks to save');
      return;
    }

    await savePrediction(imageFile);
  };

  const savePrediction = async (file: File) => {
    setIsSaving(true);
    try {
      const landmarksData = {
        landmarks: landmarks.map(lm => ({
          symbol: lm.id,
          value: {
            x: lm.x,
            y: lm.y,
          }
        }))
      };

      const response = await dataAPI.savePredictionAsIs(file, landmarksData);
      setImageCount(response.total_images);
      message.success(`Saved! ${response.total_images}/50 images collected`);
    } catch (error: any) {
      console.error('Failed to save prediction:', error);
      message.error(error.response?.data?.detail || 'Failed to save prediction to GCS');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      landmarks: landmarks.map(lm => ({
        title: lm.name,
        symbol: lm.id,
        value: { x: lm.x, y: lm.y }
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'landmarks.json';
    a.click();
    URL.revokeObjectURL(url);
    message.success('Landmarks saved as JSON');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesText(e.target.value);
  };

  const showNotesModal = () => setIsNotesModalVisible(true);
  const handleNotesOk = () => setIsNotesModalVisible(false);
  const handleNotesCancel = () => setIsNotesModalVisible(false);

  useEffect(() => {
    setPage1Notes(notesText);
  }, [notesText, setPage1Notes]);

  const generateOverlayImage = async (size?: number): Promise<string | null> => {
    const drawSize = size ?? landmarkSize;
    if (!imageUrl) return null;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Cannot get canvas context");

        ctx.drawImage(img, 0, 0);

        landmarks.forEach(lm => {
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.arc(lm.x, lm.y, drawSize, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "yellow";
          ctx.font = `${drawSize * 2}px Arial`;
          ctx.textBaseline = "top";
          ctx.fillText(lm.name, lm.x + drawSize + 2, lm.y - drawSize);
        });

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = reject;
    });
  };

  useEffect(() => {
    const updateOverlay = async () => {
      if (page1Frozen) return;
      if (!imageUrl || landmarks.length === 0) {
        setPage1Images(imageUrl ? [imageUrl] : []);
        return;
      }
      try {
        const overlayImage = await generateOverlayImage(landmarkSize * 2);
        if (overlayImage) {
          setPage1Images([overlayImage]);
        }
      } catch (err) {
        console.error("Failed to generate overlay image", err);
        setPage1Images(imageUrl ? [imageUrl] : []);
      }
    };

    updateOverlay();
  }, [imageUrl, landmarks, landmarkSize, setPage1Images, page1Frozen]);

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <div style={{
        width: '300px',
        background: 'rgba(255, 255, 240, 0.05)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {activeModel && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.2) 0%, rgba(82, 196, 26, 0.1) 100%)',
            border: '1px solid rgba(82, 196, 26, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 240, 0.6)',
              marginBottom: '4px'
            }}>
              ACTIVE MODEL
            </div>
            <div style={{
              fontSize: '14px',
              color: '#52c41a',
              fontWeight: '600'
            }}>
              ✓ {activeModel}
            </div>
          </div>
        )}

        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={handleImageUpload}
        >
          <Button
            icon={<UploadOutlined />}
            block
            size="large"
            className="depth-button"
          >
            Upload Image
          </Button>
        </Upload>

        {fileName && (
          <div style={{
            background: 'rgba(255, 255, 240, 0.08)',
            border: '1px solid rgba(255, 255, 240, 0.2)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '13px',
            color: 'rgba(255, 255, 240, 0.8)',
            wordBreak: 'break-all',
            textAlign: 'center'
          }}>
            📄 {fileName}
          </div>
        )}

        <Button
          icon={<ScanOutlined />}
          onClick={handlePredict}
          disabled={!imageUrl || isLoading}
          loading={isLoading}
          block
          size="large"
          className="depth-button"
        >
          Detect Landmarks
        </Button>

        {landmarks.length > 0 && (
          <Button
            icon={<CloudUploadOutlined />}
            onClick={handleSavePredictionToGCS}
            loading={isSaving}
            block
            size="large"
            type="primary"
            style={{
              backgroundColor: '#52c41a',
              borderColor: '#52c41a',
              fontWeight: 'bold'
            }}
          >
            ✓ Save Prediction ({imageCount}/50)
          </Button>
        )}

        <div style={{
          background: 'rgba(255, 255, 240, 0.1)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <label style={{ color: '#FFFFF0', display: 'block', marginBottom: '8px' }}>
            Landmark Size: {landmarkSize}px
          </label>
          <Slider
            min={2}
            max={15}
            value={landmarkSize}
            onChange={setLandmarkSize}
            style={{ margin: '8px 0' }}
          />

          <label style={{
            color: '#FFFFF0',
            display: 'block',
            marginBottom: '8px',
            marginTop: '16px'
          }}>
            Contrast: {imageContrast}%
          </label>
          <Slider
            min={0}
            max={200}
            value={imageContrast}
            onChange={setImageContrast}
            style={{ margin: '8px 0' }}
            marks={{
              0: { style: { color: '#FFFFF0' }, label: '0%' },
              100: { style: { color: '#FFFFF0' }, label: '100%' },
              200: { style: { color: '#FFFFF0' }, label: '200%' }
            }}
          />

          <Checkbox
            checked={showLandmarkLabels}
            onChange={(e) => setShowLandmarkLabels(e.target.checked)}
            style={{ color: '#FFFFF0', marginTop: '12px' }}
          >
            <span style={{ color: '#FFFFF0' }}>Show Labels</span>
          </Checkbox>
        </div>

        <Button
          icon={<SaveOutlined />}
          onClick={handleSaveJSON}
          disabled={landmarks.length === 0}
          block
          className="depth-button-secondary"
        >
          Save as JSON
        </Button>

        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            const saveButton = document.querySelector('[data-save-landmarks-btn]');
            if (saveButton) {
              (saveButton as HTMLElement).click();
            }
          }}
          disabled={!showOverlay}
          block
          className="depth-button-secondary"
        >
          Save Overlay
        </Button>

        <Button
          icon={<FileTextOutlined />}
          onClick={showNotesModal}
          block
          className="depth-button-secondary"
        >
          Add Notes
        </Button>

        {notesText && !isNotesModalVisible && (
          <div className="notes-bubble">
            <div className="notes-arrow-border"/>
            <div className="notes-arrow"/>
            <div style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowY: "auto",
              height: "100%",
              maxHeight: "130px"
            }}>
              {notesText}
            </div>
          </div>
        )}

        <Modal
          title="Add Notes"
          open={isNotesModalVisible}
          onOk={handleNotesOk}
          onCancel={handleNotesCancel}
          okButtonProps={{
            style: {
              backgroundColor: '#09185B',
              color: '#FFFFF0',
              border: 'none'
            }
          }}
          cancelButtonProps={{
            style: {
              backgroundColor: '#f0f0f0',
              color: '#000000',
              border: '1px solid #d9d9d9'
            }
          }}
        >
          <div
            style={{
              background: "rgb(4 21 109 / 75%)",
              display: "block",
              marginBottom: "4px",
              padding: "16px",
              borderRadius: "8px",
            }}
          >
            <label
              htmlFor="Notes_field1"
              style={{
                color: "#FFFFF0",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Notes
            </label>
            <textarea
              id="Notes_field1"
              value={notesText}
              onChange={handleNotesChange}
              placeholder="Type something..."
              className="border p-2 rounded"
              style={{
                background: 'rgba(0, 0, 0, 0.1)',
                color: '#FFFFF0',
                border: "2px solid rgba(255, 255, 240, 0.1)",
                width: "100%",
                height: "20vh"
              }}
            />
          </div>
        </Modal>

        <Button
          onClick={async () => {
            if (!page1Frozen) {
              const overlayImage = await generateOverlayImage(landmarkSize * 2);
              if (overlayImage) {
                setPage1Images([overlayImage]);
                setPage1Frozen(true);
              }
            }
            onComplete();
          }}
          disabled={landmarks.length === 0}
          type="primary"
          block
          size="large"
          style={{
            marginTop: '8px'
          }}
        >
          Continue to Correction →
        </Button>
      </div>

      <div
        ref={canvasRef}
        style={{
          flex: 1,
          background: 'rgba(255, 255, 240, 0.05)',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {imageUrl ? (
          <>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={10}
              centerOnInit={true}
            >
              {({ zoomIn, zoomOut}) => (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    zIndex: 10,
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <Button
                      icon={<ZoomInOutlined />}
                      onClick={() => zoomIn()}
                      style={{ backgroundColor: 'rgba(255,255,240,0.1)', color: '#FFFFF0', borderColor: '#FFFFF0' }}
                    />
                    <Button
                      icon={<ZoomOutOutlined />}
                      onClick={() => zoomOut()}
                      style={{ backgroundColor: 'rgba(255,255,240,0.1)', color: '#FFFFF0', borderColor: '#FFFFF0' }}
                    />
                    <Button
                      icon={<FullscreenOutlined />}
                      onClick={toggleFullscreen}
                      style={{ backgroundColor: 'rgba(255,255,240,0.1)', color: '#FFFFF0', borderColor: '#FFFFF0' }}
                    />
                  </div>

                  <TransformComponent
                    wrapperStyle={{
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <LandmarkCanvas
                      imageUrl={imageUrl}
                      landmarks={showOverlay ? landmarks : []}
                      landmarkSize={landmarkSize}
                      editable={false}
                      showLandmarkLabels={showLandmarkLabels}
                      showControls={showOverlay}
                      imageContrast={imageContrast}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </>
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 240, 0.5)',
            fontSize: '18px'
          }}>
            Upload an image to begin
          </div>
        )}
      </div>
    </div>
  );
};

export default LandmarkDetection;
