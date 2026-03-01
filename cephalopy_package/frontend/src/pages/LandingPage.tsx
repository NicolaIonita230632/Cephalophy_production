import { useNavigate } from 'react-router-dom';
import {
  RocketOutlined,
  LineChartOutlined,
  InfoCircleOutlined,
  AppstoreOutlined
} from '@ant-design/icons';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
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

      {/* Main Content Container */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        padding: '40px 5%',
        maxWidth: '1200px',
        width: '100%',
      }}>
        {/* Main Title */}
        <h1 style={{
          fontSize: 'clamp(56px, 10vw, 120px)',
          fontWeight: '700',
          color: '#FFFFFF',
          marginBottom: '24px',
          letterSpacing: '-3px',
          lineHeight: '1',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          CephaloMetrics
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(24px, 4vw, 36px)',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '80px',
          fontWeight: '400',
          letterSpacing: '-0.5px',
        }}>
          AI-Powered Anatomical Landmark Detection
        </p>

        {/* Feature Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '60px',
          width: '100%',
        }}>
          {/* Start Analysis - Primary Card */}
          <div
            onClick={() => navigate('/analysis')}
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
              borderRadius: '24px',
              padding: '48px 32px',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <LineChartOutlined style={{
              fontSize: '48px',
              color: '#60A5FA',
              marginBottom: '20px',
              display: 'block',
            }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}>
              Start Analysis
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0',
              lineHeight: '1.5',
            }}>
              Upload and analyze your cephalometric images with AI-powered landmark detection
            </p>
          </div>

          {/* Models Card */}
          <div
            onClick={() => navigate('/models')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '24px',
              padding: '48px 32px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <AppstoreOutlined style={{
              fontSize: '48px',
              color: '#FFFFFF',
              marginBottom: '20px',
              display: 'block',
            }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}>
              Models
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0',
              lineHeight: '1.5',
            }}>
              Explore our AI models trained on diverse anatomical datasets
            </p>
          </div>

          {/* Getting Started Card */}
          <div
            onClick={() => navigate('/getting-started')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '24px',
              padding: '48px 32px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <RocketOutlined style={{
              fontSize: '48px',
              color: '#FFFFFF',
              marginBottom: '20px',
              display: 'block',
            }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}>
              Getting Started
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0',
              lineHeight: '1.5',
            }}>
              Learn how to use the platform and get the most out of our tools
            </p>
          </div>

          {/* About Card */}
          <div
            onClick={() => navigate('/about')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '24px',
              padding: '48px 32px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <InfoCircleOutlined style={{
              fontSize: '48px',
              color: '#FFFFFF',
              marginBottom: '20px',
              display: 'block',
            }} />
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}>
              About
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0',
              lineHeight: '1.5',
            }}>
              Learn about our mission and the team behind CephaloMetrics
            </p>
          </div>
        </div>

        {/* Bottom Decorative Element */}
        <div style={{
          width: '80px',
          height: '4px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
          borderRadius: '2px',
          margin: '0 auto',
        }} />
      </div>
    </div>
  );
};

export default LandingPage;
