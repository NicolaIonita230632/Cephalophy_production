import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Select, message, Row, Col, Divider, Space, Tag, Table, Typography 
} from 'antd';
import { 
  LineChartOutlined, CheckCircleOutlined, InfoCircleOutlined 
} from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { modelAPI } from '../services/api';

const { Title: AntTitle, Paragraph, Text } = Typography;

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

interface ModelMetrics {
  mre: number;
  sdr_2mm: number;
  sdr_2_5mm: number;
  sdr_3mm: number;
  sdr_4mm: number;
}

interface ModelData {
  id: string;
  name: string;
  architecture: string;
  version: string;
  date: string;
  size_mb: number;
  metrics: ModelMetrics;
  successful_landmarks?: {
    '2mm': number;
    '2_5mm': number;
    '3mm': number;
    '4mm': number;
  };
  clinical_interpretation?: {
    accuracy: {
      level: string;
      color: string;
      description: string;
    };
    reliability: {
      level: string;
      color: string;
      description: string;
    };
  };
  dataset_info: {
    train_images: number;
    val_images: number;
    test_images: number;
  };
}

interface ComparisonData {
  models: ModelData[];
  winner_analysis?: any;
  recommendation?: any;
  total_landmarks: number;
}

interface AvailableModel {
  id: string;
  name: string;
  status: string;
}

