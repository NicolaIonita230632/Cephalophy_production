import React, { useState } from 'react';
import { Tabs, message } from 'antd';
import {
  ScanOutlined,
  EditOutlined,
  LineChartOutlined,
  FileTextOutlined,
  AimOutlined
} from '@ant-design/icons';
import ManualDetection from '@/components/analysis/ManualDetection';
import LandmarkDetection from '@/components/analysis/LandmarkDetection';
import LandmarkCorrection from '@/components/analysis/LandmarkCorrection';
import CephalometricAnalysis from '@/components/analysis/CephalometricAnalysis';
import ReportPreview from '@/components/analysis/ReportPreview';
import { useLandmarkStore } from '@/stores/landmarkStore';

const AnalysisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('detection');
  const { currentImage, landmarks, manualLandmarks } = useLandmarkStore();

  const { setPage1Frozen, setPage2Frozen } = useLandmarkStore();
  const handleTabChange = async (key: string) => {
    if (key === "detection") {
      setPage1Frozen(false);
      setPage2Frozen(true);
    }
    if (key === "correction") {
      setPage1Frozen(true);
      setPage2Frozen(false);
    }
    if (key === "manual") {
      setPage1Frozen(true);
      setPage2Frozen(true);
    }
    if (key === "analysis") {
      setPage1Frozen(true);
      setPage2Frozen(true);
    }
    if (key === 'correction' && !currentImage) {
      message.warning('Please upload and analyze an image first');
      return;
    }
    // Only restrict analysis tab if there are no landmarks at all (manual or predicted)
    if (key === 'analysis' && landmarks.length === 0 && manualLandmarks.length === 0) {
      message.warning('Please detect or add landmarks first');
      return;
    }
    setActiveTab(key);
  };

  const tabItems = [
    {
      key: 'detection',
      label: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          color: activeTab === 'detection' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
          fontSize: '16px',
          fontWeight: activeTab === 'detection' ? '600' : '500',
          transition: 'all 0.3s ease',
        }}>
          <ScanOutlined style={{ fontSize: '18px' }} />
          Landmark Detection
        </div>
      ),
      children: <LandmarkDetection onComplete={() => setActiveTab('correction')} />,
    },
    {
      key: 'correction',
      label: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          color: activeTab === 'correction' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
          fontSize: '16px',
          fontWeight: activeTab === 'correction' ? '600' : '500',
          transition: 'all 0.3s ease',
          opacity: !currentImage ? 0.5 : 1,
        }}>
          <EditOutlined style={{ fontSize: '18px' }} />
          Landmark Correction
        </div>
      ),
      children: <LandmarkCorrection onComplete={() => setActiveTab('manual')} />,
      disabled: !currentImage,
    },
    {
      key: 'manual',
      label: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          color: activeTab === 'manual' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
          fontSize: '16px',
          fontWeight: activeTab === 'manual' ? '600' : '500',
          transition: 'all 0.3s ease',
          opacity: !currentImage ? 0.5 : 1,
        }}>
          <AimOutlined style={{ fontSize: '18px' }} />
          Manual Detection
        </div>
      ),
      children: <ManualDetection onComplete={() => setActiveTab('analysis')} />,
      disabled: !currentImage,  // Locked until image is uploaded
    },
    {
      key: 'analysis',
      label: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          color: activeTab === 'analysis' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
          fontSize: '16px',
          fontWeight: activeTab === 'analysis' ? '600' : '500',
          transition: 'all 0.3s ease',
          opacity: (landmarks.length === 0 && manualLandmarks.length === 0) ? 0.5 : 1,
        }}>
          <LineChartOutlined style={{ fontSize: '18px' }} />
          Cephalometric Analysis
        </div>
      ),
      children: <CephalometricAnalysis />,
      disabled: landmarks.length === 0 && manualLandmarks.length === 0,  // Check both landmark types
    },
    {
      key: 'report',
      label: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          color: activeTab === 'report' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
          fontSize: '16px',
          fontWeight: activeTab === 'report' ? '600' : '500',
          transition: 'all 0.3s ease',
          opacity: (landmarks.length === 0 && manualLandmarks.length === 0) ? 0.5 : 1,
        }}>
          <FileTextOutlined style={{ fontSize: '18px' }} />
          Generate PDF
        </div>
      ),
      children: <ReportPreview />,
      disabled: landmarks.length === 0 && manualLandmarks.length === 0,  // Check both landmark types
    }
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
        padding: '60px 5% 20px',
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
        }}>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '8px',
            letterSpacing: '-1px',
          }}>
            Cephalometric Analysis
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
          }}>
            Upload, detect landmarks, and analyze your cephalometric radiographs
          </p>
        </div>
      </div>

      {/* Tabs Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '0 5% 40px',
        zIndex: 1,
      }}>
        {/* Custom Tab Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px',
          overflowX: 'auto',
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          {tabItems.map((item) => (
            <button
              key={item.key}
              onClick={() => !item.disabled && handleTabChange(item.key)}
              disabled={item.disabled}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '16px 24px',
                background: activeTab === item.key
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)'
                  : 'transparent',
                border: activeTab === item.key
                  ? '2px solid rgba(59, 130, 246, 0.4)'
                  : '2px solid transparent',
                borderRadius: '12px',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: item.disabled ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!item.disabled && activeTab !== item.key) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!item.disabled && activeTab !== item.key) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '20px',
          padding: '32px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minHeight: '500px',
        }}>
          {tabItems.find(item => item.key === activeTab)?.children}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
