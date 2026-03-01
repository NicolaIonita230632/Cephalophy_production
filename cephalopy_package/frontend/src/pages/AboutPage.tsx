const AboutPage = () => {
  // Style for team member links
  const teamLinkStyle = {
    color: 'rgba(255, 255, 255, 0.9)',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  };

  // Style for institution links
  const institutionLinkStyle = {
    color: 'rgba(255, 255, 255, 0.6)',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  };

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
      {/* Hero Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '60vh',
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="rgba(255,255,255,0.02)" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.5,
        }} />

        <div style={{
          position: 'relative',
          textAlign: 'center',
          zIndex: 1,
          maxWidth: '900px',
          padding: '0 40px',
        }}>
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 72px)',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '24px',
            letterSpacing: '-2px',
            lineHeight: '1.1',
          }}>
            CephaloMetrics
          </h1>
          <p style={{
            fontSize: '28px',
            fontWeight: '400',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '0',
            letterSpacing: '-0.5px',
          }}>
            AI-Powered Anatomical Landmark Detection
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '80px 5%',
        boxSizing: 'border-box',
      }}>
        {/* Image + Text Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          alignItems: 'center',
          marginBottom: '80px',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '40px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <img
              src="/images/cephalometric.jpg"
              alt="Cephalometric X-Ray Analysis"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '12px',
                display: 'block',
              }}
            />
          </div>

          <div>
            <h2 style={{
              fontSize: '48px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '32px',
              letterSpacing: '-1px',
            }}>
              About This Project
            </h2>
            <p style={{
              fontSize: '20px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '24px',
            }}>
              This platform is part of an ongoing research initiative aimed at improving automated dental and craniofacial landmark detection for South African populations.
            </p>
            <p style={{
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0',
            }}>
              Existing AI models in dentistry are predominantly trained on European and Asian datasets, which can lead to reduced accuracy when applied to African anatomical profiles.
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          marginBottom: '80px',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '40px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              fontSize: '40px',
              marginBottom: '20px',
            }}>🎯</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '16px',
            }}>
              Accurate Detection
            </h3>
            <p style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0',
            }}>
              Essential for diagnosis, treatment planning, and orthodontic evaluation with population-specific precision.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '40px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              fontSize: '40px',
              marginBottom: '20px',
            }}>🤝</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '16px',
            }}>
              Clinical Assistant
            </h3>
            <p style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0',
            }}>
              Not to replace expertise, but to improve workflow efficiency and diagnostic consistency.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '40px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              fontSize: '40px',
              marginBottom: '20px',
            }}>🌍</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '16px',
            }}>
              African Innovation
            </h3>
            <p style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0',
            }}>
              Contributing to AI innovation within the African healthcare space with fair, context-aware tools.
            </p>
          </div>
        </div>

        {/* Full Width Text Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '20px',
          padding: '60px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '40px',
        }}>
          <p style={{
            fontSize: '20px',
            lineHeight: '1.8',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '24px',
            maxWidth: '900px',
          }}>
            Current tools often struggle with image variability, calibration inconsistencies, and population-specific anatomical differences. By building a dedicated dataset and evaluation pipeline, we aim to create a more robust and generalisable detection system that aligns with the clinical realities of South African dentistry.
          </p>
          <p style={{
            fontSize: '20px',
            lineHeight: '1.8',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '0',
            maxWidth: '900px',
          }}>
            This interface provides a user-friendly platform for uploading images, reviewing AI-predicted landmarks, and comparing them with clinician annotations. Our mission is to support research, improve access to high-quality dental diagnostics, and contribute to the broader growth of AI innovation.
          </p>
        </div>

        {/* Team Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
          borderRadius: '20px',
          padding: '50px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '18px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '16px',
            fontWeight: '500',
          }}>
            Developed by{' '}
            <a
              href="https://www.linkedin.com/in/jason-van-hamond-62a194254/?_l=nl_NL"
              target="_blank"
              rel="noopener noreferrer"
              style={teamLinkStyle}
              onMouseEnter={(e) => {
                e.target.style.color = '#fff';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Jason van Hamond
            </a>,{' '}
            <a
              href="https://www.linkedin.com/in/yorbe-heeren-8560b22b6/"
              target="_blank"
              rel="noopener noreferrer"
              style={teamLinkStyle}
              onMouseEnter={(e) => {
                e.target.style.color = '#fff';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Yorbe Heeren
            </a>,{' '}
            <a
              href="https://www.linkedin.com/in/carmen-nicola-ionita-415b822a0/"
              target="_blank"
              rel="noopener noreferrer"
              style={teamLinkStyle}
              onMouseEnter={(e) => {
                e.target.style.color = '#fff';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Nicola Ioniţă
            </a>,{' '}
            <a
              href="https://www.linkedin.com/in/victor-oorthuis-3b12612a6/"
              target="_blank"
              rel="noopener noreferrer"
              style={teamLinkStyle}
              onMouseEnter={(e) => {
                e.target.style.color = '#fff';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Victor Oorthuis
            </a>{' '}
            and{' '}
            <a
              href="https://www.linkedin.com/in/arnout-opfergelt-68835231b/"
              target="_blank"
              rel="noopener noreferrer"
              style={teamLinkStyle}
              onMouseEnter={(e) => {
                e.target.style.color = '#fff';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Arnout Opfergelt
            </a>
          </p>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '0',
          }}>
            In collaboration with the{' '}
            <a
              href="https://www.uwc.ac.za/"
              target="_blank"
              rel="noopener noreferrer"
              style={institutionLinkStyle}
              onMouseEnter={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              University of the Western Cape
            </a>{' '}
            and{' '}
            <a
              href="https://www.buas.nl/en"
              target="_blank"
              rel="noopener noreferrer"
              style={institutionLinkStyle}
              onMouseEnter={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Breda University of Applied Sciences
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
