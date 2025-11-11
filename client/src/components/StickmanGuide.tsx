import React from 'react';

export default function StickmanGuide({ visible, message }) {
  if (!visible) return null;
  return (
    <div className="stickman-guide" role="note">
      <div className="stickman">:)</div>
      <div className="message">{message}</div>
    </div>
  );
}
