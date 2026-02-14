
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { useCreateTherapyGoal } from '../../../api/clinical';

const goalSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  category: z.enum(['Communication', 'Social Skills', 'Motor Skills', 'Behavioral Regulation', 'Daily Living']),
  description: z.string().min(10, 'Please provide a detailed description'),
  targetBehavior: z.string().min(5, 'Define the observable behavior'),
  measurementCriteria: z.string().min(5, 'How will this be measured?'),
  baseline: z.number().min(0),
  target: z.number().min(1),
  startDate: z.string(),
  targetDate: z.string().refine(d => new Date(d) > new Date(), "Target date must be in the future"),
  priority: z.enum(['High', 'Medium', 'Low'])
});

type GoalFormInputs = z.infer<typeof goalSchema>;

export default function TherapyGoalForm({ onBack }: { onBack: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<GoalFormInputs>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      priority: 'Medium',
      category: 'Motor Skills'
    }
  });

  const createGoalMutation = useCreateTherapyGoal();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Create New Therapy Goal</h1>
           <p className="text-sm text-slate-500">Define measurable objectives for patient intervention.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => createGoalMutation.mutate(d, { onSuccess: onBack }))} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title</label>
            <input {...register('title')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" placeholder="e.g. Improved Pincer Grasp Accuracy" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select {...register('category')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm">
              {['Communication', 'Social Skills', 'Motor Skills', 'Behavioral Regulation', 'Daily Living'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority Level</label>
            <select {...register('priority')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm">
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Description</label>
            <textarea {...register('description')} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" placeholder="Describe the goal context and clinical justification..." />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Target Behavior</label>
               <input {...register('targetBehavior')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" placeholder="Observable action..." />
               {errors.targetBehavior && <p className="text-red-500 text-xs mt-1">{errors.targetBehavior.message}</p>}
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Measurement Criteria</label>
               <input {...register('measurementCriteria')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" placeholder="e.g. Duration in seconds, Frequency per session" />
               {errors.measurementCriteria && <p className="text-red-500 text-xs mt-1">{errors.measurementCriteria.message}</p>}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Baseline (Current)</label>
              <input type="number" {...register('baseline', { valueAsNumber: true })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target (Goal)</label>
              <input type="number" {...register('target', { valueAsNumber: true })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" {...register('startDate')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Completion Date</label>
              <input type="date" {...register('targetDate')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
              {errors.targetDate && <p className="text-red-500 text-xs mt-1">{errors.targetDate.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={onBack} className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={createGoalMutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70">
            {createGoalMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save Goal
          </button>
        </div>
      </form>
    </div>
  );
}
