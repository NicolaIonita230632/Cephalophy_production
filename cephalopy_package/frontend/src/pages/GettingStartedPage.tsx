import React from 'react';

const GettingStartedPage: React.FC = () => {
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

      {/* Hero Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        padding: '100px 5% 60px',
        textAlign: 'center',
        zIndex: 1,
      }}>
        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 72px)',
          fontWeight: '700',
          color: '#FFFFFF',
          marginBottom: '24px',
          letterSpacing: '-2px',
          lineHeight: '1.1',
        }}>
          Getting Started
        </h1>
        <p style={{
          fontSize: 'clamp(18px, 3vw, 24px)',
          fontWeight: '400',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '0',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          Follow these simple steps to perform cephalometric analysis
        </p>
      </div>

      {/* Steps Content */}
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 5% 80px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Step 1 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '40px',
          marginBottom: '60px',
          position: 'relative',
        }}>
          {/* Step Number */}
          <div style={{
            flexShrink: 0,
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)',
            border: '2px solid rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '700',
            color: '#60A5FA',
          }}>
            1
          </div>

          {/* Step Content */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '32px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}>
              Upload X-Ray
            </h3>
            <p style={{
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0',
            }}>
              Upload a lateral cephalometric X-ray image. Supported formats include JPEG, PNG, and BMP. Ensure the image is clear and properly oriented for best results.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '40px',
          marginBottom: '60px',
          position: 'relative',
        }}>
          {/* Step Number */}
          <div style={{
            flexShrink: 0,
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.2) 100%)',
            border: '2px solid rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '700',
            color: '#A78BFA',
          }}>
            2
          </div>

          {/* Step Content */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '32px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}>
              Detect Landmarks
            </h3>
            <p style={{
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0',
            }}>
              Our AI automatically detects 19 key cephalometric landmarks with high accuracy. The model is trained on diverse anatomical datasets for reliable detection across different populations.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '40px',
          marginBottom: '60px',
          position: 'relative',
        }}>
          {/* Step Number */}
          <div style={{
            flexShrink: 0,
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(219, 39, 119, 0.2) 100%)',
            border: '2px solid rgba(236, 72, 153, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '700',
            color: '#F472B6',
          }}>
            3
          </div>

          {/* Step Content */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '32px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}>
              Review & Correct
            </h3>
            <p style={{
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0',
            }}>
              Review the detected landmarks overlaid on your image. You can manually adjust any landmark positions by clicking and dragging if needed to ensure clinical accuracy.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '40px',
          position: 'relative',
        }}>
          {/* Step Number */}
          <div style={{
            flexShrink: 0,
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 163, 74, 0.2) 100%)',
            border: '2px solid rgba(34, 197, 94, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '700',
            color: '#4ADE80',
          }}>
            4
          </div>

          {/* Step Content */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '32px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}>
              Analyze
            </h3>
            <p style={{
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0',
            }}>
              Perform comprehensive cephalometric analysis using various methods. Generate detailed reports with measurements, angles, and clinical interpretations to support your diagnosis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GettingStartedPage;
