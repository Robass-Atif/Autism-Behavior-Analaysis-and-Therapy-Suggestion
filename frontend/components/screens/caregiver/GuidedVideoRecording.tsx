
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Zap, ZapOff, RotateCw, Play, Info, CheckCircle, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useUploadVideoSession } from '../../../api/clinical';

interface GuidedVideoRecordingProps {
  onClose: () => void;
}

type RecordingStep = 'SELECTION' | 'INSTRUCTIONS' | 'RECORDING' | 'REVIEW' | 'SUBMITTING' | 'SUCCESS';

export default function GuidedVideoRecording({ onClose }: GuidedVideoRecordingProps) {
  const [step, setStep] = useState<RecordingStep>('SELECTION');
  const [selectedPatient, setSelectedPatient] = useState('1'); // Mock Default
  const [selectedAction, setSelectedAction] = useState('Arm Swing');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null); // Mock blob for now

  // Selection Screen
  if (step === 'SELECTION') {
    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col animate-fade-in">
        <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between">
          <button onClick={onClose} className="text-slate-500"><X size={24} /></button>
          <h2 className="font-bold text-lg text-slate-900">New Recording</h2>
          <div className="w-6" />
        </div>
        <div className="p-6 max-w-lg mx-auto w-full space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Patient</label>
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl bg-white">
              <option value="1">Liam Johnson</option>
              <option value="2">Emma Davis</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Action Type</label>
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
              {['Arm Swing', 'Body Swing', 'Chest Expansion', 'Clap & Sing', 'Drumming', 'Frog Pose', 'Marcas Shaking', 'Squat', 'Tree Pose', 'Twist Pose'].map(action => (
                <button 
                  key={action}
                  onClick={() => setSelectedAction(action)}
                  className={`p-4 rounded-xl border text-left transition-all ${selectedAction === action ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <span className="font-medium block">{action}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setStep('INSTRUCTIONS')} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2">
            Next Step <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Camera & Instructions
  return (
    <CameraInterface 
      action={selectedAction} 
      onClose={onClose} 
      step={step} 
      setStep={setStep}
      timer={timer}
      setTimer={setTimer}
      isRecording={isRecording}
      setIsRecording={setIsRecording}
    />
  );
}

const CameraInterface = ({ action, onClose, step, setStep, timer, setTimer, isRecording, setIsRecording }: any) => {
  const [showInstructions, setShowInstructions] = useState(true);
  const uploadMutation = useUploadVideoSession();

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setTimer((p: number) => p + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Review Screen (3.4)
  if (step === 'REVIEW') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
           <div className="absolute inset-0 flex items-center justify-center opacity-50">
             <Play size={64} className="text-white" />
           </div>
           <p className="absolute bottom-10 text-white/70 text-sm">Previewing Recording...</p>
        </div>
        <div className="bg-white p-6 rounded-t-2xl space-y-4">
           <div className="flex items-center gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
             <CheckCircle className="text-green-600" size={24} />
             <div>
               <h4 className="font-bold text-green-900">Quality Check Passed</h4>
               <p className="text-xs text-green-700">Lighting and stability look good.</p>
             </div>
           </div>
           <div className="flex gap-3">
             <button onClick={() => setStep('RECORDING')} className="flex-1 py-3 bg-white border border-slate-300 font-bold text-slate-700 rounded-xl">Retake</button>
             <button onClick={() => uploadMutation.mutate({}, { onSuccess: () => setStep('SUCCESS') })} disabled={uploadMutation.isPending} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
               {uploadMutation.isPending ? 'Uploading...' : 'Submit Video'}
             </button>
           </div>
        </div>
      </div>
    );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Complete!</h2>
        <p className="text-slate-500 mb-8">The video has been securely sent for AI analysis. You will be notified when results are ready.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Return to Dashboard</button>
      </div>
    );
  }

  // Instructions & Recording
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col text-white">
      {/* Top Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-8 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-start justify-between">
        <div className="flex flex-col gap-2">
           <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-semibold">
             {action}
           </span>
           {isRecording && (
             <div className="flex gap-2">
               <QualityBadge label="Light" status="good" />
               <QualityBadge label="Stable" status="good" />
             </div>
           )}
        </div>
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full hover:bg-black/60 backdrop-blur-sm">
          <X size={24} />
        </button>
      </div>

      {/* Camera Preview Simulation */}
      <div className="flex-1 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <span className="text-gray-500 text-lg">Camera Preview Feed</span>
        </div>
        
        {/* Silhouette Guide */}
        <div className="absolute inset-0 border-2 border-dashed border-white/30 m-8 rounded-3xl flex items-center justify-center pointer-events-none">
           <div className="w-64 h-96 border-4 border-white/10 rounded-[4rem] animate-pulse"></div>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-32 right-8 flex items-center gap-2 animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-red-500 font-bold tracking-widest text-xs">REC</span>
          </div>
        )}
        
        {/* Instruction Overlay */}
        {step === 'INSTRUCTIONS' && showInstructions && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-20">
            <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 mx-auto">
                <Info size={24} />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">{action} Guide</h3>
              <ul className="space-y-3 mb-6 text-sm text-gray-700">
                <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>Ensure full body visibility</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>Keep camera steady</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>Record for at least 30s</li>
              </ul>
              <button 
                onClick={() => { setShowInstructions(false); setStep('RECORDING'); }}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
              >
                I'm Ready
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/90 pb-8 pt-4 px-6 rounded-t-3xl">
        <div className="flex items-center justify-center mb-4">
           <span className="text-4xl font-mono font-bold tracking-wider">{formatTime(timer)}</span>
        </div>
        
        <div className="flex items-center justify-between max-w-xs mx-auto">
          <button className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors" disabled={isRecording}>
            <ZapOff size={24} />
          </button>
          
          <button 
            onClick={() => {
              if (isRecording) {
                setIsRecording(false);
                setStep('REVIEW');
              } else {
                setIsRecording(true);
              }
            }}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
              isRecording 
                ? 'border-red-500 bg-red-500/20' 
                : 'border-white bg-transparent'
            }`}
          >
            <div className={`rounded-full transition-all duration-300 ${
              isRecording 
                ? 'w-8 h-8 bg-red-500 rounded-md' 
                : 'w-16 h-16 bg-red-500'
            }`}></div>
          </button>
          
          <button className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors" disabled={isRecording}>
            <RotateCw size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

const QualityBadge = ({ label, status }: { label: string, status: 'good' | 'warning' | 'bad' }) => {
  const colors = {
    good: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    bad: 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${colors[status]} backdrop-blur-sm`}>
      {label}
    </span>
  );
};
