import React, { useState, useEffect } from 'react';
import { X, Camera, Zap, ZapOff, RotateCw, Play, Info } from 'lucide-react';

interface GuidedVideoRecordingProps {
  onClose: () => void;
}

export default function GuidedVideoRecording({ onClose }: GuidedVideoRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col text-white">
      {/* Top Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-8 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-start justify-between">
        <div className="flex flex-col gap-2">
           <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-semibold">
             Arm Swing - Left
           </span>
           <div className="flex gap-2">
             <QualityBadge label="Light" status="good" />
             <QualityBadge label="Stable" status="warning" />
             <QualityBadge label="Frame" status="good" />
           </div>
        </div>
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full hover:bg-black/60 backdrop-blur-sm">
          <X size={24} />
        </button>
      </div>

      {/* Camera Preview Simulation */}
      <div className="flex-1 bg-gray-900 relative overflow-hidden">
        {/* Mock video feed background */}
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
        {showInstructions && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-20">
            <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 mx-auto">
                <Info size={24} />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Arm Swing Exercise</h3>
              <p className="text-gray-500 text-center mb-4 text-sm">Please ensure the patient's full upper body is visible.</p>
              <ul className="space-y-3 mb-6 text-sm text-gray-700">
                <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>Record for at least 30 seconds</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>Keep camera steady at chest height</li>
                <li className="flex gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>Ensure good lighting on the face</li>
              </ul>
              <button 
                onClick={() => setShowInstructions(false)}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
              >
                Got it, let's start
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
          <button className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
            <ZapOff size={24} />
          </button>
          
          <button 
            onClick={() => setIsRecording(!isRecording)}
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
          
          <button className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
            <RotateCw size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

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