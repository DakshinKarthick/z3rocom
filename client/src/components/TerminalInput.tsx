import React, { useState, useRef } from 'react';
import WidgetMenu from './WidgetMenu';
import './terminal.css';

export default function TerminalInput({ onSend }: { onSend?: (payload: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '/') {
      e.preventDefault();
      setMenuOpen(true);
    }
  };

  return (
    <div className="terminal-input" style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        aria-label="Chat input"
        placeholder="Type a message..."
        onKeyDown={handleKeyDown}
      />
      {menuOpen && (
        <WidgetMenu
          onClose={() => setMenuOpen(false)}
          onSelect={(payload) => {
            if (inputRef.current) {
              inputRef.current.value = payload;
              inputRef.current.focus();
            }
            setMenuOpen(false);
            if (onSend) onSend(payload);
          }}
        />
      )}
    </div>
  );
}
