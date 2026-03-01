import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Spin, message, Tag, Statistic, Row, Col } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { modelAPI } from '@/services/api';

interface ModelDetails {
  id: string;
  name: string;
  version: string;
  status: string;
  is_production: boolean;
  metrics: {
    mre: number;
    sdr_2mm: number;
    sdr_2_5mm: number;
    sdr_3mm: number;
    sdr_4mm: number;
  };
  metadata: any;
}

const ModelDetailPage: React.FC = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const [modelDetails, setModelDetails] = useState<ModelDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);

  useEffect(() => {
    loadModelDetails();
    loadActiveModel();
  }, [modelId]);

  const loadActiveModel = async () => {
    try {
      const response = await modelAPI.getActiveModel();
      console.log('Active model full response:', JSON.stringify(response, null, 2));
      console.log('Active model response keys:', Object.keys(response));
      // The API returns { active_model: "ModelName", ... }
      const activeId = response.active_model || response.id || response.model_id || response.name || response.model_name;
      console.log('Active model ID:', activeId);
      setActiveModelId(activeId);
    } catch (error) {
      console.error('Failed to load active model:', error);
      // If we can't get active model, we'll rely on is_production flag
    }
  };

  const loadModelDetails = async () => {
    if (!modelId) return;
    
    setIsLoading(true);
    try {
      const response = await modelAPI.getModelDetails(modelId);
      console.log('Model details full response:', JSON.stringify(response, null, 2));
      console.log('Model details response keys:', Object.keys(response));
      console.log('Current model ID:', response.id);
      setModelDetails(response);
    } catch (error) {
      message.error('Failed to load model details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 70px)',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 70px)',
        width: '100%',
        padding: '60px 5%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/models')}
          size="large"
          style={{
            marginBottom: '32px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            fontWeight: '500',
            height: '44px',
            padding: '0 20px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          Back to Models
        </Button>

        {modelDetails ? (
          <>
            {/* Header with Model Name and Status */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '40px',
            }}>
              <h1
                style={{
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  margin: 0,
                  letterSpacing: '-1px',
                }}
              >
                {modelDetails.name}
              </h1>

              {(() => {
                // Compare the active model name with the current model's name
                // Only match if the names exactly match - no fallbacks
                const isActive = modelDetails.name === activeModelId;
                
                console.log('Is model active?', isActive, {
                  modelId: modelDetails.id,
                  modelName: modelDetails.name,
                  activeModelId,
                  comparison: `${modelDetails.name} === ${activeModelId}`,
                  exactMatch: modelDetails.name === activeModelId
                });

                return (
                  <Tag 
                    style={{ 
                      fontSize: '16px', 
                      padding: '8px 20px',
                      background: isActive 
                        ? 'rgba(82, 196, 26, 0.2)' 
                        : 'rgba(255, 77, 79, 0.2)',
                      borderColor: isActive 
                        ? 'rgba(82, 196, 26, 0.4)' 
                        : 'rgba(255, 77, 79, 0.4)',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {isActive ? (
                      <>
                        <CheckCircleOutlined /> Active
                      </>
                    ) : (
                      'Inactive'
                    )}
                  </Tag>
                );
              })()}
            </div>

            {/* Model Info Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                padding: '32px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '32px',
              }}
            >
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#FFFFFF',
                marginBottom: '24px',
              }}>
                Model Information
              </h3>

              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '20px',
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: '0 0 4px 0' }}>
                        Version
                      </p>
                      <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                        {modelDetails.version}
                      </p>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: '0 0 4px 0' }}>
                        Model ID
                      </p>
                      <p style={{ color: '#FFFFFF', fontSize: '16px', margin: 0, fontFamily: 'monospace' }}>
                        {modelDetails.id}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: '0 0 4px 0' }}>
                        Retrain Date
                      </p>
                      <p style={{ color: '#FFFFFF', fontSize: '16px', margin: 0 }}>
                        {modelDetails.metadata?.retrain_date || 'N/A'}
                      </p>
                    </div>
                  </div>
                </Col>

                <Col span={12}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '20px',
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: '0 0 4px 0' }}>
                        Images Used
                      </p>
                      <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                        {modelDetails.metadata?.num_new_images || 'N/A'}
                      </p>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: '0 0 4px 0' }}>
                        Epochs
                      </p>
                      <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                        {modelDetails.metadata?.fine_tune_epochs || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', margin: '0 0 4px 0' }}>
                        Final Loss
                      </p>
                      <p style={{ color: '#FFFFFF', fontSize: '16px', margin: 0, fontFamily: 'monospace' }}>
                        {modelDetails.metadata?.final_loss?.toFixed(6) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Performance Metrics Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                padding: '32px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#FFFFFF',
                marginBottom: '32px',
              }}>
                Performance Metrics
              </h3>

              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} md={6}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                  }}>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      fontSize: '14px', 
                      margin: '0 0 8px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      MRE
                    </p>
                    <p style={{ 
                      color: '#FFFFFF', 
                      fontSize: '36px', 
                      fontWeight: '700', 
                      margin: '0 0 4px 0',
                      lineHeight: '1',
                    }}>
                      {modelDetails.metrics.mre.toFixed(2)}
                    </p>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      fontSize: '14px', 
                      margin: 0,
                    }}>
                      mm
                    </p>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                  }}>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      fontSize: '14px', 
                      margin: '0 0 8px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      SDR @ 2mm
                    </p>
                    <p style={{ 
                      color: '#FFFFFF', 
                      fontSize: '36px', 
                      fontWeight: '700', 
                      margin: '0 0 4px 0',
                      lineHeight: '1',
                    }}>
                      {modelDetails.metrics.sdr_2mm.toFixed(1)}
                    </p>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      fontSize: '14px', 
                      margin: 0,
                    }}>
                      %
                    </p>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                  }}>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      fontSize: '14px', 
                      margin: '0 0 8px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      SDR @ 2.5mm
                    </p>
                    <p style={{ 
                      color: '#FFFFFF', 
                      fontSize: '36px', 
                      fontWeight: '700', 
                      margin: '0 0 4px 0',
                      lineHeight: '1',
                    }}>
                      {modelDetails.metrics.sdr_2_5mm.toFixed(1)}
                    </p>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      fontSize: '14px', 
                      margin: 0,
                    }}>
                      %
                    </p>
                  </div>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                  }}>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      fontSize: '14px', 
                      margin: '0 0 8px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      SDR @ 3mm
                    </p>
                    <p style={{ 
                      color: '#FFFFFF', 
                      fontSize: '36px', 
                      fontWeight: '700', 
                      margin: '0 0 4px 0',
                      lineHeight: '1',
                    }}>
                      {modelDetails.metrics.sdr_3mm.toFixed(1)}
                    </p>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      fontSize: '14px', 
                      margin: 0,
                    }}>
                      %
                    </p>
                  </div>
                </Col>
              </Row>
            </div>
          </>
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '60px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
          }}>
            <h3 style={{ 
              color: '#FFFFFF',
              fontSize: '24px',
            }}>
              Model not found
            </h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelDetailPage;