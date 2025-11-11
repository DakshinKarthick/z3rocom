import React from 'react';
import './terminal.css';

export default function StickmanGuide({ visible, message }: { visible: boolean; message?: string }) {
  if (!visible) return null;
  return (
    <div className="stickman-guide" role="note">
      <div className="stickman">:)</div>
      <div className="message">{message}</div>
    </div>
  );
}
