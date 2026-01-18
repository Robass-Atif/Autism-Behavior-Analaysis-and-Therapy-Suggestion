import React, { useState, useEffect } from 'react';
import { X, Camera, Zap, ZapOff, RotateCw, Play, Info, CheckCircle, ChevronRight, AlertTriangle, ArrowLeft, Video, User, Clock, Target } from 'lucide-react';
import { useUploadVideoSession } from '../../../api/clinical';
import { useCaregiverPatients } from '../../../api/caregiver';

interface GuidedVideoRecordingProps {
  onClose: () => void;
  patientId?: string;
}

type RecordingStep = 'SELECTION' | 'INSTRUCTIONS' | 'RECORDING' | 'REVIEW' | 'SUBMITTING' | 'SUCCESS';

// The 11 Specific Actions from FR-4
const GUIDED_ACTIONS = [
  {
    id: 'arm_swing_left',
    name: 'Arm Swing Left',
    icon: '🦾',
    description: 'Have the child swing their left arm forward and backward',
    duration: 30,
    instructions: [
      'Stand facing the camera',
      'Keep right arm still at side',
      'Swing left arm forward and back smoothly',
      'Repeat for 30 seconds'
    ]
  },
  {
    id: 'arm_swing_right',
    name: 'Arm Swing Right',
    icon: '💪',
    description: 'Have the child swing their right arm forward and backward',
    duration: 30,
    instructions: [
      'Stand facing the camera',
      'Keep left arm still at side',
      'Swing right arm forward and back smoothly',
      'Repeat for 30 seconds'
    ]
  },
  {
    id: 'body_swing',
    name: 'Body Swing',
    icon: '🧍',
    description: 'Full body swinging motion from side to side',
    duration: 30,
    instructions: [
      'Stand with feet shoulder-width apart',
      'Gently swing body left and right',
      'Keep movements controlled',
      'Continue for 30 seconds'
    ]
  },
  {
    id: 'chest_expansion',
    name: 'Chest Expansion',
    icon: '🫁',
    description: 'Expand chest with arms stretched wide',
    duration: 30,
    instructions: [
      'Start with arms crossed over chest',
      'Slowly stretch arms out to sides',
      'Take a deep breath as you expand',
      'Return to starting position and repeat'
    ]
  },
  {
    id: 'sing_and_clap',
    name: 'Sing and Clap',
    icon: '👏',
    description: 'Clapping hands while singing or humming',
    duration: 45,
    instructions: [
      'Play a simple song or nursery rhyme',
      'Encourage clapping in rhythm',
      'Can hum or sing along',
      'Continue for 45 seconds'
    ]
  },
  {
    id: 'drumming',
    name: 'Drumming',
    icon: '🥁',
    description: 'Drumming motion with hands on surface or in air',
    duration: 30,
    instructions: [
      'Sit or stand comfortably',
      'Use hands to drum on table or in air',
      'Try to maintain steady rhythm',
      'Continue for 30 seconds'
    ]
  },
  {
    id: 'frog_pose',
    name: 'Frog Pose',
    icon: '🐸',
    description: 'Squat position with hands between feet',
    duration: 20,
    instructions: [
      'Squat down with feet apart',
      'Place hands on floor between feet',
      'Hold position steadily',
      'Maintain for 20 seconds'
    ]
  },
  {
    id: 'maracas_shaking',
    name: 'Maracas Shaking',
    icon: '🎵',
    description: 'Shaking motion as if holding maracas',
    duration: 30,
    instructions: [
      'Hold imaginary maracas in each hand',
      'Shake hands up and down',
      'Keep elbows close to body',
      'Continue for 30 seconds'
    ]
  },
  {
    id: 'maracas_forward',
    name: 'Maracas Forward Shaking',
    icon: '🎶',
    description: 'Shaking motion forward and back',
    duration: 30,
    instructions: [
      'Hold imaginary maracas',
      'Extend arms forward',
      'Shake while moving arms forward and back',
      'Continue for 30 seconds'
    ]
  },
  {
    id: 'squat',
    name: 'Squat',
    icon: '🏋️',
    description: 'Basic squat exercise movement',
    duration: 30,
    instructions: [
      'Stand with feet shoulder-width apart',
      'Lower body by bending knees',
      'Keep back straight',
      'Stand back up and repeat'
    ]
  },
  {
    id: 'tree_pose',
    name: 'Tree Pose',
    icon: '🌳',
    description: 'Balance on one leg with arms raised',
    duration: 20,
    instructions: [
      'Stand on one leg',
      'Place other foot on inner thigh or calf',
      'Raise arms above head like branches',
      'Hold for 20 seconds, switch legs'
    ]
  },
  {
    id: 'twist_pose',
    name: 'Twist Pose',
    icon: '🔄',
    description: 'Gentle twisting motion of upper body',
    duration: 30,
    instructions: [
      'Sit or stand comfortably',
      'Keep hips facing forward',
      'Twist upper body to each side',
      'Continue alternating for 30 seconds'
    ]
  },
];

