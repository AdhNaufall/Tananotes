"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

interface Schedule {
  _id: string;
  title: string;
  date: string; 
  color: string;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [selectedColor, setSelectedColor] = useState('#93C5FD');
  const [loading, setLoading] = useState(true);

  const SCHEDULE_COLORS = ['#93C5FD', '#FCA5A5', '#FEF08A', '#A7F3D0', '#B28DFF', '#FF6B6B'];

  useEffect(() => {
    fetch('/api/schedules')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSchedules(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addSchedule = async () => {
    if (!newTitle || !newDate) return;
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, date: newDate, color: selectedColor }),
      });
      const created = await res.json();
      setSchedules(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setIsAdding(false);
      setNewTitle('');
      setNewDate('');
      setSelectedColor('#93C5FD');
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  const removeSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
      setSchedules(prev => prev.filter(s => s._id !== id));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  return (
    <main className="px-6 py-8 min-h-screen pb-32 lg:pb-12 max-w-[1200px] mx-auto">
      {/* Header buttons */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/"
          className="inline-flex items-center justify-center px-5 py-2 bg-white border-2 border-black rounded-full font-extrabold hover:-translate-y-0.5 transition-transform brutalist-shadow text-black lg:hidden">
          <ArrowLeft className="w-5 h-5 mr-1" /> Home
        </Link>
        <h1 className="text-[24px] md:text-[28px] font-black tracking-tight text-black flex items-center gap-2 lg:flex-1">
          <CalendarIcon className="w-7 h-7" /> Schedule
        </h1>
      </div>

      {/* Add New Schedule Section */}
      <div className="mb-8">
        {!isAdding ? (
          <button 
            onClick={() => {
              setIsAdding(true);
              setNewDate(new Date().toISOString().split('T')[0]);
              setSelectedColor('#93C5FD');
            }}
            className="w-full bg-white border-2 border-dashed border-black rounded-[2rem] p-5 flex items-center justify-center gap-2 text-black font-bold hover:bg-gray-50 transition-colors shadow-none hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
            Create New Schedule
          </button>
        ) : (
          <div className="bg-white border-2 border-black rounded-[2rem] p-6 flex flex-col gap-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div>
              <label className="block text-sm font-extrabold text-black mb-1 px-1">Task / Event Title</label>
              <input 
                type="text" 
                placeholder="e.g. Project Deadline" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black rounded-xl font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-extrabold text-black mb-1 px-1">Date</label>
              {/* Professional Input Calendar */}
              <input 
                type="date" 
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black rounded-xl font-extrabold bg-white focus:outline-none focus:ring-2 focus:ring-[#93C5FD] uppercase"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-extrabold text-black mb-2 px-1">Background Color</label>
              <div className="flex gap-3 flex-wrap">
                {SCHEDULE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="w-10 h-10 rounded-full border-2 border-black transition-all hover:-translate-y-1"
                    style={{
                      backgroundColor: color,
                      boxShadow: selectedColor === color ? '0 0 0 3px white, 0 0 0 5px black' : undefined,
                      transform: selectedColor === color ? 'translateY(-4px)' : undefined,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                  setNewDate('');
                  setSelectedColor('#93C5FD');
                }} 
                className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-extrabold hover:-translate-y-0.5 transition-transform"
              >
                Cancel
              </button>
              <button 
                onClick={addSchedule} 
                className="flex-1 py-3 bg-[#93C5FD] border-2 border-black rounded-xl font-extrabold shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
              >
                Save Schedule
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Schedule List */}
      <h2 className="text-[17px] font-bold mb-4 tracking-wide text-black">Your Upcoming Schedule</h2>
      
      {loading ? (
        <div className="text-center py-12 px-6">
          <p className="font-bold text-gray-400">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 px-6 border-2 border-dashed border-black bg-white/50 rounded-[2rem]">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-500">No schedules planned yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {schedules.map((sch) => {
            // Formatting the date with full details
            const dateObj = new Date(sch.date);
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
            const year = dateObj.getFullYear();
            
            return (
              <div key={sch._id} 
                className="border-2 border-black rounded-[2rem] p-6 flex gap-6 relative shadow-[4px_4px_0px_rgba(0,0,0,1)] group hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all"
                style={{ backgroundColor: sch.color }}
              >
                {/* Date Box */}
                <div className="flex-shrink-0 bg-white border-2 border-black rounded-2xl p-4 flex flex-col items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)] min-w-[100px]">
                  <div className="text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-1">
                    {dayOfWeek}
                  </div>
                  <div className="text-5xl font-black text-black leading-none mb-1">
                    {day}
                  </div>
                  <div className="text-sm font-extrabold text-black">
                    {month}
                  </div>
                  <div className="text-xs font-bold text-gray-500 mt-1">
                    {year}
                  </div>
                </div>

                {/* Title Section */}
                <div className="flex-1 flex items-center pr-12">
                  <h3 className="font-extrabold text-[22px] md:text-[24px] leading-tight text-black break-words">
                    {sch.title}
                  </h3>
                </div>

                {/* Delete Button */}
                <button 
                  onClick={() => removeSchedule(sch._id)}
                  className="absolute top-4 right-4 p-2 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:scale-110 hover:-translate-y-0.5 transition-all text-[#FF6B6B]"
                  title="Delete Schedule"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
