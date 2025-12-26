import React, { useState } from 'react';
import { Camera, BrainCircuit, Lock, Scale, FileText, Download, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ConsentManagement() {
  const [agreed, setAgreed] = useState<string[]>([]);

  const toggleAgreement = (id: string) => {
    setAgreed(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      {/* Left Column: Consent Document */}
      <div className="w-full md:w-2/3 h-full overflow-y-auto p-6 md:p-8 border-r border-gray-200">
        <div className="bg-white rounded-xl shadow-sm max-w-3xl mx-auto min-h-full">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-2">
               <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full uppercase tracking-wide">Informed Consent</span>
               <span className="text-gray-400 text-sm">Ver. 2.4 (2025)</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Consent for AI-Assisted Therapy</h1>
            <p className="text-gray-500 mt-2">Please review the following terms carefully regarding the use of video recording and Artificial Intelligence in your therapy plan.</p>
          </div>

          <div className="p-8 space-y-8">
            <ConsentSection 
              icon={<Camera className="h-6 w-6 text-blue-600" />}
              title="1. Video Recording & Storage"
              content="I understand that therapy sessions may be recorded for the purpose of clinical analysis. Recordings are stored in a HIPAA-compliant encrypted cloud environment. Only authorized clinical staff have access to raw video footage."
            />
             <ConsentSection 
              icon={<BrainCircuit className="h-6 w-6 text-purple-600" />}
              title="2. AI Analysis & Capabilities"
              content="I acknowledge that Artificial Intelligence (AI) tools will be used to analyze movement patterns, facial expressions, and vocalizations. The AI serves as a support tool for the therapist and does not make autonomous medical diagnoses."
              highlight="The AI system processes data to identify behavioral markers but final clinical judgment remains with the human therapist."
            />
             <ConsentSection 
              icon={<Lock className="h-6 w-6 text-teal-600" />}
              title="3. Data Usage & Privacy"
              content="De-identified data points derived from video analysis may be used to improve system accuracy. No personally identifiable information (PII) is shared with third parties without explicit separate consent."
            />
            
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg flex gap-4">
              <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-orange-800">Right to Revoke</h4>
                <p className="text-sm text-orange-700 mt-1">You maintain the right to revoke this consent at any time. Revocation will stop future data collection but does not affect data already analyzed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Action Panel */}
      <div className="w-full md:w-1/3 bg-gray-50 p-6 flex flex-col h-full overflow-y-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Patient Information</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">JD</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">John Doe</p>
              <p className="text-xs text-gray-500">MRN: 2023-001</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
            <div><span className="font-medium">Guardian:</span> Jane Doe</div>
            <div><span className="font-medium">DOB:</span> 12/05/2018</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col">
          <h3 className="font-bold text-gray-900 mb-4">Acknowledgment</h3>
          
          <div className="space-y-4 mb-6">
            <Checkbox 
              id="read" 
              label="I have read and understood the terms." 
              checked={agreed.includes('read')}
              onChange={() => toggleAgreement('read')}
            />
            <Checkbox 
              id="questions" 
              label="I have had the opportunity to ask questions." 
              checked={agreed.includes('questions')}
              onChange={() => toggleAgreement('questions')}
            />
             <Checkbox 
              id="copy" 
              label="I understand I can request a copy of this form." 
              checked={agreed.includes('copy')}
              onChange={() => toggleAgreement('copy')}
            />
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 bg-gray-50 mb-4 flex items-center justify-center relative">
            <span className="text-gray-400 text-sm pointer-events-none">Guardian Digital Signature</span>
            {/* Simulation of signature area */}
          </div>

          <div className="mt-auto space-y-3">
            <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
              <CheckCircle size={20} /> Grant Consent
            </button>
             <button className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-all">
              Revoke Consent
            </button>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Consent History</h4>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs text-left">
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="p-3 text-gray-500">Oct 12, 2023</td>
                  <td className="p-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Granted</span></td>
                  <td className="p-3 text-right"><Download size={14} className="inline text-gray-400 cursor-pointer hover:text-blue-600" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const ConsentSection = ({ icon, title, content, highlight }: any) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
    </div>
    <div className="pl-8">
      <p className="text-gray-700 leading-relaxed mb-2">{content}</p>
      {highlight && (
        <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 border-l-4 border-yellow-300">
          {highlight}
        </div>
      )}
    </div>
  </div>
);

const Checkbox = ({ id, label, checked, onChange }: any) => (
  <div className="flex items-start gap-3">
    <div className="flex items-center h-5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
      />
    </div>
    <label htmlFor={id} className="text-sm text-gray-700 cursor-pointer select-none">
      {label}
    </label>
  </div>
);