import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Layout, Menu } from 'antd';
import {
  HomeOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  AppstoreOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { queryClient } from '@/services/api';

// Import pages
import LandingPage from '@/pages/LandingPage';
import AboutPage from '@/pages/AboutPage';
import GettingStartedPage from '@/pages/GettingStartedPage';
import ModelsPage from '@/pages/ModelsPage';
import AnalysisPage from '@/pages/AnalysisPage';
import ModelRetrainingPage from '@/pages/ModelRetrainingPage';
import ModelDetailPage from '@/pages/ModelDetailPage';
import ModelComparisonPage from '@/pages/ModelComparisonPage';
import UWCLogoShield from "@/assets/UWCLogoshield.png";

import './App.css';

// Destructure Layout components
const { Header, Content } = Layout;

function AppContent() {
  const location = useLocation();

  // Define menuItems inside the component
  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/" style={{ color: '#FFFFF0' }}>Home</Link> },
    { key: '/about', icon: <InfoCircleOutlined />, label: <Link to="/about" style={{ color: '#FFFFF0' }}>About</Link> },
    { key: '/getting-started', icon: <RocketOutlined />, label: <Link to="/getting-started" style={{ color: '#FFFFF0' }}>Getting Started</Link> },
    { key: '/models', icon: <AppstoreOutlined />, label: <Link to="/models" style={{ color: '#FFFFF0' }}>Models</Link> },
    { key: '/analysis', icon: <LineChartOutlined />, label: <Link to="/analysis" style={{ color: '#FFFFF0' }}>Analysis</Link> },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#09185B' }}>
      <Header style={{
        background: 'rgba(255, 255, 240, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 240, 0.2)',
        padding: 0,
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        height: '70px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          padding: '0 20px',
          width: '100%'
        }}>
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: '40px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: '#FFFFF0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#09185B',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <img
                src={UWCLogoShield}
                alt="UWC"
                style={{ width: '80%', height: '80%', objectFit: 'contain' }}
              />
            </div>
          </Link>

          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFF0',
              flex: 1
            }}
            theme="dark"
          />
        </div>
      </Header>

      <Content style={{
        marginTop: '70px',
        background: '#09185B',
        minHeight: 'calc(100vh - 70px)',
        width: '100%',
        color: "#FFFFF0"
      }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/getting-started" element={<GettingStartedPage />} />
          <Route path="/models" element={<ModelsPage />} />
          {/* IMPORTANT: Specific routes MUST come before dynamic routes */}
          <Route path="/models/compare" element={<ModelComparisonPage />} />
          <Route path="/models/retrain" element={<ModelRetrainingPage />} />
          <Route path="/models/:modelId" element={<ModelDetailPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#FFFFF0',
            colorBgContainer: '#09185B',
          },
          components: {
            Menu: {
              darkItemSelectedBg: 'rgba(255, 255, 240, 0.1)',
              darkItemHoverBg: 'rgba(255, 255, 240, 0.05)',
              darkItemSelectedColor: '#FFFFF0',
            }
          }
        }}
      >
        <Router>
          <AppContent />
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
