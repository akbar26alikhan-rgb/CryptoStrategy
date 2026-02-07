
import React from 'react';
import { Notification } from '../types';

interface NotificationOverlayProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

const NotificationOverlay: React.FC<NotificationOverlayProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => (
        <div 
          key={n.id}
          className={`pointer-events-auto w-80 p-4 rounded-lg shadow-2xl border-l-4 transition-all animate-slide-in 
            ${n.type === 'success' ? 'bg-slate-800 border-green-500' : 'bg-slate-800 border-indigo-500'}`}
        >
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-bold text-sm text-white">{n.title}</h4>
            <button 
              onClick={() => removeNotification(n.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
          <div className="mt-2 text-[10px] text-slate-600 font-mono">
            {new Date(n.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default NotificationOverlay;
