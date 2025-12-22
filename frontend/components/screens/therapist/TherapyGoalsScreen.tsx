
import React from 'react';
import { useTherapyGoals } from '../../../api/clinical';
import { Plus, Target, CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { Screen } from '../../../types';

export default function TherapyGoalsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { data: goals, isLoading } = useTherapyGoals();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Therapy Goals</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage intervention objectives.</p>
        </div>
        <button 
          onClick={() => onNavigate(Screen.THERAPY_GOAL_FORM)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
        >
          <Plus size={16} /> New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <p>Loading goals...</p> : goals?.map((goal) => (
          <div key={goal.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${goal.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{goal.priority} Priority</span>
              <button className="text-slate-400 hover:text-slate-600"><ChevronRight size={18} /></button>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{goal.title}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{goal.description}</p>
            
            <div className="mt-auto">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${goal.progress}%` }}></div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-1"><Clock size={14} /> Due {new Date(goal.targetDate).toLocaleDateString()}</div>
                <div className="flex items-center gap-1"><Target size={14} /> {goal.category}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
