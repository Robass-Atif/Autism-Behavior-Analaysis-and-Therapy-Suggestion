
import React from 'react';
import { usePatients } from '../../../api/patient';
import { Search, Plus, Filter, MoreHorizontal, FileText } from 'lucide-react';

export default function PatientListScreen() {
  const { data: patients, isLoading } = usePatients();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Management</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage all active patient profiles.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Add New Patient
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search by name, MRN, or condition..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
          </div>
          <button className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium">
            <Filter size={16} /> Filter
          </button>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">Patient Name</th>
              <th className="px-6 py-3">MRN</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Severity</th>
              <th className="px-6 py-3">Caregiver</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading patients...</td></tr>
            ) : patients?.map((patient) => (
              <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{patient.fullName}</td>
                <td className="px-6 py-4 text-slate-500">{patient.mrn}</td>
                <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${patient.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{patient.status}</span></td>
                <td className="px-6 py-4 text-slate-600">{patient.asdSeverity}</td>
                <td className="px-6 py-4 text-slate-600">{patient.caregiverName}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-blue-600 p-1"><MoreHorizontal size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
