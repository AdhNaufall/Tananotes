"use client";

import { useEffect, useState } from 'react';
import { BarChart3, FileText, FolderOpen, Hash, Pin, TrendingUp } from 'lucide-react';

interface Stats {
  totalNotes: number;
  totalCategories: number;
  totalWords: number;
  avgWordsPerNote: number;
  pinnedCount: number;
  recentNotesCount: number;
  topCategories: Array<{
    name: string;
    count: number;
    color: string;
    wordCount: number;
  }>;
  activityMap: { [key: string]: number };
}

export default function StatsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching stats from /api/stats...');
        const response = await fetch('/api/stats');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Stats data:', data);
          setStats(data);
        } else {
          const errorText = await response.text();
          console.error('API error:', errorText);
          setError(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load statistics';
        console.error('Error fetching stats:', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
        <p className="mt-4 font-bold text-gray-500">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="font-bold text-red-600 mb-2">Error loading statistics</p>
        <p className="text-sm text-gray-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-6 py-2 bg-[#93C5FD] border-2 border-black rounded-lg font-bold hover:-translate-y-1 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="font-bold text-gray-500">No statistics available</p>
      </div>
    );
  }

  // Calculate activity heatmap data (last 30 days)
  const today = new Date();
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const maxActivity = Math.max(...Object.values(stats.activityMap), 1);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
        <h2 className="text-2xl md:text-3xl font-extrabold">Statistics</h2>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Total Notes */}
        <div className="bg-[#93C5FD] border-2 border-black rounded-2xl p-3 md:p-4 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
            <p className="text-[10px] md:text-xs font-bold text-black/60">TOTAL</p>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{stats.totalNotes}</p>
          <p className="text-xs md:text-sm font-bold mt-1">Notes</p>
        </div>

        {/* Total Categories */}
        <div className="bg-[#FDE047] border-2 border-black rounded-2xl p-3 md:p-4 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
            <p className="text-[10px] md:text-xs font-bold text-black/60">TOTAL</p>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{stats.totalCategories}</p>
          <p className="text-xs md:text-sm font-bold mt-1">Categories</p>
        </div>

        {/* Total Words */}
        <div className="bg-[#93EB7D] border-2 border-black rounded-2xl p-3 md:p-4 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
            <p className="text-[10px] md:text-xs font-bold text-black/60">TOTAL</p>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{stats.totalWords.toLocaleString()}</p>
          <p className="text-xs md:text-sm font-bold mt-1">Words</p>
        </div>

        {/* Average Words */}
        <div className="bg-[#FF6B6B] border-2 border-black rounded-2xl p-3 md:p-4 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
            <p className="text-[10px] md:text-xs font-bold text-black/60">AVERAGE</p>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{stats.avgWordsPerNote}</p>
          <p className="text-xs md:text-sm font-bold mt-1">Words/Note</p>
        </div>

        {/* Pinned Notes */}
        <div className="bg-[#B28DFF] border-2 border-black rounded-2xl p-3 md:p-4 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <Pin className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
            <p className="text-[10px] md:text-xs font-bold text-black/60">PINNED</p>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{stats.pinnedCount}</p>
          <p className="text-xs md:text-sm font-bold mt-1">Notes</p>
        </div>

        {/* Recent Notes (7 days) */}
        <div className="bg-[#FCA5A5] border-2 border-black rounded-2xl p-3 md:p-4 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all cursor-pointer">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
            <p className="text-[10px] md:text-xs font-bold text-black/60">LAST 7 DAYS</p>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{stats.recentNotesCount}</p>
          <p className="text-xs md:text-sm font-bold mt-1">New Notes</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Top Categories */}
        <div className="bg-white border-2 border-black rounded-2xl p-4 md:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all">
          <h3 className="text-lg md:text-xl font-extrabold mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
            Top Categories
          </h3>
          <div className="space-y-3">
            {stats.topCategories.slice(0, 5).map((category) => {
              const percentage = stats.totalNotes > 0 
                ? Math.round((category.count / stats.totalNotes) * 100) 
                : 0;
              
              return (
                <div key={category.name}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-4 h-4 rounded border-2 border-black flex-shrink-0" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-bold text-sm truncate">{category.name}</span>
                    </div>
                    <span className="font-extrabold text-lg">{category.count}</span>
                  </div>
                  <div className="bg-gray-200 h-3 rounded-full border-2 border-black overflow-hidden">
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: category.color 
                      }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    {percentage}% • {category.wordCount.toLocaleString()} words
                  </p>
                </div>
              );
            })}
            
            {stats.topCategories.length === 0 && (
              <p className="text-center text-gray-500 font-semibold py-4">
                No categories yet
              </p>
            )}
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-white border-2 border-black rounded-2xl p-4 md:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all">
          <h3 className="text-lg md:text-xl font-extrabold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
            Activity (Last 30 Days)
          </h3>
          
          {/* Heatmap Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-10 lg:grid-cols-15 gap-1 md:gap-1.5">
            {last30Days.map((date) => {
              const count = stats.activityMap[date] || 0;
              const intensity = count > 0 ? Math.min((count / maxActivity) * 100, 100) : 0;
              
              // Color intensity based on activity
              let bgColor = '#f3f4f6'; // gray-100 for 0
              if (intensity > 75) bgColor = '#22c55e'; // green-500
              else if (intensity > 50) bgColor = '#86efac'; // green-300
              else if (intensity > 25) bgColor = '#bbf7d0'; // green-200
              else if (intensity > 0) bgColor = '#dcfce7'; // green-100
              
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = dateObj.getDate();
              
              return (
                <div
                  key={date}
                  className="aspect-square rounded-sm md:rounded-md border-2 border-black hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: bgColor }}
                  title={`${dayName}, ${dayNum} - ${count} note${count !== 1 ? 's' : ''}`}
                />
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-between mt-4 text-xs font-bold text-gray-500">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded border-2 border-black bg-gray-100" />
              <div className="w-4 h-4 rounded border-2 border-black bg-green-100" />
              <div className="w-4 h-4 rounded border-2 border-black bg-green-200" />
              <div className="w-4 h-4 rounded border-2 border-black bg-green-300" />
              <div className="w-4 h-4 rounded border-2 border-black bg-green-500" />
            </div>
            <span>More</span>
          </div>
          
          <p className="text-center text-sm font-semibold text-gray-600 mt-4">
            Total activity: <span className="font-extrabold text-black">
              {Object.values(stats.activityMap).reduce((a, b) => a + b, 0)} notes
            </span> in the last 30 days
          </p>
        </div>
      </div>
    </div>
  );
}
