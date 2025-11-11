import React from 'react';
import './terminal.css';

export default function WidgetMenu({ onClose, onSelect }: { onClose: () => void; onSelect: (payload: string) => void }) {
  const widgets = [
    { key: '/agenda', label: 'Agenda' },
    { key: '/project', label: 'Project' },
    { key: '/music', label: 'Music' },
    { key: '/poll', label: 'Poll' },
  ];

  return (
    <div className="widget-menu" role="dialog" aria-modal="true">
      <ul>
        {widgets.map((w, i) => (
          <li key={w.key}>
            <button onClick={() => onSelect(w.key)} aria-label={`Select ${w.label}`}>
              <span className="widget-label">{w.label}</span>
              <span className="widget-key">{w.key}</span>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onClose} aria-label="Close">Close</button>
    </div>
  );
}
