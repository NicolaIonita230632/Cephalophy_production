import React, { useEffect, useState } from 'react';
import { Card, Tag, Spin } from 'antd';
import { CheckCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface ActiveModelData {
  active_model: string;
  updated_at: string;
  is_loaded: boolean;
}

const ActiveModelBanner: React.FC = () => {
  const navigate = useNavigate();
  const [activeModel, setActiveModel] = useState<ActiveModelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveModel();
  }, []);

  const fetchActiveModel = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/models/active');
      const data = await response.json();
      setActiveModel(data);
    } catch (error) {
      console.error('Failed to fetch active model:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <Spin size="small" />
      </Card>
    );
  }

  if (!activeModel) return null;

  return (
    <Card
      style={{
        marginBottom: '24px',
        backgroundColor: '#f6ffed',
        border: '2px solid #52c41a',
        borderRadius: '12px',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tag 
            color="success" 
            style={{ 
              fontSize: '14px', 
              padding: '4px 12px',
              margin: 0,
              fontWeight: '600'
            }}
          >
            <CheckCircleOutlined /> ACTIVE MODEL
          </Tag>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#09185B' }}>
            {activeModel.active_model}
          </span>
          {activeModel.is_loaded && (
            <span style={{ fontSize: '12px', color: '#52c41a' }}>
              ● Ready for predictions
            </span>
          )}
        </div>
        <a 
          onClick={() => navigate('/models')}
          style={{ 
            color: '#09185B', 
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <SwapOutlined /> Change Model
        </a>
      </div>
    </Card>
  );
};

export default ActiveModelBanner;