import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Slider, message, Checkbox, Dropdown, Menu } from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  DownloadOutlined,
  UndoOutlined,
  FileTextOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useLandmarkStore } from '@/stores/landmarkStore';
import LandmarkCanvas from '@/components/canvas/LandmarkCanvas';
import { dataAPI } from '@/services/api';
import { Landmark } from '@/types';

interface Props {
  onComplete: () => void;
}

const LandmarkCorrection: React.FC<Props> = ({ onComplete }) => {
  const [isAddingLandmark, setIsAddingLandmark] = useState(false);
  const [newLandmarkName, setNewLandmarkName] = useState('');
  const [originalLandmarks, setOriginalLandmarks] = useState<Landmark[]>([]);
  const [isNotesModalVisible, setIsNotesModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManageCustomModalVisible, setIsManageCustomModalVisible] = useState(false);
  const [editingLandmarkNames, setEditingLandmarkNames] = useState<{ [key: string]: string }>({});
  // Local state for smooth interactions
  const [localLandmarks, setLocalLandmarks] = useState<Landmark[]>([]);
  const [localLandmarkSize, setLocalLandmarkSize] = useState(5);
  const [showCustomLandmarks, setShowCustomLandmarks] = useState(true);
  const {
    landmarks,  // Keep this to copy from initially
    correctedLandmarks,
    currentImage,
    updateCorrectedLandmark,
    addCorrectedCustomLandmark,
    deleteCorrectedLandmark,
    setCorrectedLandmarks,
    setPage2Frozen,
    page2Frozen,
    setPage2Notes,
    page2Notes,
    setPage2Images,
    landmarkSize,
    setLandmarkSize,
    showLandmarkLabels,
    setShowLandmarkLabels,
    imageContrast,
    setImageContrast
  } = useLandmarkStore();
  const [notesText, setNotesText] = useState<string>(page2Notes || "");

  // Initialize corrected landmarks from original landmarks on first load
  useEffect(() => {
    if (correctedLandmarks.length === 0 && landmarks.length > 0) {
      // Copy landmarks to correctedLandmarks when first entering correction tab
      setCorrectedLandmarks(JSON.parse(JSON.stringify(landmarks)));
    }
  }, [landmarks, correctedLandmarks.length, setCorrectedLandmarks]);

  // Initialize local state from corrected landmarks
  useEffect(() => {
    setLocalLandmarks(correctedLandmarks);
  }, [correctedLandmarks]);

  useEffect(() => {
    setLocalLandmarkSize(landmarkSize);
  }, [landmarkSize]);

  // Sync local changes to store with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(localLandmarks) !== JSON.stringify(correctedLandmarks)) {
        setCorrectedLandmarks(localLandmarks);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [localLandmarks, correctedLandmarks, setCorrectedLandmarks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localLandmarkSize !== landmarkSize) {
        setLandmarkSize(localLandmarkSize);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [localLandmarkSize]);

  useEffect(() => {
    if (landmarks.length > 0 && originalLandmarks.length === 0) {
      setOriginalLandmarks(JSON.parse(JSON.stringify(landmarks)));
    }
  }, [landmarks]);

  const handleLandmarkMove = (id: string, x: number, y: number) => {
    // Update local state immediately for smooth interaction
    setLocalLandmarks(prev => prev.map(lm =>
      lm.id === id ? { ...lm, x: Math.round(x), y: Math.round(y) } : lm
    ));
  };

  const handleAddLandmark = () => setIsAddingLandmark(true);

  const handleSaveCustomLandmark = () => {
    if (!newLandmarkName) return message.error('Please enter a landmark name');
    if (!currentImage) return message.error('No image loaded');

    const newLandmark = {
      id: `custom_${Date.now()}`,
      name: newLandmarkName,
      x: currentImage.width / 2,
      y: currentImage.height / 2,
      visible: true,
      isCustom: true,
    };
    addCorrectedCustomLandmark(newLandmark);
    setNewLandmarkName('');
    setIsAddingLandmark(false);
    message.success(`Added custom landmark: ${newLandmarkName}`);
  };

  const handleManageCustomLandmarks = () => {
    const customLandmarks = correctedLandmarks.filter(l => l.isCustom);
    if (customLandmarks.length === 0) {
      return message.warning('No custom landmarks to manage');
    }

    const names: { [key: string]: string } = {};
    customLandmarks.forEach(l => {
      names[l.id] = l.name;
    });
    setEditingLandmarkNames(names);
    setIsManageCustomModalVisible(true);
  };

  const handleUpdateLandmarkName = (id: string, newName: string) => {
    setEditingLandmarkNames(prev => ({
      ...prev,
      [id]: newName
    }));
  };

  const handleSaveManageChanges = () => {
    Object.entries(editingLandmarkNames).forEach(([id, name]) => {
      const landmark = correctedLandmarks.find(l => l.id === id);
      if (landmark && landmark.name !== name) {
        updateCorrectedLandmark(id, { name });
      }
    });
    setIsManageCustomModalVisible(false);
    message.success('Custom landmarks updated');
  };

  const handleDeleteCustomLandmark = (id: string) => {
    const landmark = correctedLandmarks.find(l => l.id === id);
    if (landmark && window.confirm(`Delete landmark "${landmark.name}"?`)) {
      deleteCorrectedLandmark(id);
      message.success(`Deleted landmark: ${landmark.name}`);
    }
  };

  const handleReset = () => {
    if (originalLandmarks.length === 0) {
      return message.warning('No original positions to reset to');
    }
    const customLandmarks = correctedLandmarks.filter(l => l.isCustom);
    const resetStandard = originalLandmarks.filter(l => !l.isCustom);
    const resetLandmarks = [...resetStandard, ...customLandmarks];
    setCorrectedLandmarks(resetLandmarks);
    setLocalLandmarks(resetLandmarks);
    message.success('Landmark positions reset to original');
  };

  const dataURLtoFile = async (dataurl: string, filename: string) => {
    const res = await fetch(dataurl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  };

  const handleSaveToBackend = async () => {
    if (!currentImage || correctedLandmarks.length === 0) {
      return message.warning('No image or landmarks to save');
    }

    setIsSaving(true);
    try {
      const file = await dataURLtoFile(currentImage.url, 'image.png');

      const landmarksData = {
        landmarks: correctedLandmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
        }))
      };

      const originalLandmarksData = {
        landmarks: landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
        }))
      };

      const response = await dataAPI.saveCorrectedAnnotation(file, originalLandmarksData, landmarksData);
      message.success(response.message);

      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      message.error('Failed to save annotation to backend');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadOverlay = async () => {
    if (!currentImage?.url || correctedLandmarks.length === 0) {
      return message.warning('No image or landmarks to save');
    }

    try {
      const overlayImage = await generateOverlayImage(
        currentImage.url,
        landmarkSize * 2
      );
      if (overlayImage) {
        const link = document.createElement('a');
        link.href = overlayImage;
        link.download = `corrected_overlay_${Date.now()}.png`;
        link.click();
        message.success('Overlay image downloaded');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to generate overlay image');
    }
  };

  const handleDownloadCorrectedJSON = () => {
    if (correctedLandmarks.length === 0) {
      return message.warning('No landmarks to save');
    }

    const data = {
      timestamp: new Date().toISOString(),
      landmarks: correctedLandmarks.map(lm => ({
        title: lm.name,
        symbol: lm.id,
        value: { x: lm.x, y: lm.y },
        isCustom: lm.isCustom || false,
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corrected_landmarks_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Corrected landmarks downloaded');
  };

  const handleDownloadCustomJSON = () => {
    const customLandmarks = correctedLandmarks.filter(l => l.isCustom);

    if (customLandmarks.length === 0) {
      return message.warning('No custom landmarks to save');
    }

    const data = {
      timestamp: new Date().toISOString(),
      landmarks: customLandmarks.map(lm => ({
        title: lm.name,
        symbol: lm.id,
        value: { x: lm.x, y: lm.y },
        isCustom: true,
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_landmarks_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Custom landmarks downloaded');
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesText(e.target.value);
  };
  const showNotesModal = () => setIsNotesModalVisible(true);
  const handleNotesOk = () => setIsNotesModalVisible(false);
  const handleNotesCancel = () => setIsNotesModalVisible(false);

  useEffect(() => {
    setPage2Notes(notesText);
  }, [notesText, setPage2Notes]);

  const generateOverlayImage = async (imageUrl: string, size?: number): Promise<string | null> => {
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

        correctedLandmarks.forEach(lm => {
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
    const updateOverlayPage2 = async () => {
      if (!currentImage?.url || correctedLandmarks.length === 0) {
        setPage2Images(currentImage?.url ? [currentImage.url] : []);
        return;
      }
      try {
        const overlayImage = await generateOverlayImage(
          currentImage.url,
          landmarkSize * 2
        );
        if (overlayImage) {
          setPage2Images([overlayImage]);
        }
      } catch (err) {
        console.error("Failed to generate overlay image for page 2", err);
        setPage2Images(currentImage?.url ? [currentImage.url] : []);
      }
    };

    updateOverlayPage2();
  }, [currentImage, landmarks, landmarkSize, setPage2Images]);

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <div style={{
        width: '300px',
        background: 'rgba(255, 255, 240, 0.05)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <h3 style={{ color: '#FFFFF0', marginBottom: '8px', marginTop: "0px" }}>Landmark Correction</h3>
        <p style={{ fontSize: '14px', opacity: 0.8, color: '#FFFFF0', marginTop: '0' }}>
          Drag landmarks to adjust positions
        </p>

        <Button
          icon={<PlusOutlined />}
          onClick={handleAddLandmark}
          block
          size="large"
          className="depth-button"
        >
          Add Custom Landmark
        </Button>

        <Button
          onClick={handleManageCustomLandmarks}
          disabled={!correctedLandmarks.some(l => l.isCustom)}
          block
          size="large"
          className="depth-button-secondary"
        >
          Manage Custom Landmarks
        </Button>

        <div style={{
          background: 'rgba(255, 255, 240, 0.1)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <label style={{ color: '#FFFFF0', display: 'block', marginBottom: '8px' }}>
            Landmark Size: {localLandmarkSize}px
          </label>
          <Slider
            min={2}
            max={15}
            value={localLandmarkSize}
            onChange={setLocalLandmarkSize}
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

          <Checkbox
            checked={showCustomLandmarks}
            onChange={(e) => setShowCustomLandmarks(e.target.checked)}
            style={{ color: '#FFFFF0', marginTop: '8px' }}
          >
            <span style={{ color: '#FFFFF0' }}>Show Custom Landmarks</span>
          </Checkbox>
        </div>

        <Button
          icon={<UndoOutlined />}
          onClick={handleReset}
          block
          className="depth-button-secondary"
        >
          Reset Positions
        </Button>

        <Button
          icon={<SaveOutlined />}
          onClick={handleSaveToBackend}
          loading={isSaving}
          block
          className="depth-button"
        >
          Save to GCS ({correctedLandmarks.length === 0 ? '0' : 'Ready'})
        </Button>

        <Dropdown
          overlay={
            <Menu>
              <Menu.Item key="overlay" icon={<DownloadOutlined />} onClick={handleDownloadOverlay}>
                Download Overlay Image
              </Menu.Item>
              <Menu.Item key="corrected" icon={<DownloadOutlined />} onClick={handleDownloadCorrectedJSON}>
                Download Corrected JSON
              </Menu.Item>
              <Menu.Item
                key="custom"
                icon={<DownloadOutlined />}
                onClick={handleDownloadCustomJSON}
                disabled={!correctedLandmarks.some(l => l.isCustom)}
              >
                Download Custom JSON Only
              </Menu.Item>
            </Menu>
          }
          placement="bottomLeft"
        >
          <Button
            icon={<DownloadOutlined />}
            block
            className="depth-button-secondary"
          >
            Download Options
          </Button>
        </Dropdown>

        <Button
          icon={<FileTextOutlined />}
          onClick={showNotesModal}
          block
          className="depth-button-secondary">
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
            // Sync any pending changes before continuing
            setCorrectedLandmarks(localLandmarks);
            setLandmarkSize(localLandmarkSize);

            if (!page2Frozen && currentImage?.url) {
              const overlayImage2 = await generateOverlayImage(
                currentImage.url,
                landmarkSize * 2
              );
              if (overlayImage2) {
                setPage2Images([overlayImage2]);
                setPage2Frozen(true);
              }
            }
            onComplete();
          }}
          type="primary"
          block
          size="large"
          style={{
            marginTop: 'auto',
            backgroundColor: '#FFFFF0',
            color: '#000000',
            border: 'none',
            fontWeight: 'bold'
          }}
        >
          Continue to Manual Analysis →
        </Button>
      </div>

      <div style={{
        flex: 1,
        background: 'rgba(255, 255, 240, 0.05)',
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {currentImage && (
          <TransformWrapper
            initialScale={1.2}
            minScale={0.5}
            maxScale={10}
            // Force hardware acceleration and smooth rendering
            panning={{ velocityDisabled: true }}
            wheel={{ smoothStep: 0.005 }}
          >
            {({ zoomIn, zoomOut }) => (
                <>
                  <div style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    zIndex: 10,
                    display: "flex",
                    gap: "8px"
                  }}>
                    <Button
                      icon={<ZoomInOutlined />}
                      onClick={() => zoomIn()}
                      style={{
                        backgroundColor: "rgba(255,255,240,0.1)",
                        color: "#FFFFF0",
                        borderColor: "#FFFFF0"
                      }}
                    />
                    <Button
                      icon={<ZoomOutOutlined />}
                      onClick={() => zoomOut()}
                      style={{
                        backgroundColor: "rgba(255,255,240,0.1)",
                        color: "#FFFFF0",
                        borderColor: "#FFFFF0"
                      }}
                    />
                  </div>
                <TransformComponent
                  wrapperStyle={{
                    width: '100%',
                    height: '100%',
                    // Force GPU acceleration
                    willChange: 'transform'
                  }}
                  contentStyle={{
                    // Improve rendering performance
                    willChange: 'transform'
                  }}
                >
                  <LandmarkCanvas
                    imageUrl={currentImage.url}
                    landmarks={localLandmarks}
                    landmarkSize={localLandmarkSize}
                    editable={true}
                    showLandmarkLabels={showLandmarkLabels}
                    showCustomLandmarks={showCustomLandmarks}
                    onLandmarkMove={handleLandmarkMove}
                    onLandmarkRemove={(id) => deleteCorrectedLandmark(id)}
                    showControls={true}
                    zoomControls={{ zoomIn, zoomOut }}
                    imageContrast={imageContrast}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>

      <Modal
        title="Add Custom Landmark"
        open={isAddingLandmark}
        onOk={handleSaveCustomLandmark}
        onCancel={() => {
          setIsAddingLandmark(false);
          setNewLandmarkName('');
        }}
        okText="Add Landmark"
        cancelText="Cancel"
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
        <Input
          placeholder="Enter landmark name (e.g., 'Star')"
          value={newLandmarkName}
          onChange={(e) => setNewLandmarkName(e.target.value)}
          style={{
            backgroundColor: '#FFFFFF',
            color: '#000000'
          }}
          onPressEnter={handleSaveCustomLandmark}
        />
      </Modal>

      <Modal
        title="Manage Custom Landmarks"
        open={isManageCustomModalVisible}
        onOk={handleSaveManageChanges}
        onCancel={() => setIsManageCustomModalVisible(false)}
        okText="Save Changes"
        cancelText="Cancel"
        width={600}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
          {correctedLandmarks.filter(l => l.isCustom).map(landmark => (
            <div key={landmark.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '8px'
            }}>
              <Input
                value={editingLandmarkNames[landmark.id] || landmark.name}
                onChange={(e) => handleUpdateLandmarkName(landmark.id, e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  color: '#000000'
                }}
              />
              <Button
                danger
                icon={<span style={{ fontSize: '18px' }}>🗑️</span>}
                onClick={() => handleDeleteCustomLandmark(landmark.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            </div>
          ))}
          {correctedLandmarks.filter(l => l.isCustom).length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#999'
            }}>
              No custom landmarks created yet
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default LandmarkCorrection;
