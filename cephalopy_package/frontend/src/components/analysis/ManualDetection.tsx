import React, { useState, useRef, useEffect } from 'react';
import { Button, Slider, Modal, Checkbox, message, Table, Radio, InputNumber } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useLandmarkStore } from '@/stores/landmarkStore';
import { Landmark } from '@/types';

interface Props {
  onComplete: () => void;
}

const ManualDetection: React.FC<Props> = ({ onComplete }) => {
  const {
    correctedLandmarks,
    currentImage,
    landmarkSize,
    setLandmarkSize,
    showLandmarkLabels,
    setShowLandmarkLabels,
    manualLandmarks,
    addManualLandmark,
    updateManualLandmark,
    deleteManualLandmark,
    mmPerPixel,
    setMmPerPixel,
    setManualNotes,
    manualNotes,
    setManualImages,
    setComparisonNotes,
    comparisonNotes,
    setComparisonImages,
    setCompMeasures,
    imageContrast,
    setImageContrast
  } = useLandmarkStore();

  const [isPlacingLandmark, setIsPlacingLandmark] = useState<string | null>(null);
  const [draggedLandmark, setDraggedLandmark] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'superimposed'>('side-by-side');
  const [mmThreshold, setMmThreshold] = useState<number>(2);

  // Notes state
  const [manualNotesText, setManualNotesText] = useState<string>(manualNotes || "");
  const [isManNotesModalVisible, setIsManNotesModalVisible] = useState(false);
  const [compNotesText, setCompNotesText] = useState<string>(comparisonNotes || "");
  const [isCompNotesModalVisible, setIsCompNotesModalVisible] = useState(false);

  const imageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Simplified coordinate calculation without complex transform parsing
  const getImageCoordinates = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current || !currentImage) return null;

    const rect = svgRef.current.getBoundingClientRect();
    const img = imageRef.current?.querySelector('img');
    if (!img) return null;

    // Simple coordinate calculation - let the browser handle transforms
    const x = ((e.clientX - rect.left) / rect.width) * currentImage.width;
    const y = ((e.clientY - rect.top) / rect.height) * currentImage.height;

    return {
      x: Math.round(Math.max(0, Math.min(currentImage.width, x))),
      y: Math.round(Math.max(0, Math.min(currentImage.height, y)))
    };
  };

  const handlePlaceLandmark = (landmarkName: string) => {
    setIsPlacingLandmark(landmarkName);
    message.info(`Click on the image to place: ${landmarkName}. Click "Cancel" to abort.`);
  };

  const handleCancelPlacement = () => {
    setIsPlacingLandmark(null);
    message.info('Placement cancelled');
  };

  const handleDeleteLandmark = (landmarkName: string) => {
    const landmark = manualLandmarks.find(lm => lm.name === landmarkName);
    if (landmark) {
      deleteManualLandmark(landmark.id);
      message.success(`Deleted: ${landmarkName}`);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!isPlacingLandmark) return;

    const coords = getImageCoordinates(e);
    if (!coords) return;

    const newLandmark: Landmark = {
      id: `manual_${isPlacingLandmark}`,
      name: isPlacingLandmark,
      x: coords.x,
      y: coords.y,
      visible: true,
      isCustom: false,
    };

    addManualLandmark(newLandmark);
    message.success(`Placed: ${isPlacingLandmark}`);
    setIsPlacingLandmark(null);
  };

  const handleLandmarkMouseDown = (landmarkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggedLandmark(landmarkId);
  };

  // Simplified drag handling without direct DOM manipulation
  useEffect(() => {
    if (!draggedLandmark) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const coords = getImageCoordinates(e);
      if (!coords || !currentImage) return;

      // Update state directly - let React handle the rendering
      updateManualLandmark(draggedLandmark, { x: coords.x, y: coords.y });
    };

    const handleGlobalMouseUp = () => {
      setDraggedLandmark(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedLandmark, currentImage, updateManualLandmark]);

  // Notes handlers
  const handleManNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualNotesText(e.target.value);
  };
  const handleCompNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCompNotesText(e.target.value);
  };
  const showManNotesModal = () => setIsManNotesModalVisible(true);
  const handleManNotesOk = () => setIsManNotesModalVisible(false);
  const handleManNotesCancel = () => setIsManNotesModalVisible(false);
  const showCompNotesModal = () => setIsCompNotesModalVisible(true);
  const handleCompNotesOk = () => setIsCompNotesModalVisible(false);
  const handleCompNotesCancel = () => setIsCompNotesModalVisible(false);

  useEffect(() => {
    setManualNotes(manualNotesText);
  }, [manualNotesText, setManualNotes]);

  useEffect(() => {
    setComparisonNotes(compNotesText);
  }, [compNotesText, setComparisonNotes]);

  useEffect(() => {
    const comparisonData = getComparisonData();
    if (comparisonData.length > 0 && setCompMeasures) {
      const metricsTable = [
        ['Landmark', 'Manual X', 'Manual Y', 'Corrected X', 'Corrected Y', 'Difference (px)', 'Difference (mm)']
      ];

      comparisonData.forEach(row => {
        metricsTable.push([
          row.landmark,
          row.manualX,
          row.manualY,
          row.correctedX,
          row.correctedY,
          row.pxDifference,
          row.mmDifference
        ]);
      });

      setCompMeasures(metricsTable);
    }
  }, [manualLandmarks, correctedLandmarks, mmPerPixel, setCompMeasures]);

  // Image generation functions
  const generateManualOverlay = async (
    imageSrc: string, size?: number
  ): Promise<string | null> => {
    const drawSize = size ?? landmarkSize;
    if (!imageSrc) return null;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Cannot get canvas context");

        ctx.drawImage(img, 0, 0);

        manualLandmarks.forEach(lm => {
          ctx.fillStyle = '#0099FF';
          ctx.beginPath();
          ctx.arc(lm.x, lm.y, drawSize, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = `${drawSize * 2}px Arial`;
          ctx.textBaseline = "top";
          ctx.fillText(lm.name, lm.x + drawSize + 2, lm.y - drawSize);
        });

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = reject;
    });
  };

  const generateCorrectedOverlay = async (
    imageSrc: string, size?: number
  ): Promise<string | null> => {
    const drawSize = size ?? landmarkSize;
    if (!imageSrc) return null;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Cannot get canvas context");

        ctx.drawImage(img, 0, 0);

        correctedLandmarks.filter(l => !l.isCustom).forEach(lm => {
          ctx.fillStyle = "#FF0000";
          ctx.beginPath();
          ctx.arc(lm.x, lm.y, drawSize, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#FFFFFF";
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
    const updateManualOverlay = async () => {
      if (!currentImage?.url || manualLandmarks.length === 0) {
        setManualImages(currentImage?.url ? [currentImage.url] : []);
        return;
      }
      try {
        const overlayImage = await generateManualOverlay(
          currentImage.url, landmarkSize * 2
        );
        if (overlayImage) {
          setManualImages([overlayImage]);
        }
      } catch (err) {
        console.error("Failed to generate manual overlay", err);
        setManualImages(currentImage?.url ? [currentImage.url] : []);
      }
    };

    updateManualOverlay();
  }, [currentImage, manualLandmarks, landmarkSize, setManualImages]);

  useEffect(() => {
    const updateComparisonOverlays = async () => {
      if (!currentImage?.url) {
        setComparisonImages([]);
        return;
      }

      try {
        const images: string[] = [];

        if (manualLandmarks.length > 0) {
          const manualOverlay = await generateManualOverlay(
            currentImage.url, landmarkSize * 2
          );
          if (manualOverlay) {
            images.push(manualOverlay);
          }
        }

        if (correctedLandmarks.filter(l => !l.isCustom).length > 0) {
          const correctedOverlay = await generateCorrectedOverlay(
            currentImage.url, landmarkSize * 2
          );
          if (correctedOverlay) {
            images.push(correctedOverlay);
          }
        }

        setComparisonImages(images.length > 0 ? images : [currentImage.url]);
      } catch (err) {
        console.error("Failed to generate comparison overlays", err);
        setComparisonImages([currentImage.url]);
      }
    };

    updateComparisonOverlays();
  }, [currentImage, manualLandmarks, correctedLandmarks, landmarkSize, setComparisonImages]);

  // Simplified landmark rendering without complex scaling calculations
  const renderLandmarks = (landmarks: Landmark[], color: string, isInteractive: boolean = true) => {
    if (!currentImage || !imageRef.current) return null;

    return (
      <svg
        ref={isInteractive ? svgRef : undefined}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: isInteractive ? 'all' : 'none'
        }}
        viewBox={`0 0 ${currentImage.width} ${currentImage.height}`}
        preserveAspectRatio="none"
        onClick={isInteractive ? handleImageClick : undefined}
      >
        {landmarks.map(landmark => (
          <g key={landmark.id}>
            <circle
              cx={landmark.x}
              cy={landmark.y}
              r={landmarkSize * 2} // Scale up for viewBox
              fill={color}
              stroke="#FFFFFF"
              strokeWidth={2}
              opacity={0.9}
              style={{
                cursor: isInteractive && draggedLandmark === landmark.id ? 'grabbing' : (isInteractive ? 'grab' : 'default'),
                pointerEvents: isInteractive ? 'all' : 'none'
              }}
              onMouseDown={isInteractive ? (e) => handleLandmarkMouseDown(landmark.id, e) : undefined}
            />
            {showLandmarkLabels && (
              <text
                x={landmark.x + landmarkSize * 2 + 5}
                y={landmark.y - 5}
                fill="#FFFFFF"
                fontSize={landmarkSize * 3} // Scale for viewBox
                fontWeight="bold"
                style={{
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              >
                {landmark.name}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  // Simplified comparison image renderer
  const renderComparisonImage = (title: string, landmarksToRender: Landmark[], color: string) => {
    if (!currentImage) return null;

    return (
      <div style={{ flex: 1 }}>
        <h4 style={{ color: '#FFFFFF', textAlign: 'center', marginBottom: '8px' }}>
          {title}
        </h4>
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          height: '400px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <TransformWrapper
            initialScale={0.6}
            minScale={0.2}
            maxScale={10}
            centerOnInit={true}
            doubleClick={{ disabled: true }}
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
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <img
                    src={currentImage.url}
                    alt={title}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      filter: `contrast(${imageContrast}%)`,
                      transition: 'filter 0.2s ease'
                    }}
                  />
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                    viewBox={`0 0 ${currentImage.width} ${currentImage.height}`}
                    preserveAspectRatio="none"
                  >
                    {landmarksToRender.map(landmark => (
                      <g key={`comp-${landmark.id}`}>
                        <circle
                          cx={landmark.x}
                          cy={landmark.y}
                          r={landmarkSize * 4}
                          fill={color}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          opacity={0.9}
                        />
                        {showLandmarkLabels && (
                          <text
                            x={landmark.x + landmarkSize * 4 + 5}
                            y={landmark.y - 5}
                            fill="#FFFFFF"
                            fontSize={landmarkSize * 5}
                            fontWeight="bold"
                            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                          >
                            {landmark.name}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
              </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
    );
  };

  // Define all 19 required landmarks
  const requiredLandmarks = [
    'S', 'N', 'A', 'B', 'Pog', 'Go', 'Gn', 'Me', 'ANS', 'PNS',
    'Or', 'Po', 'Ar', 'LIT', 'UIT', 'Ls', 'Li', 'Sn', 'Pos'
  ];

  const availableLandmarks = correctedLandmarks.length > 0
    ? correctedLandmarks.filter(lm => !lm.isCustom)
    : requiredLandmarks.map(name => ({
        id: name,
        name,
        x: 0,
        y: 0,
        visible: true,
        isCustom: false
      }));

  const allLandmarksPlaced = requiredLandmarks.every(name =>
    manualLandmarks.some(lm => lm.name === name)
  );

  const handleSaveAnnotations = () => {
    if (!allLandmarksPlaced) {
      message.warning('Please place all 19 landmarks before saving');
      return;
    }

    const landmarkOrder = [
      'A', 'ANS', 'B', 'Me', 'N', 'Or', 'Pog', 'PNS', 'S',
      'Ar', 'Gn', 'Go', 'Po', 'LIT', 'UIT', 'Li', 'Ls', 'Pos', 'Sn'
    ];

    const data = {
      timestamp: new Date().toISOString(),
      landmarks: landmarkOrder
        .map(name => manualLandmarks.find(lm => lm.name === name))
        .filter(lm => lm !== undefined)
        .map(lm => ({
          title: lm!.name,
          symbol: lm!.name,
          value: {
            x: lm!.x,
            y: lm!.y
          },
          isCustom: false
        }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `landmarks_annotation_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Annotations saved successfully');
  };

  const getComparisonData = () => {
    const data: any[] = [];
    const landmarkNames = new Set([
      ...manualLandmarks.map(l => l.name),
      ...correctedLandmarks.filter(l => !l.isCustom).map(l => l.name)
    ]);

    landmarkNames.forEach(name => {
      const manual = manualLandmarks.find(l => l.name === name);
      const corrected = correctedLandmarks.find(l => l.name === name && !l.isCustom);

      if (manual || corrected) {
        const pxDiff = manual && corrected
          ? Math.sqrt(Math.pow(manual.x - corrected.x, 2) + Math.pow(manual.y - corrected.y, 2))
          : null;

        const mmDiff = pxDiff !== null ? pxDiff * mmPerPixel : null;

        data.push({
          key: name,
          landmark: name,
          manualX: manual ? manual.x.toFixed(0) : '-',
          manualY: manual ? manual.y.toFixed(0) : '-',
          correctedX: corrected ? corrected.x.toFixed(0) : '-',
          correctedY: corrected ? corrected.y.toFixed(0) : '-',
          pxDifference: pxDiff !== null ? pxDiff.toFixed(1) : '-',
          mmDifference: mmDiff !== null ? mmDiff.toFixed(2) : '-'
        });
      }
    });

    return data.sort((a, b) => a.landmark.localeCompare(b.landmark));
  };

  const comparisonColumns = [
    {
      title: 'Landmark',
      dataIndex: 'landmark',
      key: 'landmark',
      width: '10%',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Manual (px)',
      children: [
        {
          title: 'X',
          dataIndex: 'manualX',
          key: 'manualX',
          width: '12.5%'
        },
        {
          title: 'Y',
          dataIndex: 'manualY',
          key: 'manualY',
          width: '12.5%'
        }
      ]
    },
    {
      title: 'Corrected (px)',
      children: [
        {
          title: 'X',
          dataIndex: 'correctedX',
          key: 'correctedX',
          width: '12.5%'
        },
        {
          title: 'Y',
          dataIndex: 'correctedY',
          key: 'correctedY',
          width: '12.5%'
        }
      ]
    },
    {
      title: 'Difference',
      children: [
        {
          title: 'px',
          dataIndex: 'pxDifference',
          key: 'pxDifference',
          width: '12.5%',
          render: (text: string) => text !== '-' ?
            <span style={{ color: parseFloat(text) > 10 ? '#ff4d4f' : '#52c41a' }}>{text}</span> : '-'
        },
        {
          title: 'mm',
          dataIndex: 'mmDifference',
          key: 'mmDifference',
          width: '12.5%',
          render: (text: string) => text !== '-' ?
            <span style={{ color: parseFloat(text) > mmThreshold ? '#ff4d4f' : '#52c41a' }}>{text}</span> : '-'
        }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: '#FFFFFF' }}>Landmark Size:</label>
          <Slider
            min={2}
            max={15}
            value={landmarkSize}
            onChange={setLandmarkSize}
            style={{ width: '120px' }}
          />
          <span style={{ color: '#FFFFFF' }}>{landmarkSize}px</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: '#FFFFFF' }}>Contrast:</label>
          <Slider
            min={0}
            max={200}
            value={imageContrast}
            onChange={setImageContrast}
            style={{ width: '150px' }}
            marks={{
              0: { style: { color: '#FFFFFF' }, label: '0%' },
              100: { style: { color: '#FFFFFF' }, label: '100%' },
              200: { style: { color: '#FFFFFF' }, label: '200%' }
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: '#FFFFFF' }}>Scale (mm/px):</label>
          <InputNumber
            value={mmPerPixel}
            onChange={(value) => setMmPerPixel(value || 0.1)}
            step={0.01}
            min={0.01}
            style={{ width: '100px' }}
            size="large"
          />
        </div>

        <Checkbox
          checked={showLandmarkLabels}
          onChange={(e) => setShowLandmarkLabels(e.target.checked)}
        >
          <span style={{ color: '#FFFFFF' }}>Show Labels</span>
        </Checkbox>

        <Button
          onClick={handleSaveAnnotations}
          disabled={!allLandmarksPlaced}
          icon={<DownloadOutlined />}
          type="primary"
          style={{
            backgroundColor: allLandmarksPlaced ? '#52c41a' : undefined,
            borderColor: allLandmarksPlaced ? '#52c41a' : undefined,
          }}
        >
          Save Annotations ({manualLandmarks.length}/19)
        </Button>

        {isPlacingLandmark && (
          <Button
            onClick={handleCancelPlacement}
            danger
            style={{
              backgroundColor: '#ff4d4f',
              color: '#FFFFFF',
              border: 'none'
            }}
          >
            Cancel Placement
          </Button>
        )}

        <Button
          icon={<FileTextOutlined />}
          onClick={showManNotesModal}
          className="depth-button-secondary"
          style={{width: "120px"}}>
          Add Notes
        </Button>
        {manualNotesText && !isManNotesModalVisible && (
            <div className="notes-bubble"
              style={{
              maxHeight: "50px",
              maxWidth: "700px"
              }}
            >
              <div style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowY: "auto",
                height: "100%",
                maxHeight: "30px"
                }}>
                {manualNotesText}
              </div>
            </div>
          )}

        <Modal
          title="Add Notes"
          open={isManNotesModalVisible}
          onOk={handleManNotesOk}
          onCancel={handleManNotesCancel}
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
              value={manualNotesText}
              onChange={handleManNotesChange}
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
          type="primary"
          onClick={onComplete}
          style={{
            marginLeft: 'auto',
            backgroundColor: '#FFFFF0',
            color: '#000000',
            fontWeight: 'bold'
          }}
        >
          Continue to Analysis →
        </Button>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Landmark List */}
        <div style={{
          width: '220px',
          background: 'rgba(255, 255, 240, 0.05)',
          borderRadius: '8px',
          padding: '16px',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <h4 style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '16px' }}>
            Place Landmarks
          </h4>
          {correctedLandmarks.length === 0 && (
            <div style={{
              color: 'rgba(255, 255, 240, 0.7)',
              fontSize: '13px',
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(255, 165, 0, 0.15)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 165, 0, 0.3)'
            }}>
              ℹ️ No AI predictions available. You can still manually place all landmarks, or go back to Detection tab to run predictions for comparison.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableLandmarks.map(lm => {
              const isPlaced = manualLandmarks.some(m => m.name === lm.name);
              return (
                <div
                  key={lm.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    background: isPlaced
                      ? 'rgba(0, 255, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    gap: '4px'
                  }}
                >
                  <span style={{ color: '#FFFFFF', fontSize: '14px', flex: 1 }}>
                    {isPlaced ? '✓' : '○'} {lm.name}
                  </span>
                  <Button
                    size="small"
                    onClick={() => handlePlaceLandmark(lm.name)}
                    disabled={isPlacingLandmark !== null && isPlacingLandmark !== lm.name}
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      height: 'auto'
                    }}
                  >
                    {isPlaced ? 'Move' : 'Place'}
                  </Button>
                  {isPlaced && (
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteLandmark(lm.name)}
                      style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        height: 'auto'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            fontSize: '14px'
          }}>
            Progress: {manualLandmarks.length} / {availableLandmarks.length}
            {allLandmarksPlaced && (
              <div style={{ color: '#52c41a', marginTop: '8px' }}>
                ✓ All landmarks placed - ready to save!
              </div>
            )}
          </div>
        </div>

        {/* Image Canvas with Zoom - SIMPLIFIED */}
        <div style={{
          flex: 1,
          background: 'rgba(255, 255, 240, 0.05)',
          borderRadius: '8px',
          height: '600px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {currentImage ? (
            <TransformWrapper
              initialScale={0.6}
              minScale={0.3}
              maxScale={10}
              centerOnInit={true}
              doubleClick={{ disabled: true }}
            >
              {({ zoomIn, zoomOut }) => (
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
                      style={{
                        backgroundColor: 'rgba(255,255,240,0.9)',
                        color: '#09185B',
                        border: 'none'
                      }}
                    />
                    <Button
                      icon={<ZoomOutOutlined />}
                      onClick={() => zoomOut()}
                      style={{
                        backgroundColor: 'rgba(255,255,240,0.9)',
                        color: '#09185B',
                        border: 'none'
                      }}
                    />
                  </div>

                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                    <div
                      ref={imageRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}
                    >
                      <img
                        src={currentImage.url}
                        alt="Cephalometric X-ray"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          userSelect: 'none',
                          filter: `contrast(${imageContrast}%)`,
                          transition: 'filter 0.2s ease'
                        }}
                        draggable={false}
                      />
                      {renderLandmarks(manualLandmarks, '#0099FF', true)}
                      {isPlacingLandmark && (
                        <div style={{
                          position: 'absolute',
                          top: 16,
                          left: 16,
                          background: 'rgba(0, 0, 0, 0.85)',
                          color: '#FFFFFF',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          pointerEvents: 'none'
                        }}>
                          Click to place: <strong>{isPlacingLandmark}</strong>
                        </div>
                      )}
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '16px'
            }}>
              No image loaded
            </div>
          )}
        </div>
      </div>

      {/* Comparison Section - Only show if predictions are available */}
      {correctedLandmarks.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 240, 0.05)',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#FFFFFF', margin: 0 }}>Landmark Comparison</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                <label style={{ color: '#FFFFFF', fontSize: '14px' }}>Threshold (mm):</label>
                <InputNumber
                  value={mmThreshold}
                  onChange={(value) => setMmThreshold(value || 2)}
                  step={0.5}
                  min={0.5}
                  max={10}
                  style={{ width: '80px' }}
                  size="small"
                />
                <span style={{ color: 'rgba(255, 255, 240, 0.6)', fontSize: '12px' }}>
                  (≤{mmThreshold}mm = <span style={{ color: '#52c41a' }}>green</span>, {'>'}{mmThreshold}mm = <span style={{ color: '#ff4d4f' }}>red</span>)
                </span>
              </div>
            </div>
            <Button
              icon={<FileTextOutlined />}
              onClick={showCompNotesModal}
              className="depth-button-secondary"
              style={{
                width: "20%",
                marginLeft: "auto",
                marginRight: "20px"
              }}>
              Add Notes
            </Button>

            <Modal
              title="Add Notes"
              open={isCompNotesModalVisible}
              onOk={handleCompNotesOk}
              onCancel={handleCompNotesCancel}
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
                  value={compNotesText}
                  onChange={handleCompNotesChange}
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
            <Radio.Group
              value={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.value)}
              buttonStyle="solid"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '4px',
                padding: '2px'
              }}
            >
              <Radio.Button
                value="side-by-side"
                style={{
                  color: comparisonMode === 'side-by-side' ? '#FFFFFF' : '#000000',
                  backgroundColor: comparisonMode === 'side-by-side' ? '#1890ff' : 'transparent',
                  border: 'none'
                }}
              >
                Side by Side
              </Radio.Button>
              <Radio.Button
                value="superimposed"
                style={{
                  color: comparisonMode === 'superimposed' ? '#FFFFFF' : '#000000',
                  backgroundColor: comparisonMode === 'superimposed' ? '#1890ff' : 'transparent',
                  border: 'none'
                }}
              >
                Superimposed
              </Radio.Button>
            </Radio.Group>
          </div>
          {compNotesText && !isCompNotesModalVisible && (
              <div className="notes-bubble"
                style={{
                maxHeight: "50px",
                maxWidth: "700px"
                }}
              >
                <div style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowY: "auto",
                  height: "100%",
                  maxHeight: "30px"
                  }}>
                  {compNotesText}
                </div>
              </div>
            )}

          {/* Comparison Images */}
          <div style={{ marginBottom: '24px' }}>
            {comparisonMode === 'side-by-side' ? (
              <div style={{ display: 'flex', gap: '16px' }}>
                {renderComparisonImage('Manual Detection (Blue)', manualLandmarks, '#0099FF')}
                {renderComparisonImage('Corrected Predictions (Red)', correctedLandmarks.filter(l => !l.isCustom), '#FF0000')}
              </div>
            ) : (
              /* Superimposed Mode */
              <div>
                <h4 style={{ color: '#FFFFFF', textAlign: 'center', marginBottom: '8px' }}>
                  Superimposed View (Blue: Manual, Red: Corrected)
                </h4>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  height: '500px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {currentImage && (
                    <TransformWrapper
                      initialScale={0.5}
                      minScale={0.2}
                      maxScale={10}
                      centerOnInit={true}
                      doubleClick={{ disabled: true }}
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
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                          }}>
                            <img
                              src={currentImage.url}
                              alt="Superimposed"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                filter: `contrast(${imageContrast}%)`,
                                transition: 'filter 0.2s ease'
                              }}
                            />
                            <svg
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none'
                              }}
                              viewBox={`0 0 ${currentImage.width} ${currentImage.height}`}
                              preserveAspectRatio="none"
                            >
                              {/* Manual landmarks in blue */}
                              {manualLandmarks.map(landmark => (
                                <g key={`super-manual-${landmark.id}`}>
                                  <circle
                                    cx={landmark.x}
                                    cy={landmark.y}
                                    r={landmarkSize * 4}
                                    fill="#0099FF"
                                    stroke="#FFFFFF"
                                    strokeWidth={2}
                                    opacity={0.7}
                                  />
                                  {showLandmarkLabels && (
                                    <text
                                      x={landmark.x + landmarkSize * 4 + 5}
                                      y={landmark.y - 5}
                                      fill="#0099FF"
                                      fontSize={landmarkSize * 5}
                                      fontWeight="bold"
                                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                      {landmark.name}
                                    </text>
                                  )}
                                </g>
                              ))}
                              {/* Corrected landmarks in red */}
                              {correctedLandmarks.filter(l => !l.isCustom).map(landmark => (
                                <g key={`super-corrected-${landmark.id}`}>
                                  <circle
                                    cx={landmark.x}
                                    cy={landmark.y}
                                    r={landmarkSize * 4}
                                    fill="#FF0000"
                                    stroke="#FFFFFF"
                                    strokeWidth={2}
                                    opacity={0.7}
                                  />
                                  {showLandmarkLabels && (
                                    <text
                                      x={landmark.x - landmarkSize * 4 - 30}
                                      y={landmark.y + 15}
                                      fill="#FF0000"
                                      fontSize={landmarkSize * 5}
                                      fontWeight="bold"
                                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                      {landmark.name}
                                    </text>
                                  )}
                                </g>
                              ))}
                            </svg>
                          </div>
                        </TransformComponent>
                        </>
                      )}
                    </TransformWrapper>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Comparison Table */}
          <Table
            columns={comparisonColumns}
            dataSource={getComparisonData()}
            pagination={false}
            size="small"
            scroll={{ y: 400 }}
            style={{
              background: '#FFFFFF',
              borderRadius: '8px'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ManualDetection;
