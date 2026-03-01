import React, { useState, useEffect } from 'react';
import { Table, Select, Button, InputNumber, message, Modal, Slider, List, Card, Checkbox, AutoComplete } from 'antd';
import {
  SaveOutlined,
  PlusOutlined,
  CameraOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useLandmarkStore } from '@/stores/landmarkStore';
import { steinerAnalysis, calculateDistance, calculateAngle, calculatePlanes } from '@/utils/cephalometric';
import LandmarkCanvas from '@/components/canvas/LandmarkCanvas';
import { CephalometricMeasurement, Landmark } from '@/types';

const { Option } = Select;

interface SavedMeasurementOverlay {
  id: string;
  name: string;
  imageUrl: string;
  timestamp: number;
}

const CephalometricAnalysis: React.FC = () => {
  const {
    landmarks, // Original AI predictions
    correctedLandmarks, // Corrected landmarks including custom ones
    currentImage,
    setPage3Notes,
    page3Notes,
    setPage3Images,
    setCephMeasurements,
    landmarkSize,
    setLandmarkSize,
    lastAnalysisType,
    setLastAnalysisType,
    showLandmarkLabels,
    setShowLandmarkLabels,
    mmPerPixel,
    setMmPerPixel,
    page3Images,
    page3ImageCaptions,
    setPage3ImageCaptions,
    customMeasurements,
    addCustomMeasurement: addCustomMeasurementToStore,
    removeCustomMeasurement,
    page3ImageUrl,
    setPage3ImageUrl,
  } = useLandmarkStore();

  const [analysisType, setAnalysisType] = useState<'steiner' | 'planes' | 'custom'>(lastAnalysisType);
  const [measurements, setMeasurements] = useState<CephalometricMeasurement[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<any>(null);
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [customMeasurementType, setCustomMeasurementType] = useState<'angle' | 'distance'>('distance');
  const [customMeasurementName, setCustomMeasurementName] = useState('');
  const [customLandmark1, setCustomLandmark1] = useState('');
  const [customLandmark2, setCustomLandmark2] = useState('');
  const [customLandmark3, setCustomLandmark3] = useState('');
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string>(page3Notes || "");
  const [isNotesModalVisible, setIsNotesModalVisible] = useState(false);
  const [savedOverlays, setSavedOverlays] = useState<SavedMeasurementOverlay[]>([]);
  const [allPlanes, setAllPlanes] = useState<any[]>([]);

  // Use corrected landmarks if available, otherwise fall back to original landmarks
  const activeLandmarks = correctedLandmarks.length > 0 ? correctedLandmarks : landmarks;

  useEffect(() => {
    if (analysisType === 'steiner') {
      const { measurements } = steinerAnalysis(activeLandmarks, mmPerPixel);
      setMeasurements(measurements);
      setAllPlanes([]);
    } else if (analysisType === 'planes') {
      const { measurements } = calculatePlanes(activeLandmarks, mmPerPixel);
      setMeasurements(measurements);
      setAllPlanes(measurements.map(m => ({
        points: m.points,
        type: 'line',
        id: m.id
      })));
    } else {
      // Use custom measurements from the global store
      setMeasurements(customMeasurements);
      setAllPlanes([]);
    }
  }, [analysisType, activeLandmarks, mmPerPixel, customMeasurements]);

  useEffect(() => {
    setPage3Notes(notesText);
  }, [notesText, setPage3Notes]);

  useEffect(() => {
    setCephMeasurements(measurements);
  }, [measurements, setCephMeasurements]);

  const handleAnalysisTypeChange = (value: 'steiner' | 'planes' | 'custom') => {
    setAnalysisType(value);
    setLastAnalysisType(value);
  };

  const handleAddCustomMeasurement = () => {
    setIsCustomModalVisible(true);
    setCustomMeasurementName('');
    setCustomLandmark1('');
    setCustomLandmark2('');
    setCustomLandmark3('');
    setCustomMeasurementType('distance');
  };

  const handleSaveCustomMeasurement = () => {
    let selectedPoints: string[] = [];

    if (customMeasurementType === 'distance') {
      if (!customLandmark1 || !customLandmark2) {
        message.error('Please enter both landmark names for distance measurement');
        return;
      }

      // Check for duplicate landmarks
      if (customLandmark1 === customLandmark2) {
        message.error('Cannot measure distance between the same landmark. Please select two different landmarks.');
        return;
      }

      selectedPoints = [customLandmark1, customLandmark2];
    } else {
      if (!customLandmark1 || !customLandmark2 || !customLandmark3) {
        message.error('Please enter all three landmark names for angle measurement');
        return;
      }

      // Check for duplicate landmarks
      if (customLandmark1 === customLandmark2 || customLandmark2 === customLandmark3 || customLandmark1 === customLandmark3) {
        message.error('Cannot measure angle using duplicate landmarks. Please select three different landmarks.');
        return;
      }

      selectedPoints = [customLandmark1, customLandmark2, customLandmark3];
    }

    const selectedLandmarkObjects = selectedPoints.map(name =>
      activeLandmarks.find(l => l.id === name || l.name === name)
    ).filter(Boolean) as Landmark[];

    if (selectedLandmarkObjects.length !== selectedPoints.length) {
      message.error('One or more landmarks not found. Please check the landmark names.');
      return;
    }

    let value = 0;
    if (customMeasurementType === 'distance' && selectedLandmarkObjects.length === 2) {
      value = calculateDistance(selectedLandmarkObjects[0], selectedLandmarkObjects[1], mmPerPixel);
    } else if (customMeasurementType === 'angle' && selectedLandmarkObjects.length === 3) {
      value = calculateAngle(selectedLandmarkObjects[0], selectedLandmarkObjects[1], selectedLandmarkObjects[2]);
    }

    const measurementName = customMeasurementName ||
      (customMeasurementType === 'distance'
        ? `${customLandmark1}-${customLandmark2}`
        : `${customLandmark1}-${customLandmark2}-${customLandmark3}`);

    const newMeasurement: CephalometricMeasurement = {
      id: `custom_${Date.now()}`,
      name: measurementName,
      type: customMeasurementType,
      points: selectedPoints,
      value: parseFloat(value.toFixed(1)),
      unit: customMeasurementType === 'distance' ? 'mm' : 'degrees'
    };

    // Add to global store instead of local state
    addCustomMeasurementToStore(newMeasurement);
    setIsCustomModalVisible(false);
    setCustomMeasurementName('');
    setCustomLandmark1('');
    setCustomLandmark2('');
    setCustomLandmark3('');
    message.success('Custom measurement added');
  };

  const handleDeleteCustomMeasurement = (measurementId: string) => {
    removeCustomMeasurement(measurementId);
    message.success('Custom measurement removed');
  };

  const handleRowClick = (record: CephalometricMeasurement) => {
    if (selectedRow === record.id) {
      setSelectedRow(null);
      setSelectedMeasurement(null);
    } else {
      setSelectedRow(record.id);
      if (analysisType === 'planes') {
        setSelectedMeasurement({
          points: record.points,
          type: 'plane_highlight',
          allPlanes: allPlanes,
          highlightedId: record.id,
          name: record.name
        });
      } else if (record.id === 'mp_angle') {
        setSelectedMeasurement({
          points: record.points,
          type: 'two_planes',
          name: record.name
        });
      } else {
        setSelectedMeasurement({
          points: record.points,
          type: record.type === 'distance' ? 'line' : 'angle',
          name: record.name
        });
      }
    }
  };

  const handleSaveTable = () => {
    const csv = [
      ['Measurement', 'Value', 'Unit', 'Norm', 'Deviation'],
      ...measurements.map(m => [
        m.name,
        m.value.toString(),
        m.unit,
        m.norm?.toString() || '',
        m.deviation?.toString() || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cephalometric_analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
    message.success('Analysis saved as CSV');
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesText(e.target.value);
  };

  const showNotesModal = () => setIsNotesModalVisible(true);
  const handleNotesOk = () => setIsNotesModalVisible(false);
  const handleNotesCancel = () => setIsNotesModalVisible(false);

  useEffect(() => {
    setPage3Notes(notesText);
  }, [notesText, setPage3Notes]);

  useEffect(() => {
    // Only restore if we have images and either no overlays OR overlays don't match images.
    if (page3Images.length > 0 && savedOverlays.length !== page3Images.length) {
      const restoredOverlays: SavedMeasurementOverlay[] = page3Images.map((imageUrl, index) => ({
        id: `overlay_restored_${index}_${Date.now()}`,
        name: page3ImageCaptions[index] || `Measurement ${index + 1}`,
        imageUrl: imageUrl,
        timestamp: Date.now() - (page3Images.length - index),
      }));
      setSavedOverlays(restoredOverlays);
    }
  }, [page3Images, page3ImageCaptions]);

  useEffect(() => {
    const currentUrl = currentImage?.url || null;
    if (page3ImageUrl && currentUrl && page3ImageUrl !== currentUrl) {
      console.log('Image changed, clearing overlays');
      setSavedOverlays([]);
      setPage3Images([]);
      setPage3ImageCaptions([]);
    }
    // Always update the stored URL.
    if (currentUrl) {
      setPage3ImageUrl(currentUrl);
    }
  }, [currentImage?.url]);

  useEffect(() => {
    setCephMeasurements(measurements);
  }, [measurements, setCephMeasurements]);

  const generateMeasurementOverlay = async (
    imageSrc: string,
    measurement: any
  ): Promise<string | null> => {
    if (!imageSrc || !measurement) return null;

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

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Get landmarks for the measurement
        const measurementLandmarks = measurement.points
          .map((pointName: string) => activeLandmarks.find(l => l.id === pointName || l.name === pointName))
          .filter(Boolean);

        if (measurementLandmarks.length === 0) {
          return reject("No landmarks found for measurement");
        }

        // Draw landmarks
        measurementLandmarks.forEach((lm: Landmark) => {
          // Use orange for custom landmarks, red for standard
          ctx.fillStyle = lm.isCustom ? "#FFA500" : "red";
          ctx.beginPath();
          ctx.arc(lm.x, lm.y, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "yellow";
          ctx.font = `20px Arial`;
          ctx.textBaseline = "top";
          ctx.fillText(lm.name, lm.x + 10 + 2, lm.y - 10);
        });

        // Draw measurement visualization
        if (measurement.type === 'line' && measurementLandmarks.length >= 2) {
          // Draw line for distance measurement
          const [p1, p2] = measurementLandmarks;
          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        } else if (measurement.type === 'angle' && measurementLandmarks.length >= 3) {
          // Draw lines and arc for angle measurement
          const [p1, p2, p3] = measurementLandmarks;

          // Draw lines
          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.stroke();

          // Draw arc
          const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
          const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
          const arcRadius = 30;

          ctx.strokeStyle = "#ffff00";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p2.x, p2.y, arcRadius, angle1, angle2, false);
          ctx.stroke();
        }

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = reject;
    });
  };

  const handleAddMeasurementToNotes = async () => {
    if (!currentImage?.url) {
      message.warning('No image available');
      return;
    }

    if (!selectedMeasurement) {
      message.warning('Please select a measurement first');
      return;
    }

    try {
      const overlayImage = await generateMeasurementOverlay(
        currentImage.url,
        selectedMeasurement
      );

      if (overlayImage) {
        const newOverlay: SavedMeasurementOverlay = {
          id: `overlay_${Date.now()}`,
          name: selectedMeasurement.name,
          imageUrl: overlayImage,
          timestamp: Date.now(),
        };

        const updatedOverlays = [...savedOverlays, newOverlay]
        setSavedOverlays(updatedOverlays);
        setPage3Images([...page3Images, overlayImage]);
        setPage3ImageCaptions(updatedOverlays.map(o => o.name));
        message.success(`Measurement "${selectedMeasurement.name}" added to notes`);
      }
    } catch (err) {
      console.error("Failed to generate measurement overlay", err);
      message.error('Failed to generate measurement overlay');
    }
  };

  const handleDeleteOverlay = (overlayId: string) => {
    const overlayToDelete = savedOverlays.find(o => o.id === overlayId);
    if (!overlayToDelete) return;

    // Remove from savedOverlays
    const updatedOverlays = savedOverlays.filter(o => o.id !== overlayId);
    setSavedOverlays(updatedOverlays);

    // Remove from page3Images
    const updatedImages = page3Images.filter(img => img !== overlayToDelete.imageUrl);
    setPage3Images(updatedImages);

    setPage3ImageCaptions(updatedOverlays.map(o => o.name))

    message.success(`Measurement overlay removed from notes`);
  };

  const columns = analysisType === 'planes' ? [
    {
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Plane</span>,
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500, color: '#000000' }}>{text}</span>
    },
    {
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Length</span>,
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: CephalometricMeasurement) =>
        <span style={{ color: '#000000' }}>{`${value.toFixed(1)} ${record.unit}`}</span>
    }
  ] : [
    {
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Measurement</span>,
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500, color: '#000000' }}>{text}</span>
    },
    {
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Value</span>,
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: CephalometricMeasurement) =>
        <span style={{ color: '#000000' }}>{`${value.toFixed(1)} ${record.unit}`}</span>
    },
    {
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Norm</span>,
      dataIndex: 'norm',
      key: 'norm',
      render: (norm: number | undefined, record: CephalometricMeasurement) =>
        <span style={{ color: '#000000' }}>{norm ? `${norm} ${record.unit}` : '-'}</span>
    },
    {
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Deviation</span>,
      dataIndex: 'deviation',
      key: 'deviation',
      render: (dev: number | undefined) => {
        if (!dev) return <span style={{ color: '#000000' }}>-</span>;
        const color = Math.abs(dev) > 2 ? '#ff4d4f' : '#52c41a';
        return <span style={{ color, fontWeight: 'bold' }}>{dev > 0 ? '+' : ''}{dev.toFixed(1)}</span>;
      }
    },
  ];

  // Add action column for custom measurements
  const columnsWithActions = analysisType === 'custom' ? [
    ...columns,
    {
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Actions</span>,
      key: 'actions',
      render: (_: any, record: CephalometricMeasurement) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteCustomMeasurement(record.id);
          }}
          size="small"
        >
          Delete
        </Button>
      )
    }
  ] : columns;

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      flexDirection: 'column',
      width: '100%',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: '#FFFFF0', whiteSpace: 'nowrap' }}>
            Analysis Type:
          </label>
          <Select
            value={analysisType}
            onChange={handleAnalysisTypeChange}
            style={{ width: '200px' }}
            dropdownStyle={{ backgroundColor: '#FFFFFF' }}
            size="large"
          >
            <Option value="steiner">Steiner Analysis</Option>
            <Option value="planes">Cephalometric Planes</Option>
            <Option value="custom">Custom Analysis {customMeasurements.length > 0 && `(${customMeasurements.length})`}</Option>
          </Select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: '#FFFFF0', whiteSpace: 'nowrap' }}>
            Scale (mm/px):
          </label>
          <InputNumber
            value={mmPerPixel}
            onChange={(value) => setMmPerPixel(value || 0.1)}
            step={0.01}
            min={0.01}
            defaultValue={0.1}
            style={{
              width: '100px',
              backgroundColor: '#FFFFFF',
              color: '#000000'
            }}
            size="large"
          />
        </div>

        {analysisType === 'custom' && (
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddCustomMeasurement}
            className="depth-button"
            size="large"
          >
            Add Custom Measurement
          </Button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: '#FFFFF0' }}>Landmark Size:</label>
          <Slider
            min={2}
            max={15}
            value={landmarkSize}
            onChange={setLandmarkSize}
            style={{ width: '100px' }}
          />
          <span style={{ color: '#FFFFF0' }}>{landmarkSize}px</span>
        </div>

        <Checkbox
          checked={showLandmarkLabels}
          onChange={(e) => setShowLandmarkLabels(e.target.checked)}
          style={{ color: '#FFFFF0' }}
        >
          <span style={{ color: '#FFFFF0' }}>Show Labels</span>
        </Checkbox>

        <Button
          icon={<SaveOutlined />}
          onClick={handleSaveTable}
          className="depth-button-secondary"
          size="large"
        >
          Save as CSV
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '24px', minHeight: '600px' }}>
        {/* Left - Measurements Table */}
        <div>
          <div style={{
            flex: '1 1 50%',
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0, 0, 0, 0.15)',
            overflow: 'auto',
            maxHeight: '70vh'
          }}>
            <Table
              columns={analysisType === 'custom' ? columnsWithActions : columns}
              dataSource={measurements}
              rowKey="id"
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                style: {
                  cursor: 'pointer',
                  background: selectedRow === record.id ? '#e6f7ff' : '#FFFFF0'
                },
                onMouseEnter: (e) => {
                  if (selectedRow !== record.id) {
                    (e.currentTarget as HTMLElement).style.background = '#f5f5f5';
                  }
                },
                onMouseLeave: (e) => {
                  if (selectedRow !== record.id) {
                    (e.currentTarget as HTMLElement).style.background = '#FFFFFF';
                  }
                }
              })}
              rowClassName={(record) => {
                return selectedRow === record.id ? 'selected-row' : 'default-row';
              }}
              pagination={false}
              style={{ background: '#FFFFFF' }}
            />
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "10px"
          }}>
          <Button
            icon={<CameraOutlined />}
            onClick={handleAddMeasurementToNotes}
            className="depth-button"
            size="large"
            disabled={!selectedMeasurement}
            style={{ marginTop: "10px"}}
          >
            Add Selected Measurement to Notes
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={showNotesModal}
            className="depth-button-secondary"
            size="large"
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
          </div>
        </div>

        <div style={{
          flex: '1 1 50%',
          background: 'rgba(255, 255, 240, 0.05)',
          borderRadius: '12px',
          overflow: 'hidden',
          minHeight: '600px',
          maxHeight: '70vh',
          position: "relative"
        }}>
          {currentImage && (
            <TransformWrapper
              initialScale={1.2}
              minScale={0.3}
              maxScale={10}
              centerOnInit={true}
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
                    }}
                  >
                    <LandmarkCanvas
                      imageUrl={currentImage.url}
                      landmarks={activeLandmarks}
                      landmarkSize={landmarkSize}
                      editable={false}
                      showLandmarkLabels={showLandmarkLabels}
                      selectedMeasurement={analysisType === 'planes' ?
                        (selectedMeasurement || { type: 'all_planes', allPlanes }) :
                        selectedMeasurement
                      }
                      showControls={true}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          )}
        </div>
      </div>

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
        <div style={{
          background: "rgb(4 21 109 / 75%)",
          display: "block",
          marginBottom: "4px",
          padding: "16px",
          borderRadius: "8px",
        }}>
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
            style={{
              background: 'rgba(0, 0, 0, 0.1)',
              color: '#FFFFF0',
              border: "2px solid rgba(255, 255, 240, 0.1)",
              width: "100%",
              height: "20vh",
              padding: '8px',
              borderRadius: '4px'
            }}
          />
        </div>
      </Modal>

      <Modal
        title="Add Custom Measurement"
        open={isCustomModalVisible}
        onOk={handleSaveCustomMeasurement}
        onCancel={() => {
          setIsCustomModalVisible(false);
          setCustomMeasurementName('');
          setCustomLandmark1('');
          setCustomLandmark2('');
          setCustomLandmark3('');
        }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Measurement Type:
            </label>
            <Select
              value={customMeasurementType}
              onChange={(value) => {
                setCustomMeasurementType(value);
                setCustomLandmark1('');
                setCustomLandmark2('');
                setCustomLandmark3('');
              }}
              style={{ width: '100%' }}
            >
              <Option value="distance">Linear Measurement (2 points)</Option>
              <Option value="angle">Angular Measurement (3 points)</Option>
            </Select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Landmark Points:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <AutoComplete
                value={customLandmark1}
                onChange={setCustomLandmark1}
                options={activeLandmarks.map(l => ({ value: l.name }))}
                placeholder={customMeasurementType === 'angle' ? "First point (e.g., S)" : "First point (e.g., S)"}
                style={{ width: '100%' }}
                filterOption={(inputValue, option) =>
                  option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
              <AutoComplete
                value={customLandmark2}
                onChange={setCustomLandmark2}
                options={activeLandmarks.map(l => ({ value: l.name }))}
                placeholder={customMeasurementType === 'angle' ? "Vertex point (e.g., N)" : "Second point (e.g., N)"}
                style={{ width: '100%' }}
                filterOption={(inputValue, option) =>
                  option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
              {customMeasurementType === 'angle' && (
                <AutoComplete
                  value={customLandmark3}
                  onChange={setCustomLandmark3}
                  options={activeLandmarks.map(l => ({ value: l.name }))}
                  placeholder="Third point (e.g., A)"
                  style={{ width: '100%' }}
                  filterOption={(inputValue, option) =>
                    option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                />
              )}
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              {customMeasurementType === 'angle'
                ? 'Enter three landmark names. The angle will be calculated at the second point (vertex).'
                : 'Enter two landmark names for the distance measurement.'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Measurement Name (optional):
            </label>
            <input
              type="text"
              value={customMeasurementName}
              onChange={(e) => setCustomMeasurementName(e.target.value)}
              placeholder={customMeasurementType === 'distance'
                ? "e.g., S-N Distance"
                : "e.g., ANB Angle"}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d9d9d9',
                backgroundColor: '#FFFFFF',
                color: '#000000'
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              If left empty, the name will be generated from landmark names
            </div>
          </div>

          <div style={{
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            <strong>Available landmarks:</strong><br />
            {activeLandmarks.map(l => l.name).join(', ')}
          </div>
        </div>
      </Modal>

      {savedOverlays.length > 0 && (
        <Card
          title={<span style={{ color: "#F0F0F0" }}>Saved Measurement Overlays ({savedOverlays.length})</span>}
          style={{
            background: "rgba(255, 255, 240, 0.05)",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
          }}
          bodyStyle={{ padding: "16px" }}
        >
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
            dataSource={savedOverlays}
            renderItem={(overlay) => (
              <List.Item>
                <Card
                  hoverable
                  cover={
                    <img
                      alt={overlay.name}
                      src={overlay.imageUrl}
                      style={{
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px 8px 0 0"
                      }}
                    />
                  }
                  style={{
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#0000000d"
                  }}
                  actions={[
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteOverlay(overlay.id)}
                      size="small"
                    >
                      Remove
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={<span style={{ fontSize: "14px", color: "#f0f0f0" }}>{overlay.name}</span>}
                    description={
                      <span style={{ fontSize: "12px", color: "rgb(202 202 202)" }}>
                        {new Date(overlay.timestamp).toLocaleTimeString()}
                      </span>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default CephalometricAnalysis;
