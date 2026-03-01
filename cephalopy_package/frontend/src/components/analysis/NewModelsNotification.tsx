import React, { useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import { BellOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const NewModelsNotification: React.FC = () => {
  const navigate = useNavigate();
  const [newModels, setNewModels] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkForNewModels();
    
    // Check every 30 seconds
    const interval = setInterval(checkForNewModels, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkForNewModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/models/new');
      const data = await response.json();
      
      if (data.has_new_models) {
        setNewModels(data);
        setVisible(true);
      }
    } catch (error) {
      console.error('Failed to check for new models:', error);
    }
  };

  if (!visible || !newModels) return null;

  return (
    <Alert
      message={
        <span>
          <BellOutlined /> {newModels.count} new retrained model{newModels.count > 1 ? 's' : ''} available!
        </span>
      }
      description={
        <div>
          The latest model was trained on {new Date(newModels.models[0].created_at).toLocaleString()} 
          {newModels.models[0].metrics.mre && ` with MRE: ${newModels.models[0].metrics.mre}mm`}
        </div>
      }
      type="info"
      showIcon
      closable
      onClose={() => setVisible(false)}
      action={
        <Button 
          size="small" 
          type="primary"
          onClick={() => navigate('/models')}
        >
          Review Models
        </Button>
      }
      style={{ marginBottom: '16px' }}
    />
  );
};

export default NewModelsNotification;