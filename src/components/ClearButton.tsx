import React, { useState } from 'react';
import '../styles/ClearButton.css';

interface ClearButtonProps {
  onClear: () => void;
}

const ClearButton: React.FC<ClearButtonProps> = ({ onClear }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleClick = () => {
    setShowConfirm(true);
  };
  
  const handleConfirm = () => {
    onClear();
    setShowConfirm(false);
  };
  
  const handleCancel = () => {
    setShowConfirm(false);
  };
  
  return (
    <div className="clear-button-container">
      <button 
        className="clear-button"
        onClick={handleClick}
        title="Clear the entire board"
      >
        Clear Board
      </button>
      
      {showConfirm && (
        <div className="confirmation-dialog">
          <p>Are you sure you want to clear the board? This action cannot be undone.</p>
          <div className="confirmation-buttons">
            <button 
              className="confirm-button"
              onClick={handleConfirm}
            >
              Yes, Clear
            </button>
            <button 
              className="cancel-button"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClearButton; 