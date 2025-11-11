import React from 'react';

export default function WidgetMenu({ onClose, onSelect }) {
  const widgets = [
    { key: '/agenda', label: 'Agenda' },
    { key: '/project', label: 'Project' },
    { key: '/music', label: 'Music' },
    { key: '/poll', label: 'Poll' },
  ];

  return (
    <div className="widget-menu" role="dialog" aria-modal="true">
      <ul>
        {widgets.map(w => (
          <li key={w.key}>
            <button onClick={() => onSelect(w.key)}>{w.label} ({w.key})</button>
          </li>
        ))}
      </ul>
      <button onClick={onClose} aria-label="Close">Close</button>
    </div>
  );
}
