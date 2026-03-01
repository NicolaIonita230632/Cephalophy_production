import React, { useState, useEffect } from 'react';
import {
  Button,
  Progress,
  Table,
  Modal,
  InputNumber,
  Space,
  message,
  Tag,
  Statistic,
  Row,
  Col,
  Alert,
  Spin,
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { retrainingAPI } from '@/services/api';
import type {
  DataValidationResponse,
  RetrainingJobStatus,
  RetrainingHistoryItem,
} from '@/types/retraining';

const ModelRetrainingPage: React.FC = () => {
  const [dataStatus, setDataStatus] = useState<DataValidationResponse | null>(null);
  const [isLoadingValidation, setIsLoadingValidation] = useState(false);
  const [currentJob, setCurrentJob] = useState<RetrainingJobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [history, setHistory] = useState<RetrainingHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [config, setConfig] = useState({
    epochs: 20,
    learning_rate: 0.00001,
    batch_size: 4,
  });

  useEffect(() => {
    checkDataStatus();
    loadHistory();
  }, []);

  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const status = await retrainingAPI.getJobStatus(currentJob.job_id);
        setCurrentJob(status);

        if (status.status === 'completed' || status.status === 'failed') {
          setIsPolling(false);
          clearInterval(interval);
          loadHistory();
          checkDataStatus();
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentJob]);

  const checkDataStatus = async () => {
    setIsLoadingValidation(true);
    try {
      const response = await retrainingAPI.validateData();
      setDataStatus(response);
    } catch (error) {
      message.error('Failed to check data status');
      console.error(error);
    } finally {
      setIsLoadingValidation(false);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await retrainingAPI.getHistory(10);
      setHistory(response.jobs);
    } catch (error) {
      message.error('Failed to load retraining history');
      console.error(error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleStartRetraining = () => {
    if (!dataStatus?.ready_for_retraining) {
      Modal.confirm({
        title: 'Not Enough Data',
        content: dataStatus?.message || 'Minimum 50 images required',
        okText: 'Force Start Anyway',
        cancelText: 'Cancel',
        onOk: () => triggerRetraining(true),
      });
    } else {
      setIsConfigModalOpen(true);
    }
  };

  const triggerRetraining = async (force: boolean = false) => {
    try {
      const response = await retrainingAPI.triggerRetraining({
        force,
        epochs: config.epochs,
        learning_rate: config.learning_rate,
        batch_size: config.batch_size,
      });

      if (response.job_id) {
        message.success('Retraining started!');
        setCurrentJob({
          job_id: response.job_id,
          status: 'pending',
          progress_percentage: 0,
          started_at: new Date().toISOString(),
          completed_at: null,
          duration_seconds: null,
          num_images_processed: null,
          num_annotations_processed: null,
          backup_model_path: null,
          new_model_path: null,
          metrics: null,
          error_message: null,
          current_step: 'Initializing...',
        });
        setIsConfigModalOpen(false);
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error('Failed to start retraining');
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'training': return 'processing';
      default: return 'default';
    }
  };

  const historyColumns = [
    {
      title: 'Job ID',
      dataIndex: 'job_id',
      key: 'job_id',
      render: (id: string) => (
        <span style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>
          {id.slice(0, 8)}...
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Started',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (date: string) => (
        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          {new Date(date).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration_seconds',
      key: 'duration',
      render: (seconds: number | null) => (
        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          {seconds ? `${Math.floor(seconds / 60)} min` : '-'}
        </span>
      ),
    },
    {
      title: 'Images',
      dataIndex: 'num_images_processed',
      key: 'images',
      render: (num: number | null) => (
        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          {num || '-'}
        </span>
      ),
    },
    {
      title: 'Result',
      dataIndex: 'success',
      key: 'result',
      render: (success: boolean) =>
        success ? (
          <CheckCircleOutlined style={{ color: '#4ADE80', fontSize: '18px' }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#EF4444', fontSize: '18px' }} />
        ),
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
      position: 'relative',

    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="rgba(255,255,255,0.02)" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        opacity: 0.3,
      }} />

      {/* Header Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        padding: '80px 5% 40px',
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '8px',
            letterSpacing: '-1.5px',
          }}>
            Model Retraining
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
          }}>
            Train new models with your collected data
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 5% 80px',
        zIndex: 1,
      }}>
        {/* Data Collection Status Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '32px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              margin: 0,
            }}>
              Data Collection Status
            </h2>
            <button
              onClick={checkDataStatus}
              disabled={isLoadingValidation}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '8px 16px',
                color: '#FFFFFF',
                fontSize: '14px',
                cursor: isLoadingValidation ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoadingValidation) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <SyncOutlined spin={isLoadingValidation} />
              Refresh
            </button>
          </div>

          {isLoadingValidation ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : dataStatus && (
            <>
              <Row gutter={24} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '8px',
                    }}>
                      New Images
                    </div>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#60A5FA',
                    }}>
                      {dataStatus.num_images}
                      <span style={{
                        fontSize: '16px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        marginLeft: '8px',
                      }}>
                        / {dataStatus.min_required}
                      </span>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '8px',
                    }}>
                      Annotations
                    </div>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#A78BFA',
                    }}>
                      {dataStatus.num_annotations}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div style={{
                    background: 'rgba(236, 72, 153, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(236, 72, 153, 0.2)',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '8px',
                    }}>
                      Matched Pairs
                    </div>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#F472B6',
                    }}>
                      {dataStatus.matched_pairs}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginBottom: '8px',
                    }}>
                      Progress
                    </div>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#4ADE80',
                    }}>
                      {Math.min(100, Math.floor((dataStatus.num_images / dataStatus.min_required) * 100))}%
                    </div>
                  </div>
                </Col>
              </Row>

              <div style={{
                background: dataStatus.ready_for_retraining
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(59, 130, 246, 0.1)',
                border: dataStatus.ready_for_retraining
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                {dataStatus.ready_for_retraining ? (
                  <CheckCircleOutlined style={{ fontSize: '20px', color: '#4ADE80' }} />
                ) : (
                  <SyncOutlined style={{ fontSize: '20px', color: '#60A5FA' }} />
                )}
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    marginBottom: '4px',
                  }}>
                    {dataStatus.ready_for_retraining ? 'Ready for Retraining' : 'Not Ready'}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}>
                    {dataStatus.message}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartRetraining}
                disabled={isPolling}
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)',
                  border: '2px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '12px',
                  padding: '14px 32px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isPolling ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  opacity: isPolling ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isPolling) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <SyncOutlined />
                {dataStatus.ready_for_retraining ? 'Start Retraining' : 'Force Start Retraining'}
              </button>
            </>
          )}
        </div>

        {/* Current Job Card */}
        {currentJob && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '32px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '24px',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '20px',
            }}>
              Current Job: <span style={{ fontFamily: 'monospace', color: '#60A5FA' }}>{currentJob.job_id.slice(0, 8)}...</span>
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <Tag color={getStatusColor(currentJob.status)} style={{ fontSize: '14px', padding: '4px 12px' }}>
                {currentJob.status.toUpperCase()}
              </Tag>
              <span style={{ marginLeft: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                {currentJob.current_step}
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Progress
                percent={currentJob.progress_percentage || 0}
                status={
                  currentJob.status === 'completed' ? 'success' :
                  currentJob.status === 'failed' ? 'exception' :
                  'active'
                }
                strokeColor={{
                  '0%': '#60A5FA',
                  '100%': '#A78BFA',
                }}
                trailColor="rgba(255, 255, 255, 0.1)"
              />
            </div>

            <Row gutter={16} style={{ marginBottom: '20px' }}>
              {currentJob.num_images_processed && (
                <Col xs={24} sm={8}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                      Images Processed
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF' }}>
                      {currentJob.num_images_processed}
                    </div>
                  </div>
                </Col>
              )}
              {currentJob.duration_seconds && (
                <Col xs={24} sm={8}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                      Duration
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF' }}>
                      {Math.floor(currentJob.duration_seconds / 60)} <span style={{ fontSize: '16px' }}>min</span>
                    </div>
                  </div>
                </Col>
              )}
              {currentJob.metrics && (
                <Col xs={24} sm={8}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                      Final Loss
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF' }}>
                      {currentJob.metrics.final_loss.toFixed(6)}
                    </div>
                  </div>
                </Col>
              )}
            </Row>

            {currentJob.error_message && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <CloseCircleOutlined style={{ fontSize: '20px', color: '#EF4444' }} />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                    Failed
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {currentJob.error_message}
                  </div>
                </div>
              </div>
            )}

            {currentJob.status === 'completed' && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <CheckCircleOutlined style={{ fontSize: '20px', color: '#4ADE80' }} />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '4px' }}>
                    Completed!
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Restart backend to load new model
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '32px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <HistoryOutlined />
              History
            </h2>
            <button
              onClick={loadHistory}
              disabled={isLoadingHistory}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '8px 16px',
                color: '#FFFFFF',
                fontSize: '14px',
                cursor: isLoadingHistory ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoadingHistory) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <SyncOutlined spin={isLoadingHistory} />
              Refresh
            </button>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <Table
              columns={historyColumns}
              dataSource={history}
              rowKey="job_id"
              loading={isLoadingHistory}
              pagination={{ pageSize: 5 }}
              style={{
                background: 'transparent',
              }}
            />
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      <Modal
        title={
          <span style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <SettingOutlined />
            Configuration
          </span>
        }
        open={isConfigModalOpen}
        onOk={() => triggerRetraining(false)}
        onCancel={() => setIsConfigModalOpen(false)}
        okText="Start Training"
        okButtonProps={{
          style: {
            background: '#09185B',
            borderColor: '#09185B',
            height: '40px',
            fontSize: '16px',
            fontWeight: '500',
          }
        }}
        cancelButtonProps={{
          style: {
            height: '40px',
            fontSize: '16px',
          }
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#000',
              fontWeight: '500',
            }}>
              Epochs:
            </label>
            <InputNumber
              min={1}
              max={100}
              value={config.epochs}
              onChange={(v) => setConfig({ ...config, epochs: v || 20 })}
              style={{ width: '100%', height: '40px' }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#000',
              fontWeight: '500',
            }}>
              Learning Rate:
            </label>
            <InputNumber
              min={0.000001}
              max={0.01}
              step={0.000001}
              value={config.learning_rate}
              onChange={(v) => setConfig({ ...config, learning_rate: v || 0.00001 })}
              style={{ width: '100%', height: '40px' }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#000',
              fontWeight: '500',
            }}>
              Batch Size:
            </label>
            <InputNumber
              min={1}
              max={32}
              value={config.batch_size}
              onChange={(v) => setConfig({ ...config, batch_size: v || 4 })}
              style={{ width: '100%', height: '40px' }}
            />
          </div>
          <Alert
            message="Retraining takes 20-40 minutes"
            type="info"
            showIcon
            style={{ marginTop: '8px' }}
          />
        </Space>
      </Modal>
    </div>
  );
};

export default ModelRetrainingPage;
