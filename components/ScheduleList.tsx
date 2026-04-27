"use client";

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface Schedule {
  _id: string;
  title: string;
  date: string;
  color: string;
}

export default function ScheduleList() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/schedules')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSchedules(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addSchedule = async () => {
    if (!newTitle || !newDate) return;
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, date: newDate }),
      });
      const created = await res.json();
      setSchedules(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setIsAdding(false);
      setNewTitle('');
      setNewDate('');
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  const removeSchedule = async (id: string) => {
    try {
      await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
      setSchedules(prev => prev.filter(s => s._id !== id));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {loading && (
        <div className="text-[12px] font-bold text-gray-400 text-center py-4">Loading...</div>
      )}
      {schedules.map((sch) => {
        // Format date with full details
        let dayOfWeek = '';
        let day = '';
        let month = '';
        let year = '';
        
        try {
          if (sch.date && sch.date.includes('-')) {
             const d = new Date(sch.date);
             if (!isNaN(d.getTime())) {
                dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
                day = d.getDate().toString();
                month = d.toLocaleDateString('en-US', { month: 'short' });
                year = d.getFullYear().toString();
             }
          }
        } catch {
          day = sch.date;
        }

        const titleText = sch.title || 'SCHEDULE';
        const isHex = sch.color?.startsWith('#');
        const bgStyle = isHex ? { backgroundColor: sch.color, minHeight: '180px' } : { minHeight: '180px' };
        const bgClass = isHex ? '' : (sch.color || 'bg-[#93C5FD]');
        
        return (
          <div key={sch._id} 
            className={`${bgClass} border-2 border-black rounded-[32px] p-5 flex flex-col items-center justify-center relative shadow-[2px_2px_0px_rgba(0,0,0,1)] group hover:translate-y-[2px] hover:shadow-none transition-all`}
            style={bgStyle}
          >
            <button 
              onClick={() => removeSchedule(sch._id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white border-2 border-black rounded-full brutalist-shadow hover:scale-110"
            >
              <X className="w-3 h-3" strokeWidth={3} />
            </button>
            
            <div className="font-extrabold text-[13px] leading-tight mb-3 tracking-wide text-center px-1 text-black">
              {titleText}
            </div>
            
            <div className="text-center">
              <div className="font-bold text-[11px] text-black/70 uppercase tracking-wider mb-1">
                {dayOfWeek}
              </div>
              <div className="font-black text-[36px] leading-none tracking-tight text-black mb-1">
                {day}
              </div>
              <div className="font-extrabold text-[14px] text-black uppercase">
                {month}
              </div>
              <div className="font-bold text-[11px] text-black/60 mt-1">
                {year}
              </div>
            </div>
          </div>
        );
      })}

      {isAdding ? (
        <div className="bg-white border-2 border-black rounded-[32px] p-5 flex flex-col gap-4 shadow-[2px_2px_0px_rgba(0,0,0,1)] relative z-10 w-full">
          <div>
            <label className="block text-[11px] font-extrabold mb-1">TITLE</label>
            <input 
              type="text" 
              placeholder="e.g. Project Meeting" 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full border-2 border-black rounded-xl p-2 text-[14px] font-bold outline-none focus:ring-2 focus:ring-[#93C5FD]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-extrabold mb-1">DATE</label>
            <input 
              type="date" 
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full border-2 border-black rounded-xl p-2 text-[14px] font-extrabold outline-none focus:ring-2 focus:ring-[#93C5FD] uppercase"
            />
          </div>
          
          <div className="flex justify-between gap-2 mt-2">
            <button onClick={() => setIsAdding(false)} className="flex-1 py-2 border-2 border-black rounded-xl text-[12px] font-bold hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={addSchedule} className="flex-1 py-2 border-2 border-black rounded-xl text-[12px] font-bold bg-[#93C5FD] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">Save</button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsAdding(true)}
          className="border-2 border-black border-dashed rounded-[32px] p-4 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white transition-colors"
          style={{ minHeight: '60px' }}
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
