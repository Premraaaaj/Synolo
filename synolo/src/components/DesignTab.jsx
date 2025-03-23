import React from 'react';
import './DesignTab.css';

const DesignTab = () => {
  return (
    <div className="design-tab">
      <div className="design-canvas">
        <iframe
          src="https://excalidraw.com/"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Excalidraw Canvas"
        />
      </div>
    </div>
  );
};

export default DesignTab; 