import React, { useEffect, useState, useRef } from 'react';
import { Button, Checkbox, message, Modal } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Landmark } from '@/types';

interface Props {
  imageUrl: string;
  landmarks: Landmark[];
  landmarkSize: number;
  editable: boolean;
  showLandmarkLabels?: boolean;
  onLandmarkMove?: (id: string, x: number, y: number) => void;
  onLandmarkRemove?: (id: string) => void;
  selectedMeasurement?: {
    points?: string[];
    type: 'line' | 'angle' | 'all_planes' | 'plane_highlight' | 'two_planes';
    allPlanes?: any[];
    highlightedId?: string;
  };
  showControls?: boolean;
  zoomControls?: any;
  showCustomLandmarks?: boolean;
  imageContrast?: number;
}

const LandmarkCanvas: React.FC<Props> = ({
  imageUrl,
  landmarks,
  landmarkSize,
  editable,
  showLandmarkLabels = true,
  showCustomLandmarks = true,
  onLandmarkMove,
  onLandmarkRemove,
  selectedMeasurement,
  showControls = false,
  imageContrast = 100,
}) => {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [draggedLandmark, setDraggedLandmark] = useState<string | null>(null);
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
  }, [imageUrl]);

  const getCanvasCoordinates = (e: MouseEvent | React.MouseEvent) => {
    if (!svgRef.current || !containerRef.current) return { x: 0, y: 0 };

    const rect = svgRef.current.getBoundingClientRect();

    // Find the transform component wrapper
    let transformElement = containerRef.current;
    let parent = transformElement.parentElement;

    // Look for the actual transformed element
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.transform && style.transform !== 'none') {
        transformElement = parent;
        break;
      }
      parent = parent.parentElement;
    }

    // Parse the transform matrix
    let scale = 1;
    const transform = window.getComputedStyle(transformElement).transform;
    if (transform && transform !== 'none') {
      // Parse matrix or matrix3d
      const matrixMatch = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (matrixMatch) {
        const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
        // For 2D matrix, scale is the first value; for 3D, it's also the first
        scale = Math.abs(values[0]);
      }
    }

    // Calculate coordinates accounting for scale
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Convert from display coordinates to image coordinates
    const displayToImageScale = imageDimensions.width / containerDimensions.width;

    return {
      x: x * displayToImageScale,
      y: y * displayToImageScale
    };
  };

  const handleMouseDown = (landmarkId: string) => (e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();

    setDraggedLandmark(landmarkId);

    // Immediately move to cursor for responsive feel
    if (onLandmarkMove) {
      const coords = getCanvasCoordinates(e);
      onLandmarkMove(landmarkId, coords.x, coords.y);
    }
  };

  const handleRightClick = (landmarkId: string) => (e: React.MouseEvent) => {
    e.preventDefault();

    const landmark = landmarks.find(l => l.id === landmarkId);
    if (!landmark || !landmark.isCustom) return;

    const action = window.prompt(
      `What would you like to do with landmark "${landmark.name}"?\n\nType 'rename' to rename it\nType 'delete' to remove it\nPress Cancel to do nothing`,
      'rename'
    );

    if (!action) return;

    if (action.toLowerCase() === 'delete') {
      if (window.confirm(`Are you sure you want to remove landmark "${landmark.name}"?`)) {
        if (onLandmarkRemove) {
          onLandmarkRemove(landmarkId);
          message.success(`Removed landmark: ${landmark.name}`);
        }
      }
    } else if (action.toLowerCase() === 'rename') {
      const newName = window.prompt(`Enter new name for landmark "${landmark.name}":`, landmark.name);
      if (newName && newName !== landmark.name) {
        // This should be handled with a proper rename function
        message.info('Rename functionality needs to be implemented in the store');
      }
    }
  };

  useEffect(() => {
    if (!draggedLandmark || !editable || !onLandmarkMove) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        const coords = getCanvasCoordinates(e);
        const constrainedX = Math.max(0, Math.min(imageDimensions.width, coords.x));
        const constrainedY = Math.max(0, Math.min(imageDimensions.height, coords.y));
        onLandmarkMove(draggedLandmark, constrainedX, constrainedY);
      });
    };

    const handleGlobalMouseUp = () => {
      setDraggedLandmark(null);
    };

    // Add listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedLandmark, editable, imageDimensions, onLandmarkMove]);

  const saveImageWithLandmarks = async () => {
    if (!imgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;

    ctx.drawImage(imgRef.current, 0, 0);

    const filteredLandmarks = showCustomLandmarks
      ? landmarks
      : landmarks.filter(l => !l.isCustom);

    filteredLandmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(landmark.x, landmark.y, landmarkSize * 2, 0, 2 * Math.PI);
      ctx.fillStyle = landmark.isCustom ? '#FFA500' : '#FF0000';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (showLandmarkLabels) {
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(landmark.name, landmark.x + landmarkSize * 2 + 5, landmark.y - 5);
        ctx.fillText(landmark.name, landmark.x + landmarkSize * 2 + 5, landmark.y - 5);
      }
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `landmarks_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Image saved with landmarks');
      }
    });
  };

  const renderMeasurementLines = () => {
    if (!selectedMeasurement) return null;

    const { type } = selectedMeasurement;

    const scale = imageDimensions.width > 0 && containerDimensions.width > 0
      ? containerDimensions.width / imageDimensions.width
      : 1;

    const findLandmark = (identifier: string) => {
      return landmarks.find(l => l.id === identifier || l.name === identifier);
    };

    if (type === 'all_planes' && selectedMeasurement.allPlanes) {
      return (
        <g>
          {selectedMeasurement.allPlanes.map((plane: any) => {
            if (!plane.points || plane.points.length < 2) return null;

            const p1 = findLandmark(plane.points[0]);
            const p2 = findLandmark(plane.points[1]);

            if (p1 && p2) {
              return (
                <line
                  key={plane.id}
                  x1={p1.x * scale}
                  y1={p1.y * scale}
                  x2={p2.x * scale}
                  y2={p2.y * scale}
                  stroke="#00FF00"
                  strokeWidth="2"
                  opacity={0.7}
                />
              );
            }
            return null;
          })}
        </g>
      );
    }

    if (type === 'plane_highlight' && selectedMeasurement.allPlanes) {
      return (
        <g>
          {selectedMeasurement.allPlanes.map((plane: any) => {
            if (!plane.points || plane.points.length < 2) return null;

            const p1 = findLandmark(plane.points[0]);
            const p2 = findLandmark(plane.points[1]);

            if (p1 && p2) {
              const isHighlighted = plane.id === selectedMeasurement.highlightedId;
              return (
                <line
                  key={plane.id}
                  x1={p1.x * scale}
                  y1={p1.y * scale}
                  x2={p2.x * scale}
                  y2={p2.y * scale}
                  stroke={isHighlighted ? "#FF0000" : "#00FF00"}
                  strokeWidth={isHighlighted ? "3" : "2"}
                  opacity={isHighlighted ? 1 : 0.5}
                />
              );
            }
            return null;
          })}
        </g>
      );
    }

    if (type === 'two_planes' && selectedMeasurement.points && selectedMeasurement.points.length === 4) {
      const [goId, gnId, sId, nId] = selectedMeasurement.points;
      const Go = findLandmark(goId);
      const Gn = findLandmark(gnId);
      const S = findLandmark(sId);
      const N = findLandmark(nId);

      if (Go && Gn && S && N) {
        const extendLine = (p1: any, p2: any, factor: number = 2) => {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          return {
            x1: p1.x - dx * factor,
            y1: p1.y - dy * factor,
            x2: p2.x + dx * factor,
            y2: p2.y + dy * factor
          };
        };

        const mpLine = extendLine(Go, Gn);
        const snLine = extendLine(S, N);

        return (
          <g>
            <line
              x1={mpLine.x1 * scale}
              y1={mpLine.y1 * scale}
              x2={mpLine.x2 * scale}
              y2={mpLine.y2 * scale}
              stroke="#00FF00"
              strokeWidth="2"
              strokeDasharray="none"
              opacity={0.8}
            />
            <line
              x1={snLine.x1 * scale}
              y1={snLine.y1 * scale}
              x2={snLine.x2 * scale}
              y2={snLine.y2 * scale}
              stroke="#0099FF"
              strokeWidth="2"
              strokeDasharray="none"
              opacity={0.8}
            />
            <text
              x={(Gn.x * scale) + 10}
              y={(Gn.y * scale) - 10}
              fill="#00FF00"
              fontSize="12"
              fontWeight="bold"
            >
              MP
            </text>
            <text
              x={(N.x * scale) + 10}
              y={(N.y * scale) - 10}
              fill="#0099FF"
              fontSize="12"
              fontWeight="bold"
            >
              SN
            </text>
          </g>
        );
      }
    }

    if (type === 'line' && selectedMeasurement.points && selectedMeasurement.points.length >= 2) {
      const p1 = findLandmark(selectedMeasurement.points[0]);
      const p2 = findLandmark(selectedMeasurement.points[1]);

      if (p1 && p2) {
        return (
          <line
            x1={p1.x * scale}
            y1={p1.y * scale}
            x2={p2.x * scale}
            y2={p2.y * scale}
            stroke="#00FF00"
            strokeWidth="3"
            strokeDasharray="5,5"
            opacity={0.8}
          />
        );
      }
    }

    if (type === 'angle' && selectedMeasurement.points && selectedMeasurement.points.length >= 3) {
      const p1 = findLandmark(selectedMeasurement.points[0]);
      const p2 = findLandmark(selectedMeasurement.points[1]);
      const p3 = findLandmark(selectedMeasurement.points[2]);

      if (p1 && p2 && p3) {
        return (
          <g>
            <line
              x1={p1.x * scale}
              y1={p1.y * scale}
              x2={p2.x * scale}
              y2={p2.y * scale}
              stroke="#00FF00"
              strokeWidth="3"
              opacity={0.8}
            />
            <line
              x1={p2.x * scale}
              y1={p2.y * scale}
              x2={p3.x * scale}
              y2={p3.y * scale}
              stroke="#00FF00"
              strokeWidth="3"
              opacity={0.8}
            />
            <circle
              cx={p2.x * scale}
              cy={p2.y * scale}
              r={30}
              fill="none"
              stroke="#00FF00"
              strokeWidth="2"
              strokeDasharray="3,3"
              opacity={0.5}
            />
          </g>
        );
      }
    }

    return null;
  };

  const visibleLandmarks = showCustomLandmarks
    ? landmarks
    : landmarks.filter(l => !l.isCustom);

  const renderImageContent = () => (
    <div
      ref={containerRef}
      style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Cephalometric X-ray"
        style={{
          maxWidth: '100%',
          maxHeight: isFullscreenModal ? '100vh' : 'calc(100vh - 350px)',
          display: 'block',
          objectFit: 'contain',
          userSelect: 'none',
          WebkitUserSelect: 'none' as any,
          pointerEvents: 'none' as any,
          filter: `contrast(${imageContrast}%)`,
          transition: 'filter 0.2s ease'
        } as React.CSSProperties}
        draggable={false}
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          setContainerDimensions({
            width: img.offsetWidth,
            height: img.offsetHeight
          });
        }}
      />

      {containerDimensions.width > 0 && (
        <svg
          ref={svgRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: containerDimensions.width,
            height: containerDimensions.height,
            pointerEvents: 'all',
            cursor: draggedLandmark ? 'grabbing' : 'default'
          }}
        >
          {renderMeasurementLines()}

          {visibleLandmarks.map((landmark) => {
            const scale = imageDimensions.width > 0 && containerDimensions.width > 0
              ? containerDimensions.width / imageDimensions.width
              : 1;
            const x = landmark.x * scale;
            const y = landmark.y * scale;

            const isHighlighted = selectedMeasurement?.points?.some(p =>
              p === landmark.id || p === landmark.name
            );

            const isDragging = draggedLandmark === landmark.id;

            return (
              <g key={landmark.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={landmarkSize}
                  fill={landmark.isCustom ? '#FFA500' : '#FF0000'}
                  stroke={isHighlighted ? '#00FF00' : '#FFFFFF'}
                  strokeWidth={isHighlighted ? 3 : 2}
                  style={{
                    cursor: editable ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    pointerEvents: editable ? 'all' : 'none'
                  }}
                  opacity={0.9}
                  onMouseDown={handleMouseDown(landmark.id)}
                  onContextMenu={landmark.isCustom ? handleRightClick(landmark.id) : undefined}
                />
                {showLandmarkLabels && (
                  <text
                    x={x + landmarkSize + 5}
                    y={y - 5}
                    fill="#FFFFFF"
                    fontSize="12"
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
            );
          })}
        </svg>
      )}
    </div>
  );

  return (
    <>
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.3)'
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {showControls && editable && (
          <>
            <Button
              icon={<DownloadOutlined />}
              onClick={saveImageWithLandmarks}
              size="small"
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                zIndex: 100,
                backgroundColor: 'rgba(255,255,240,0.9)',
                color: '#09185B',
                display: 'none'
              }}
              data-save-landmarks-btn
            >
              Save Overlay
            </Button>

            <Button
              icon={<span style={{ fontSize: '18px' }}>⛶</span>}
              onClick={() => setIsFullscreenModal(true)}
              size="small"
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                zIndex: 100,
                backgroundColor: 'rgba(255,255,240,0.9)',
                color: '#09185B'
              }}
              title="Fullscreen Image"
            />
          </>
        )}

        {renderImageContent()}
      </div>

      {/* Fullscreen Modal */}
      <Modal
        open={isFullscreenModal}
        onCancel={() => setIsFullscreenModal(false)}
        footer={null}
        width="100vw"
        style={{ top: 0, padding: 0, maxWidth: '100vw' }}
        bodyStyle={{
          padding: 0,
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        closable={true}
        closeIcon={<span style={{ color: '#FFFFFF', fontSize: '24px' }}>×</span>}
      >
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {renderImageContent()}
        </div>
      </Modal>
    </>
  );
};

export default LandmarkCanvas;