const ClinicalModelComparison: React.FC = () => {
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [model1, setModel1] = useState<string | null>(null);
  const [model2, setModel2] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);

  const TOTAL_LANDMARKS = 19;

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    setLoading(true);
    try {
      const response = await modelAPI.getModels();
      console.log('Fetched models:', response.models);
      setAvailableModels(response.models);
    } catch (error) {
      message.error('Failed to fetch models');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!model1 || !model2) {
      message.warning('Please select two models to compare');
      return;
    }

    if (model1 === model2) {
      message.warning('Please select two different models');
      return;
    }

    console.log('Comparing models:', { model1, model2 });
    console.log('Model IDs being sent:', [model1, model2]);

    setComparing(true);
    try {
      const response = await modelAPI.compareClinical([model1, model2]);
      console.log('Comparison response:', response);
      setComparisonData(response);
      message.success('Models compared successfully');
    } catch (error: any) {
      message.error(error?.message || 'Failed to compare models');
      console.error('Comparison error:', error);
      console.error('Error response:', error.response?.data);
    } finally {
      setComparing(false);
    }
  };

  const calculateSuccessfulLandmarks = (sdrPercent: number): number => {
    return Math.round((sdrPercent / 100) * TOTAL_LANDMARKS);
  };

  const getSuccessfulLandmarksText = (sdrPercent: number, threshold: string): string => {
    const successful = calculateSuccessfulLandmarks(sdrPercent);
    const failed = TOTAL_LANDMARKS - successful;
    return `${successful} out of ${TOTAL_LANDMARKS} landmarks within ${threshold} (${failed} landmarks exceed this threshold)`;
  };

  const getClinicalInterpretation = (mre: number): { level: string; color: string; description: string } => {
    if (mre < 1.5) {
      return {
        level: 'Excellent',
        color: 'rgba(82, 196, 26, 0.2)',
        description: 'Clinically acceptable for most orthodontic applications. Errors are minimal and unlikely to affect treatment planning.'
      };
    } else if (mre < 2.0) {
      return {
        level: 'Good',
        color: 'rgba(24, 144, 255, 0.2)',
        description: 'Generally acceptable for clinical use. May require manual verification for critical landmarks in complex cases.'
      };
    } else if (mre < 3.0) {
      return {
        level: 'Fair',
        color: 'rgba(250, 173, 20, 0.2)',
        description: 'Borderline clinical utility. Predictions should be carefully reviewed before use in treatment planning.'
      };
    } else {
      return {
        level: 'Poor',
        color: 'rgba(255, 77, 79, 0.2)',
        description: 'Not recommended for clinical use without significant manual correction. High risk of treatment planning errors.'
      };
    }
  };

  const getSDRInterpretation = (sdr2mm: number): { level: string; color: string; description: string } => {
    if (sdr2mm >= 85) {
      return {
        level: 'Excellent',
        color: 'rgba(82, 196, 26, 0.2)',
        description: 'High reliability. Most landmarks are predicted within clinically acceptable tolerance.'
      };
    } else if (sdr2mm >= 75) {
      return {
        level: 'Good',
        color: 'rgba(24, 144, 255, 0.2)',
        description: 'Acceptable reliability for clinical use with verification of predictions.'
      };
    } else if (sdr2mm >= 60) {
      return {
        level: 'Fair',
        color: 'rgba(250, 173, 20, 0.2)',
        description: 'Limited reliability. Requires careful manual review of all predictions.'
      };
    } else {
      return {
        level: 'Poor',
        color: 'rgba(255, 77, 79, 0.2)',
        description: 'Insufficient reliability for clinical use. Manual landmark placement recommended.'
      };
    }
  };

  const renderComparisonCharts = () => {
    if (!comparisonData || comparisonData.models.length !== 2) return null;

    const [modelA, modelB] = comparisonData.models;

    // SDR Comparison Bar Chart
    const sdrData = {
      labels: ['2mm Threshold', '2.5mm Threshold', '3mm Threshold', '4mm Threshold'],
      datasets: [
        {
          label: modelA.name,
          data: [
            modelA.metrics.sdr_2mm,
            modelA.metrics.sdr_2_5mm,
            modelA.metrics.sdr_3mm,
            modelA.metrics.sdr_4mm,
          ],
          backgroundColor: 'rgba(24, 144, 255, 0.7)',
          borderColor: 'rgba(24, 144, 255, 1)',
          borderWidth: 2,
        },
        {
          label: modelB.name,
          data: [
            modelB.metrics.sdr_2mm,
            modelB.metrics.sdr_2_5mm,
            modelB.metrics.sdr_3mm,
            modelB.metrics.sdr_4mm,
          ],
          backgroundColor: 'rgba(82, 196, 26, 0.7)',
          borderColor: 'rgba(82, 196, 26, 1)',
          borderWidth: 2,
        },
      ],
    };

    const sdrOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#FFFFFF',
            font: {
              size: 14,
            },
          },
        },
        title: {
          display: true,
          text: 'Success Detection Rate Comparison (%)',
          color: '#FFFFFF',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: '#FFFFFF',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
        },
        x: {
          ticks: {
            color: '#FFFFFF',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    };

    // Radar Chart for Overall Performance
    const radarData = {
      labels: ['Accuracy (MRE)', 'SDR @2mm', 'SDR @2.5mm', 'SDR @3mm', 'SDR @4mm'],
      datasets: [
        {
          label: modelA.name,
          data: [
            100 - (modelA.metrics.mre / 5) * 100,
            modelA.metrics.sdr_2mm,
            modelA.metrics.sdr_2_5mm,
            modelA.metrics.sdr_3mm,
            modelA.metrics.sdr_4mm,
          ],
          backgroundColor: 'rgba(24, 144, 255, 0.2)',
          borderColor: 'rgba(24, 144, 255, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(24, 144, 255, 1)',
        },
        {
          label: modelB.name,
          data: [
            100 - (modelB.metrics.mre / 5) * 100,
            modelB.metrics.sdr_2mm,
            modelB.metrics.sdr_2_5mm,
            modelB.metrics.sdr_3mm,
            modelB.metrics.sdr_4mm,
          ],
          backgroundColor: 'rgba(82, 196, 26, 0.2)',
          borderColor: 'rgba(82, 196, 26, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(82, 196, 26, 1)',
        },
      ],
    };

    const radarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#FFFFFF',
            font: {
              size: 14,
            },
          },
        },
        title: {
          display: true,
          text: 'Overall Performance Profile',
          color: '#FFFFFF',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: '#FFFFFF',
            backdropColor: 'transparent',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
          pointLabels: {
            color: '#FFFFFF',
            font: {
              size: 12,
            },
          },
        },
      },
    };

    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        padding: '32px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '24px',
      }}>
        <Row gutter={[24, 24]}>
          <Col span={12}>
            <div style={{ height: '400px' }}>
              <Bar data={sdrData} options={sdrOptions} />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ height: '400px' }}>
              <Radar data={radarData} options={radarOptions} />
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  const renderClinicalInterpretation = () => {
    if (!comparisonData || comparisonData.models.length !== 2) return null;

    const [modelA, modelB] = comparisonData.models;
    const modelAAccuracy = getClinicalInterpretation(modelA.metrics.mre);
    const modelBAccuracy = getClinicalInterpretation(modelB.metrics.mre);
    const modelASDRInterpretation = getSDRInterpretation(modelA.metrics.sdr_2mm);
    const modelBSDRInterpretation = getSDRInterpretation(modelB.metrics.sdr_2mm);

    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        padding: '32px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#FFFFFF',
          marginBottom: '32px',
        }}>
          Clinical Interpretation
        </h3>
        <Row gutter={[32, 32]}>
          {/* Model A */}
          <Col span={12}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '28px',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              height: '100%',
            }}>
              <h2 style={{ 
                color: '#FFFFFF', 
                fontSize: '22px', 
                marginBottom: '24px',
                fontWeight: '600',
                borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                paddingBottom: '12px',
              }}>
                {modelA.name}
              </h2>
              
              {/* Accuracy Section */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
              }}>
                <h4 style={{ 
                  color: '#FFFFFF', 
                  fontSize: '16px', 
                  marginBottom: '12px',
                  fontWeight: '600',
                }}>
                  Accuracy Assessment
                </h4>
                <Tag 
                  style={{ 
                    fontSize: '14px', 
                    padding: '6px 16px',
                    background: modelAAccuracy.color,
                    borderColor: modelAAccuracy.color.replace('0.2', '0.5'),
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'inline-block',
                  }}
                >
                  {modelAAccuracy.level}
                </Tag>
                <p style={{ 
                  color: '#FFFFFF', 
                  fontSize: '16px',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}>
                  MRE: {modelA.metrics.mre.toFixed(2)}mm
                </p>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.75)', 
                  lineHeight: '1.6',
                  fontSize: '14px',
                  margin: 0,
                }}>
                  {modelAAccuracy.description}
                </p>
              </div>

              {/* Reliability Section */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <h4 style={{ 
                  color: '#FFFFFF', 
                  fontSize: '16px', 
                  marginBottom: '12px',
                  fontWeight: '600',
                }}>
                  Reliability Assessment
                </h4>
                <Tag 
                  style={{ 
                    fontSize: '14px', 
                    padding: '6px 16px',
                    background: modelASDRInterpretation.color,
                    borderColor: modelASDRInterpretation.color.replace('0.2', '0.5'),
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'inline-block',
                  }}
                >
                  {modelASDRInterpretation.level}
                </Tag>
                <p style={{ 
                  color: '#FFFFFF', 
                  fontSize: '15px',
                  marginBottom: '8px',
                  fontWeight: '600',
                  lineHeight: '1.4',
                }}>
                  {getSuccessfulLandmarksText(modelA.metrics.sdr_2mm, '2mm')}
                </p>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.75)', 
                  lineHeight: '1.6',
                  fontSize: '14px',
                  margin: 0,
                }}>
                  {modelASDRInterpretation.description}
                </p>
              </div>
            </div>
          </Col>

          {/* Model B */}
          <Col span={12}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '28px',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              height: '100%',
            }}>
              <h2 style={{ 
                color: '#FFFFFF', 
                fontSize: '22px', 
                marginBottom: '24px',
                fontWeight: '600',
                borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                paddingBottom: '12px',
              }}>
                {modelB.name}
              </h2>
              
              {/* Accuracy Section */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
              }}>
                <h4 style={{ 
                  color: '#FFFFFF', 
                  fontSize: '16px', 
                  marginBottom: '12px',
                  fontWeight: '600',
                }}>
                  Accuracy Assessment
                </h4>
                <Tag 
                  style={{ 
                    fontSize: '14px', 
                    padding: '6px 16px',
                    background: modelBAccuracy.color,
                    borderColor: modelBAccuracy.color.replace('0.2', '0.5'),
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'inline-block',
                  }}
                >
                  {modelBAccuracy.level}
                </Tag>
                <p style={{ 
                  color: '#FFFFFF', 
                  fontSize: '16px',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}>
                  MRE: {modelB.metrics.mre.toFixed(2)}mm
                </p>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.75)', 
                  lineHeight: '1.6',
                  fontSize: '14px',
                  margin: 0,
                }}>
                  {modelBAccuracy.description}
                </p>
              </div>

              {/* Reliability Section */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <h4 style={{ 
                  color: '#FFFFFF', 
                  fontSize: '16px', 
                  marginBottom: '12px',
                  fontWeight: '600',
                }}>
                  Reliability Assessment
                </h4>
                <Tag 
                  style={{ 
                    fontSize: '14px', 
                    padding: '6px 16px',
                    background: modelBSDRInterpretation.color,
                    borderColor: modelBSDRInterpretation.color.replace('0.2', '0.5'),
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'inline-block',
                  }}
                >
                  {modelBSDRInterpretation.level}
                </Tag>
                <p style={{ 
                  color: '#FFFFFF', 
                  fontSize: '15px',
                  marginBottom: '8px',
                  fontWeight: '600',
                  lineHeight: '1.4',
                }}>
                  {getSuccessfulLandmarksText(modelB.metrics.sdr_2mm, '2mm')}
                </p>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.75)', 
                  lineHeight: '1.6',
                  fontSize: '14px',
                  margin: 0,
                }}>
                  {modelBSDRInterpretation.description}
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  const renderMetricExplanation = () => {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        padding: '32px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#FFFFFF',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <InfoCircleOutlined /> Understanding the Metrics
        </h3>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong style={{ color: '#FFFFFF', fontSize: '16px' }}>Mean Radial Error (MRE):</Text>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', marginTop: '8px' }}>
              The average distance between the predicted landmark position and the true position, measured in millimeters. 
              Lower values indicate better accuracy. For orthodontic treatment planning, an MRE below 2mm is generally 
              considered clinically acceptable.
            </p>
          </div>

          <div>
            <Text strong style={{ color: '#FFFFFF', fontSize: '16px' }}>Success Detection Rate (SDR):</Text>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', marginTop: '8px' }}>
              The percentage of landmarks predicted within a specified distance threshold (2mm, 2.5mm, 3mm, or 4mm) from 
              the true position. For example, SDR@2mm of 87.4% means that <Text strong style={{ color: '#FFFFFF' }}>approximately 17 out of 19 landmarks</Text> are 
              within 2mm of their correct position, while <Text strong style={{ color: '#FFFFFF' }}>2 landmarks</Text> exceed this threshold.
            </p>
          </div>

          <div>
            <Text strong style={{ color: '#FFFFFF', fontSize: '16px' }}>Clinical Significance:</Text>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', marginTop: '8px' }}>
              The 2mm threshold is particularly important as it represents the minimum clinically significant error for 
              most cephalometric measurements. Landmarks within 2mm are generally reliable for treatment planning, while 
              those beyond 2mm may require manual verification or adjustment by the clinician.
            </p>
          </div>
        </Space>
      </div>
    );
  };

  const renderDetailedComparison = () => {
    if (!comparisonData || comparisonData.models.length !== 2) return null;

    const [modelA, modelB] = comparisonData.models;

    const comparisonData_table = [
      {
        key: 'mre',
        metric: 'Mean Radial Error (MRE)',
        unit: 'mm',
        modelA: modelA.metrics.mre.toFixed(2),
        modelB: modelB.metrics.mre.toFixed(2),
        better: modelA.metrics.mre < modelB.metrics.mre ? 'A' : 'B',
        clinical: 'Lower is better - indicates higher overall accuracy',
      },
      {
        key: 'sdr_2mm',
        metric: 'Success Detection Rate @2mm',
        unit: '%',
        modelA: `${modelA.metrics.sdr_2mm.toFixed(1)}% (${calculateSuccessfulLandmarks(modelA.metrics.sdr_2mm)}/19)`,
        modelB: `${modelB.metrics.sdr_2mm.toFixed(1)}% (${calculateSuccessfulLandmarks(modelB.metrics.sdr_2mm)}/19)`,
        better: modelA.metrics.sdr_2mm > modelB.metrics.sdr_2mm ? 'A' : 'B',
        clinical: 'Clinical acceptability threshold - landmarks within 2mm',
      },
      {
        key: 'sdr_2_5mm',
        metric: 'Success Detection Rate @2.5mm',
        unit: '%',
        modelA: `${modelA.metrics.sdr_2_5mm.toFixed(1)}% (${calculateSuccessfulLandmarks(modelA.metrics.sdr_2_5mm)}/19)`,
        modelB: `${modelB.metrics.sdr_2_5mm.toFixed(1)}% (${calculateSuccessfulLandmarks(modelB.metrics.sdr_2_5mm)}/19)`,
        better: modelA.metrics.sdr_2_5mm > modelB.metrics.sdr_2_5mm ? 'A' : 'B',
        clinical: 'Moderate tolerance threshold',
      },
      {
        key: 'sdr_3mm',
        metric: 'Success Detection Rate @3mm',
        unit: '%',
        modelA: `${modelA.metrics.sdr_3mm.toFixed(1)}% (${calculateSuccessfulLandmarks(modelA.metrics.sdr_3mm)}/19)`,
        modelB: `${modelB.metrics.sdr_3mm.toFixed(1)}% (${calculateSuccessfulLandmarks(modelB.metrics.sdr_3mm)}/19)`,
        better: modelA.metrics.sdr_3mm > modelB.metrics.sdr_3mm ? 'A' : 'B',
        clinical: 'Generous tolerance threshold',
      },
      {
        key: 'sdr_4mm',
        metric: 'Success Detection Rate @4mm',
        unit: '%',
        modelA: `${modelA.metrics.sdr_4mm.toFixed(1)}% (${calculateSuccessfulLandmarks(modelA.metrics.sdr_4mm)}/19)`,
        modelB: `${modelB.metrics.sdr_4mm.toFixed(1)}% (${calculateSuccessfulLandmarks(modelB.metrics.sdr_4mm)}/19)`,
        better: modelA.metrics.sdr_4mm > modelB.metrics.sdr_4mm ? 'A' : 'B',
        clinical: 'Maximum acceptable tolerance',
      },
    ];

    const columns = [
      {
        title: 'Metric',
        dataIndex: 'metric',
        key: 'metric',
        width: 250,
        render: (text: string) => <Text strong style={{ color: '#1a1a2e' }}>{text}</Text>,
      },
      {
        title: modelA.name,
        dataIndex: 'modelA',
        key: 'modelA',
        width: 200,
        render: (text: string, record: any) => (
          <Space>
            <span style={{ color: '#1a1a2e' }}>{text}</span>
            {record.better === 'A' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          </Space>
        ),
      },
      {
        title: modelB.name,
        dataIndex: 'modelB',
        key: 'modelB',
        width: 200,
        render: (text: string, record: any) => (
          <Space>
            <span style={{ color: '#1a1a2e' }}>{text}</span>
            {record.better === 'B' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          </Space>
        ),
      },
      {
        title: 'Clinical Meaning',
        dataIndex: 'clinical',
        key: 'clinical',
        render: (text: string) => <Text style={{ fontSize: '12px', color: '#666' }}>{text}</Text>,
      },
    ];

    return (
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#1a1a2e',
          marginBottom: '20px',
        }}>
          Detailed Metric Comparison
        </h3>
        <Table 
          columns={columns} 
          dataSource={comparisonData_table} 
          pagination={false}
          size="middle"
        />
      </div>
    );
  };

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 70px)',
      width: '100%',
      padding: '60px 5%', 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '40px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '32px',
        }}>
          <h1 style={{
            fontSize: 'clamp(32px, 4vw, 40px)',
            fontWeight: '600',
            color: '#FFFFFF',
            marginBottom: '16px',
            letterSpacing: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <LineChartOutlined /> Clinical Model Comparison
          </h1>
          <p style={{ 
            marginBottom: '32px', 
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px',
            lineHeight: '1.6',
          }}>
            Compare two models side-by-side with clinical interpretations and performance visualizations. 
            Select two models to analyze their accuracy, reliability, and suitability for orthodontic applications.
          </p>

          <Row gutter={16} style={{ marginBottom: '0' }}>
            <Col span={10}>
              <Text strong style={{ color: '#FFFFFF', fontSize: '16px' }}>Model A:</Text>
              <Select
                style={{ width: '100%', marginTop: '12px' }}
                placeholder="Select first model"
                value={model1}
                onChange={setModel1}
                loading={loading}
                size="large"
                options={availableModels.map(m => ({
                  label: (
                    <Space>
                      {m.name}
                      {m.status === 'active' && (
                        <Tag 
                          style={{
                            background: 'rgba(82, 196, 26, 0.2)',
                            borderColor: 'rgba(82, 196, 26, 0.4)',
                            color: '#52c41a',
                          }}
                        >
                          Active
                        </Tag>
                      )}
                    </Space>
                  ),
                  value: m.id,
                }))}
              />
            </Col>
            <Col span={10}>
              <Text strong style={{ color: '#FFFFFF', fontSize: '16px' }}>Model B:</Text>
              <Select
                style={{ width: '100%', marginTop: '12px' }}
                placeholder="Select second model"
                value={model2}
                onChange={setModel2}
                loading={loading}
                size="large"
                options={availableModels
                  .filter(m => m.id !== model1)
                  .map(m => ({
                    label: (
                      <Space>
                        {m.name}
                        {m.status === 'active' && (
                          <Tag 
                            style={{
                              background: 'rgba(82, 196, 26, 0.2)',
                              borderColor: 'rgba(82, 196, 26, 0.4)',
                              color: '#52c41a',
                            }}
                          >
                            Active
                          </Tag>
                        )}
                      </Space>
                    ),
                    value: m.id,
                  }))}
              />
            </Col>
            <Col span={4}>
              <div style={{ marginTop: '36px' }}>
                <Button
                  type="primary"
                  block
                  size="large"
                  onClick={handleCompare}
                  loading={comparing}
                  disabled={!model1 || !model2}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#FFFFFF',
                    fontWeight: '600',
                    height: '48px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                  }}
                  onMouseEnter={(e) => {
                    if (!comparing && model1 && model2) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  Compare
                </Button>
              </div>
            </Col>
          </Row>
        </div>

        {comparisonData && (
          <>
            {renderMetricExplanation()}
            {renderClinicalInterpretation()}
            {renderComparisonCharts()}
            {renderDetailedComparison()}
          </>
        )}
      </div>
    </div>
  );
};

export default ClinicalModelComparison;