export default function GuidedVideoRecording({ onClose, patientId }: GuidedVideoRecordingProps) {
  const [step, setStep] = useState<RecordingStep>('SELECTION');
  const [selectedPatient, setSelectedPatient] = useState(patientId || '');
  const [selectedAction, setSelectedAction] = useState(GUIDED_ACTIONS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const { data: patientsData, isLoading: loadingPatients } = useCaregiverPatients();
  const patients = patientsData?.patients || [];

  // Selection Screen
  if (step === 'SELECTION') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-blue-50 z-50 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md p-4 border-b border-slate-200/50 flex items-center justify-between shadow-sm">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={24} />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-lg text-slate-900">Record New Video</h2>
            <p className="text-xs text-slate-500">Guided Activity Recording</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto w-full space-y-6">

            {/* Patient Selection */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <User size={16} className="text-blue-600" />
                Select Patient
              </label>
              {loadingPatients ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500">Loading patients...</div>
              ) : patients.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl text-center text-amber-700 text-sm">
                  No patients assigned. Please contact your therapist.
                </div>
              ) : (
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full p-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map((patient: any) => (
                    <option key={patient.id || patient._id} value={patient.id || patient._id}>
                      {patient.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Action Selection */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <Target size={16} className="text-blue-600" />
                Select Activity ({GUIDED_ACTIONS.length} actions available)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {GUIDED_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setSelectedAction(action)}
                    className={`p-4 rounded-xl border text-left transition-all ${selectedAction.id === action.id
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{action.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold block text-sm ${selectedAction.id === action.id ? 'text-blue-700' : 'text-slate-900'}`}>
                          {action.name}
                        </span>
                        <span className="text-xs text-slate-500 block mt-1 truncate">{action.description}</span>
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                          <Clock size={10} />
                          <span>{action.duration}s recommended</span>
                        </div>
                      </div>
                      {selectedAction.id === action.id && (
                        <CheckCircle size={18} className="text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={() => setStep('INSTRUCTIONS')}
              disabled={!selectedPatient}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Continue to Instructions <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Camera & Instructions
  return (
    <CameraInterface
      action={selectedAction}
      patientId={selectedPatient}
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

const CameraInterface = ({ action, patientId, onClose, step, setStep, timer, setTimer, isRecording, setIsRecording }: any) => {
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

  const handleUpload = () => {
    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('actionType', action.id);
    formData.append('duration', timer.toString());
    formData.append('recordedAt', new Date().toISOString());
    formData.append('qualityScore', 'High');
    // In real implementation, append the actual video file:
    // formData.append('video', recordedBlob);

    uploadMutation.mutate(formData, {
      onSuccess: () => setStep('SUCCESS'),
      onError: (error) => console.error('Upload failed:', error)
    });
  };

  // Review Screen
  if (step === 'REVIEW') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <Play size={64} className="text-white" />
          </div>
          <p className="absolute bottom-10 text-white/70 text-sm">Previewing: {action.name}</p>
        </div>
        <div className="bg-white p-6 rounded-t-3xl space-y-4">
          <div className="flex items-center gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
            <CheckCircle className="text-green-600" size={24} />
            <div>
              <h4 className="font-bold text-green-900">Recording Complete</h4>
              <p className="text-xs text-green-700">Duration: {formatTime(timer)} | Action: {action.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setStep('RECORDING'); setTimer(0); }}
              className="flex-1 py-3 bg-white border border-slate-300 font-bold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Retake
            </button>
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Submit Video'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (step === 'SUCCESS') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-50 to-emerald-50 z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
          <CheckCircle size={48} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Successful!</h2>
        <p className="text-slate-600 mb-2 max-w-sm">
          Your <span className="font-semibold">{action.name}</span> video has been securely uploaded.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          The therapist will review and analyze this recording.
        </p>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => { setStep('SELECTION'); setTimer(0); }}
            className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Record Another Action
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Instructions & Recording
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col text-white">
      {/* Top Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-8 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-sm font-semibold">
            <span className="text-lg">{action.icon}</span>
            {action.name}
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-20">
            <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center text-3xl mb-4 mx-auto">
                {action.icon}
              </div>
              <h3 className="text-xl font-bold text-center mb-1">{action.name}</h3>
              <p className="text-sm text-slate-500 text-center mb-4">{action.description}</p>

              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Instructions</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  {action.instructions.map((instruction: string, idx: number) => (
                    <li key={idx} className="flex gap-2">
                      <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
                <AlertTriangle size={16} />
                <span>Record for at least {action.duration} seconds</span>
              </div>

              <button
                onClick={() => { setShowInstructions(false); setStep('RECORDING'); }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                I'm Ready to Record
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/90 pb-8 pt-4 px-6 rounded-t-3xl">
        <div className="flex items-center justify-center mb-4">
          <span className={`text-4xl font-mono font-bold tracking-wider ${timer >= action.duration ? 'text-green-400' : 'text-white'}`}>
            {formatTime(timer)}
          </span>
          {timer > 0 && timer < action.duration && (
            <span className="ml-3 text-sm text-slate-400">/{formatTime(action.duration)}</span>
          )}
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
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${isRecording
                ? 'border-red-500 bg-red-500/20'
                : 'border-white bg-transparent'
              }`}
          >
            <div className={`rounded-full transition-all duration-300 ${isRecording
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
