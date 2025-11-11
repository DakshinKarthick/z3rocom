import React, { useState, useRef, useEffect } from 'react';
import WidgetMenu from './WidgetMenu';

export default function TerminalInput({ onSend }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/') {
        // open menu and prevent default typing of '/'
        e.preventDefault();
        setMenuOpen(true);
      }
    };
    const el = inputRef.current;
    if (el) el.addEventListener('keydown', handler);
    return () => { if (el) el.removeEventListener('keydown', handler); };
  }, []);

  return (
    <div className="terminal-input">
      <input ref={inputRef} aria-label="Chat input" placeholder="Type a message..." />
      {menuOpen && (
        <WidgetMenu
          onClose={() => setMenuOpen(false)}
          onSelect={(payload) => {
            // insert payload into input and close
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
