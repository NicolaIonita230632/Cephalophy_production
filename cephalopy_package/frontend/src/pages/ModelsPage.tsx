import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Spin, message, Button, Space, Select } from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  LineChartOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { modelAPI } from '../services/api';
import { Line } from 'react-chartjs-2';

interface ModelMetrics {
  mre?: number;
  sdr_2mm?: number;
  sdr_2_5mm?: number;
  sdr_3mm?: number;
  sdr_4mm?: number;
}

interface Model {
  id: string;
  name: string;
  version: string;
  date: string;
  status: string;
  size_mb?: number;
  metrics?: ModelMetrics;
  is_production: boolean;
}

const ModelsPage: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activatingModelId, setActivatingModelId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>("mre");


  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const response = await modelAPI.getModels();
      setModels(response.models);
    } catch (error) {
      message.error('Failed to load models');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateModel = async (modelId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    setActivatingModelId(modelId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://ceph-backend-1022645602437.europe-west1.run.app'}/api/v1/models/${modelId}/activate`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        message.success('Model activated successfully!');
        loadModels(); // Reload to update active status
      } else {
        const error = await response.json();
        message.error(error.detail || 'Failed to activate model');
      }
    } catch (error) {
      message.error('Failed to activate model');
      console.error(error);
    } finally {
      setActivatingModelId(null);
    }
  };

  const handleCompareModels = () => {
    navigate('/models/compare');
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

  // TIMELINE DATA //
  const renderTimelineChart = () => {
    const modelsWithMetrics = models.filter(m => m.metrics);
    if (modelsWithMetrics.length === 0) return null;

    const sortedModels = [...modelsWithMetrics].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const metricOptions = [
      { value: "mre", label: "Mean Radial Error (MRE)" },
      { value: "sdr_2mm", label: "SDR @2mm" },
      { value: "sdr_2_5mm", label: "SDR @2.5mm" },
      { value: "sdr_3mm", label: "SDR @3mm" },
      { value: "sdr_4mm", label: "SDR @4mm" },
    ];

    const getMetricData = (metric: string) => {
      return sortedModels.map(model => {
        if (!model.metrics) return 0;
        const value = model.metrics[metric as keyof ModelMetrics];
        return value !== undefined ? value : 0;
      });
    };

    const timelineData = {
      labels: sortedModels.map(m => `${m.name} (${m.version})`),
      datasets: [
        {
          label: metricOptions.find(m => m.value === selectedMetric)?.label || "Metric",
          data: getMetricData(selectedMetric),
          borderColor: "rgba(24, 144, 255, 1)",
          backgroundColor: "rgba(24, 144, 255, 0.2)",
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 7,
          pointHoverRadius: 10,
          pointBackgroundColor: sortedModels.map(m =>
            m.status === "active" ? "rgba(82, 196, 26, 1)" : "rgba(24, 144, 255, 1)"
          ),
          pointBorderColor: "#FFFFFF",
          pointBorderWidth: 2,
          fill: true,
        },
      ],
    };

    const timelineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            color: "#FFFFFF",
            font: {
              size: 14,
              weight: "bold" as const,
            },
            padding: 15,
          },
        },
        title: {
          display: true,
          text: "Model Performance Over Time",
          color: "#FFFFFF",
          font: {
            size: 18,
            weight: "bold" as const,
          },
          padding: {
            bottom: 20,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          titleColor: "#FFFFFF",
          bodyColor: "#FFFFFF",
          borderColor: "rgba(255, 255, 255, 0.3)",
          borderWidth: 1,
          padding: 15,
          displayColors: true,
          callbacks: {
            title: function(context: any) {
              const index = context[0].dataIndex;
              const model = sortedModels[index];
              return `${model.name} - ${model.date}`;
            },
            label: function(context: any) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              const value = context.parsed.y;
              if (value !== null && value !== undefined) {
                if (selectedMetric === "mre") {
                  label += value.toFixed(2) + "mm";
                } else {
                  label += value.toFixed(1) + "%";
                }
              }
              return label;
            },
            afterLabel: function(context: any) {
              const index = context.dataIndex;
              const model = sortedModels[index];
              return model.status === "active" ? "✓ Currently Active" : "";
            }
          }
        },
      },
      scales: {
        y: {
          beginAtZero: selectedMetric !== "mre",
          reverse: selectedMetric === "mre",
          ticks: {
            color: "#FFFFFF",
            font: {
              size: 12,
            },
            callback: function(value: any) {
              if (selectedMetric === "mre") {
                return value.toFixed(2) + "mm";
              } else {
                return value + "%";
              }
            }
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          title: {
            display: true,
            text: selectedMetric === "mre" ? "Mean Radial Error (mm)" : "Success Detection Rate (%)",
            color: "#FFFFFF",
            font: {
              size: 13,
              weight: "bold" as const,
            },
          },
        },
        x: {
          ticks: {
            color: "#FFFFFF",
            font: {
              size: 11,
            },
            maxRotation: 45,
            minRotation: 45,
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          title: {
            display: true,
            text: "Model Version (Chronological Order)",
            color: "#FFFFFF",
            font: {
              size: 13,
              weight: "bold" as const,
            },
          },
        },
      },
    };
    // The Frontend part for the Timeline Chart.
    return (
      <div style={{
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "20px",
        padding: "32px",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        marginBottom: "32px",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <h3 style={{
            fontSize: "22px",
            fontWeight: "600",
            color: "#FFFFFF",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <ClockCircleOutlined /> Performance Timeline
          </h3>
          <Select
            value={selectedMetric}
            onChange={setSelectedMetric}
            style={{ width: 280 }}
            size="large"
            options={metricOptions}
          />
        </div>
        <div style={{ height: "450px", marginBottom: "20px" }}>
          <Line data={timelineData} options={timelineOptions} />
        </div>
        <div style={{
          padding: "20px",
          background: "rgba(255, 255, 255, 0.03)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "start", gap: "12px", marginBottom: "12px" }}>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "rgba(82, 196, 26, 1)",
              border: "2px solid #FFFFFF",
              marginTop: "4px",
              flexShrink: 0,
            }} />
            <span style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "14px", lineHeight: "1.6" }}>
              <strong style={{ color: "#FFFFFF" }}>Green points</strong> indicate the currently active model
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
            <span style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px", lineHeight: "1.6" }}>
              {selectedMetric === "mre"
                ? `Lower MRE values indicate better accuracy.
                  The Y-axis is reversed to show improvement trending upward.
                  MRE can translate to the distance between the true landmark
                  location and the prediction.`
                :`Higher SDR values indicate better performance.
                  The line shows the percentage of landmarks detected
                  within the threshold across different model versions.
                  SDR indicates the percentage of predictions that fall
                  below the milimeter threshold.`
              }
            </span>
          </div>
        </div>
      </div>
    );
  };


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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '48px',
        maxWidth: '1400px',
        margin: '0 auto 48px auto',
      }}>
        <h1
          style={{
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: '600',
            color: '#FFFFFF',
            margin: 0,
            letterSpacing: '-1px',
          }}
        >
          Models Library
        </h1>

        <Space size="middle">
          <Button
            type="default"
            icon={<LineChartOutlined />}
            onClick={handleCompareModels}
            size="large"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontWeight: '500',
              height: '48px',
              padding: '0 24px',
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
            Compare Models
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/models/retrain')}
            size="large"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF',
              fontWeight: '600',
              height: '48px',
              padding: '0 24px',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
            }}
          >
            Train New Model
          </Button>
        </Space>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Row gutter={[24, 24]}>
          {models.map((model) => (
            <Col xs={24} sm={12} lg={8} key={model.id}>
              <div
                onClick={() => navigate(`/models/${model.id}`)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px',
                  padding: '32px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h3 style={{
                      color: '#FFFFFF',
                      fontSize: '24px',
                      margin: 0,
                      fontWeight: '600',
                    }}>
                      {model.name}
                    </h3>
                    <Tag
                      color={model.status === 'active' ? 'green' : 'red'}
                      style={{
                        padding: '4px 12px',
                        fontSize: '14px',
                        borderRadius: '8px',
                        background: model.status === 'active'
                          ? 'rgba(82, 196, 26, 0.2)'
                          : 'rgba(255, 77, 79, 0.2)',
                        borderColor: model.status === 'active'
                          ? 'rgba(82, 196, 26, 0.4)'
                          : 'rgba(255, 77, 79, 0.4)',
                        color: '#FFFFFF',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      {model.status === 'active' ? (
                        <>
                          <CheckCircleOutlined /> Active
                        </>
                      ) : (
                        'Inactive'
                      )}
                    </Tag>
                  </div>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    margin: '8px 0 0 0',
                    fontSize: '16px',
                  }}>
                    Version: {model.version} | {model.date}
                  </p>
                  {model.size_mb && (
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: '4px 0 0 0',
                      fontSize: '14px',
                    }}>
                      Size: {model.size_mb} MB
                    </p>
                  )}
                </div>

                {model.metrics && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginBottom: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                    }}>
                      Performance:
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {model.metrics.mre !== undefined && (
                        <Tag
                          color="blue"
                          style={{
                            padding: '6px 14px',
                            fontSize: '14px',
                            borderRadius: '8px',
                            background: 'rgba(24, 144, 255, 0.2)',
                            borderColor: 'rgba(24, 144, 255, 0.4)',
                            color: '#FFFFFF',
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          MRE: {model.metrics.mre.toFixed(2)}mm
                        </Tag>
                      )}
                      {model.metrics.sdr_2mm !== undefined && (
                        <Tag
                          color="green"
                          style={{
                            padding: '6px 14px',
                            fontSize: '14px',
                            borderRadius: '8px',
                            background: 'rgba(82, 196, 26, 0.2)',
                            borderColor: 'rgba(82, 196, 26, 0.4)',
                            color: '#FFFFFF',
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          SDR@2mm: {model.metrics.sdr_2mm.toFixed(1)}%
                        </Tag>
                      )}
                    </div>
                  </div>
                )}

                {model.status !== 'active' && model.is_production && (
                  <Button
                    type="primary"
                    block
                    size="large"
                    icon={activatingModelId === model.id ? <SyncOutlined spin /> : <CheckCircleOutlined />}
                    onClick={(e) => handleActivateModel(model.id, e)}
                    loading={activatingModelId === model.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: '#FFFFFF',
                      height: '48px',
                      fontSize: '16px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Activate Model
                  </Button>
                )}
              </div>
            </Col>
          ))}
        </Row>

        {models.length === 0 && !isLoading && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              padding: '60px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
            }}
          >
            <h3 style={{
              color: '#FFFFFF',
              fontSize: '28px',
              fontWeight: '600',
              marginBottom: '16px',
            }}>
              No models available
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '18px',
              marginBottom: '32px',
            }}>
              Train your first model to get started
            </p>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/models/retrain')}
              size="large"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: '#FFFFFF',
                fontWeight: '600',
                height: '52px',
                padding: '0 32px',
                fontSize: '18px',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              Train New Model
            </Button>
          </div>
        )}
      </div>
      <div style={{paddingTop: "24px"}}>
        {renderTimelineChart()}
      </div>
    </div>
  );
};

export default ModelsPage;
