import React, { useState } from 'react';
import { useTherapyGoals, useCreateTherapyGoal, useUpdateTherapyGoal, useDeleteTherapyGoal } from '../../../api/clinical';
import { usePatients } from '../../../api/patient';
import { Plus, Target, Clock, Loader2, AlertCircle, X, Trash2, Edit2, CheckCircle, ChevronDown, Search } from 'lucide-react';
import { Screen } from '../../../types';
import toast from 'react-hot-toast';

interface TherapyGoalsScreenProps {
  onNavigate: (screen: Screen) => void;
}

export default function TherapyGoalsScreen({ onNavigate }: TherapyGoalsScreenProps) {
  const [patientFilter, setPatientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    priority: 'medium' as 'high' | 'medium' | 'low',
    targetDate: '',
    patientId: '',
  });

  // Pass both filters to backend
  const { data, isLoading, error } = useTherapyGoals({
    patientId: patientFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: patientsData } = usePatients();
  const createMutation = useCreateTherapyGoal();
  const updateMutation = useUpdateTherapyGoal();
  const deleteMutation = useDeleteTherapyGoal();

  const patients = patientsData?.patients || [];
  const goals = (data as any)?.goals || data || [];

  const categories = ['Communication', 'Social Skills', 'Behavior', 'Motor Skills', 'Daily Living', 'Academic', 'Other'];
  const priorities = [
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
    { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600' },
  ];

  const resetForm = () => {
    setFormData({ title: '', description: '', category: 'Other', priority: 'Medium' as any, targetDate: '', patientId: '' });
    setEditingGoal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.patientId) {
      toast.error('Title and patient are required');
      return;
    }

    try {
      if (editingGoal) {
        await updateMutation.mutateAsync({ id: editingGoal.id, ...formData } as any);
        toast.success('Goal updated successfully');
      } else {
        await createMutation.mutateAsync(formData as any);
        toast.success('Goal created successfully');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save goal');
    }
  };

  const handleEdit = (goal: any) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      category: goal.category || 'Other',
      priority: goal.priority || 'medium',
      targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
      patientId: goal.patientId,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Goal deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleProgressUpdate = async (goal: any, progress: number) => {
    try {
      await updateMutation.mutateAsync({
        id: goal.id,
        data: { progress },
      });
      toast.success('Progress updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Failed to load goals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 font-mono">
      <div className="flex justify-between items-center bg-white border-2 border-zinc-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Therapy Goals</h1>
          <p className="text-zinc-500 text-xs mt-1 font-bold">MANAGE AND TRACK CLINICAL OBJECTIVES</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 border border-zinc-800 rounded-none text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
        >
          <Plus size={16} /> NEW GOAL
        </button>
      </div>

      <div className="bg-white border-2 border-zinc-200">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="SEARCH BY PATIENT OR GOAL DESCRIPTION..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-none focus:border-zinc-900 outline-none transition-all uppercase font-bold bg-white"
            />
          </div>
        </div>
        {/* Original filters, now inside the new search container */}
        {/* Original filters, now inside the new search container */}
        <div className="flex gap-3 p-4 border-t border-zinc-200">
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-zinc-200 text-xs font-bold uppercase tracking-widest text-zinc-700 focus:border-zinc-900 focus:outline-none"
          >
            <option value="">ALL PATIENTS</option>
            {patients.map((p: any) => (
              <option key={p._id || p.id} value={p._id || p.id}>{p.fullName.toUpperCase()}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-zinc-200 text-xs font-bold uppercase tracking-widest text-zinc-700 focus:border-zinc-900 focus:outline-none"
          >
            <option value="">ALL STATUS</option>
            <option value="active">ACTIVE</option>
            <option value="completed">COMPLETED</option>
            <option value="archived">ARCHIVED</option>
          </select>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-900 mb-1">No goals found</h3>
          <p className="text-xs text-slate-500 mb-4">Create your first therapy goal to get started</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            + Add Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal: any) => (
            <div key={goal.id} className="bg-white border-2 border-zinc-200 p-5 hover:border-zinc-900 transition-colors group">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${goal.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                  goal.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-zinc-50 text-zinc-600 border-zinc-200'
                  }`}>
                  {goal.priority} PRIORITY
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(goal)} className="p-1.5 text-zinc-400 hover:text-zinc-900 border border-transparent hover:border-zinc-200">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(goal.id)} className="p-1.5 text-zinc-400 hover:text-red-600 border border-transparent hover:border-red-200">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="font-bold text-zinc-900 mb-2 uppercase tracking-tight text-sm line-clamp-1">{goal.title}</h3>
              <p className="text-xs text-zinc-500 line-clamp-2 mb-4 font-mono leading-relaxed h-8">{goal.description || 'NO DESCRIPTION'}</p>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-1.5 tracking-wider">
                  <span>Progress</span>
                  <span>{goal.progress || 0}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-100 h-2 border border-zinc-200">
                    <div
                      className="h-full bg-zinc-900 transition-all"
                      style={{ width: `${goal.progress || 0}%` }}
                    />
                  </div>
                  <select
                    value={goal.progress || 0}
                    onChange={(e) => handleProgressUpdate(goal, parseInt(e.target.value))}
                    className="text-[10px] px-1 py-0.5 border border-zinc-200 bg-white text-zinc-900 font-bold focus:border-zinc-900 focus:outline-none cursor-pointer"
                  >
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                      <option key={v} value={v}>{v}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Target size={12} />
                  {goal.category}
                </span>
                {goal.targetDate && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {new Date(goal.targetDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {goal.patientName && (
                <div className="mt-2 text-[10px] font-bold text-zinc-300 uppercase tracking-widest text-right">
                  {goal.patientName}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-medium text-slate-900">{editingGoal ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Patient *</label>
                <select
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                >
                  <option value="">Select patient</option>
                  {patients.map((p: any) => (
                    <option key={p._id || p.id} value={p._id || p.id}>{p.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Goal title"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Goal description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
                    className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 text-sm focus:border-zinc-900 outline-none transition-all font-bold uppercase"
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Target Date</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingGoal ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
