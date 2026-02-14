import React, { useState, useEffect, useRef } from 'react';
import {
  X, Camera, Zap, ZapOff, RotateCw, Play, Info,
  CheckCircle, ChevronRight, AlertTriangle, ArrowLeft,
  Video, User, Clock, Target, ShieldCheck, Loader2, Upload
} from 'lucide-react';
import { useUploadVideoSession } from '../../../api/clinical';
import { useCaregiverPatients } from '../../../api/caregiver';

interface GuidedVideoRecordingProps {
  onClose: () => void;
  patientId?: string;
}

type RecordingStep = 'SELECTION' | 'INSTRUCTIONS' | 'RECORDING' | 'REVIEW' | 'SUBMITTING' | 'SUCCESS' | 'UPLOAD_REVIEW';

// The 11 Specific Actions from FR-4
const GUIDED_ACTIONS = [
  {
    id: 'arm_swing_left',
    name: 'Arm Swing Left',
    icon: '🦾',
    description: 'Bilateral arm movement study | Forward and backward swing.',
    duration: 30,
    instructions: [
      'Position subject facing camera primary axis',
      'Lock right arm at ventral side',
      'Initialize smooth pendulum swing of left arm',
      'Execute for full duration cycle'
    ]
  },
  {
    id: 'arm_swing_right',
    name: 'Arm Swing Right',
    icon: '💪',
    description: 'Bilateral arm movement study | Forward and backward swing.',
    duration: 30,
    instructions: [
      'Position subject facing camera primary axis',
      'Lock left arm at ventral side',
      'Initialize smooth pendulum swing of right arm',
      'Execute for full duration cycle'
    ]
  },
  {
    id: 'body_swing',
    name: 'Body Swing',
    icon: '🧍',
    description: 'Trunk stability and lateral motion analysis.',
    duration: 30,
    instructions: [
      'Establish shoulder-width base stance',
      'Initiate lateral trunk oscillation',
      'Maintain controlled rhythmic motion',
      'Execute for full duration cycle'
    ]
  },
  {
    id: 'chest_expansion',
    name: 'Chest Expansion',
    icon: '🫁',
    description: 'Respiratory and thoracic expansion metrics.',
    duration: 30,
    instructions: [
      'Initialize in ventral-cross arm position',
      'Execute lateral arm extension sequence',
      'Synchronize deep inhalation with expansion',
      'Recycle to base position and repeat'
    ]
  },
  {
    id: 'sing_and_clap',
    name: 'Sing and Clap',
    icon: '👏',
    description: 'Rhythmic coordination and vocalization study.',
    duration: 45,
    instructions: [
      'Initialize auditory stimulus (rhythmic)',
      'Establish consistent clapping cadence',
      'Synchronize vocalization/humming',
      'Maintain for 45s capture cycle'
    ]
  },
  {
    id: 'drumming',
    name: 'Drumming',
    icon: '🥁',
    description: 'Motor rhythm and surface interaction analysis.',
    duration: 30,
    instructions: [
      'Subject seated at horizontal plane surface',
      'Initiate rhythmic percussive motion',
      'Maintain steady tempo and velocity',
      'Capture full sequence for analysis'
    ]
  },
  {
    id: 'frog_pose',
    name: 'Frog Pose',
    icon: '🐸',
    description: 'Isometric lower limb and core stability.',
    duration: 20,
    instructions: [
      'Descend to deep squat base',
      'Place palmar surfaces on inner floor axis',
      'Lock position in static isometric state',
      'Maintain for 20s hold-cycle'
    ]
  },
  {
    id: 'maracas_shaking',
    name: 'Maracas Shaking',
    icon: '🎵',
    description: 'Hand-arm oscillation and tremor analysis.',
    duration: 30,
    instructions: [
      'Simulate grasp of bilateral maracas',
      'Initialize vertical oscillation sequence',
      'Maintain proximal elbow positioning',
      'Continue for 30s capture period'
    ]
  },
  {
    id: 'maracas_forward',
    name: 'Maracas Forward Shaking',
    icon: '🎶',
    description: 'Extended limb oscillation and reach study.',
    duration: 30,
    instructions: [
      'Initialize with extended anterior reach',
      'Execute rhythmic shaking sequence',
      'Maintain arm extension throughout',
      'Capture full 30s motion profile'
    ]
  },
  {
    id: 'squat',
    name: 'Squat',
    icon: '🏋️',
    description: 'Mechanical squat trajectory and depth analysis.',
    duration: 30,
    instructions: [
      'Establish shoulder-width base stance',
      'Execute controlled vertical descent',
      'Maintain neutral spinal alignment',
      'Complete repeat cycles for 30s'
    ]
  },
  {
    id: 'tree_pose',
    name: 'Tree Pose',
    icon: '🌳',
    description: 'Bilateral balance and equilibrium metrics.',
    duration: 20,
    instructions: [
      'Establish unilateral base support',
      'Position secondary foot on inner limb axis',
      'Execute vertical branch extension (arms)',
      'Hold static balance for duration'
    ]
  },
  {
    id: 'twist_pose',
    name: 'Twist Pose',
    icon: '🔄',
    description: 'Segmented upper body rotation analysis.',
    duration: 30,
    instructions: [
      'Maintain static pelvic alignment',
      'Execute lateral trunk rotation sequence',
      'Alternate nodes with controlled velocity',
      'Maintain cycles for 30s capture'
    ]
  },
];

export default function GuidedVideoRecording({ onClose, patientId }: GuidedVideoRecordingProps) {
  const [step, setStep] = useState<RecordingStep>('SELECTION');
  const [selectedPatient, setSelectedPatient] = useState(patientId || '');
  const [selectedAction, setSelectedAction] = useState(GUIDED_ACTIONS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: patientsData, isLoading: loadingPatients } = useCaregiverPatients();
  const patients = patientsData?.patients || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedBlob(file);
    setStep('UPLOAD_REVIEW');
  };

  if (step === 'SELECTION') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col font-mono text-zinc-900 animate-in fade-in duration-300">
        {/* Top Header */}
        <header className="border-b border-zinc-100 p-6 flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors">
            <X size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-xs font-black uppercase tracking-[0.3em]">RECORDING_INTERFACE_V1</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Select subject and action node</p>
          </div>
          <div className="w-10 h-10 border border-zinc-200 flex items-center justify-center opacity-20">
            <ShieldCheck size={18} />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-12">
          <div className="max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">

            {/* Left: Configuration */}
            <div className="lg:col-span-12 space-y-12">
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                  <User size={14} /> Subject_Kernel
                </h3>
                <div className="relative group">
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full bg-zinc-50 border-b-2 border-zinc-200 px-6 py-4 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all appearance-none cursor-pointer font-bold uppercase tracking-widest"
                  >
                    <option value="">-- SELECT_SUBJECT_ID --</option>
                    {patients.map((patient: any) => (
                      <option key={patient.id || patient._id} value={patient.id || patient._id}>
                        {patient.fullName.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-100">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Target size={14} /> Action_Node_Library
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-300 tracking-tighter">{GUIDED_ACTIONS.length} TOTAL_NODES</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-t border-zinc-100">
                  {GUIDED_ACTIONS.map(action => (
                    <button
                      key={action.id}
                      onClick={() => setSelectedAction(action)}
                      className={`p-6 border-r border-b border-zinc-100 text-left transition-all relative group ${selectedAction.id === action.id ? 'bg-zinc-900 text-white' : 'bg-white hover:bg-zinc-50'
                        }`}
                    >
                      <div className="flex flex-col gap-4">
                        <span className={`text-2xl transition-all grayscale ${selectedAction.id === action.id ? 'grayscale-0' : 'opacity-40 group-hover:opacity-100'}`}>
                          {action.icon}
                        </span>
                        <div>
                          <span className="block text-xs font-black uppercase tracking-tight mb-1">{action.name.replace(' ', '_')}</span>
                          <span className={`block text-[9px] font-bold leading-relaxed opacity-60 line-clamp-2`}>{action.description.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-bold opacity-40">
                          <Clock size={10} />
                          <span>00:{action.duration} SECS</span>
                        </div>
                      </div>
                      {selectedAction.id === action.id && (
                        <div className="absolute top-2 right-2 p-1"><div className="w-1 h-1 bg-white"></div></div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Initialize BTNs */}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep('INSTRUCTIONS')}
                  disabled={!selectedPatient}
                  className="flex-1 py-6 bg-zinc-900 text-white text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-zinc-800 transition-all disabled:opacity-20 group relative overflow-hidden"
                >
                  <Camera size={18} className="relative z-10" />
                  <span className="relative z-10 transition-transform group-hover:translate-x-[-4px]">CAPTURE_VIDEO</span>
                  <ChevronRight size={18} className="relative z-10 transition-transform group-hover:translate-x-2" />
                  <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700"></div>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedPatient}
                  className="flex-1 py-6 border-2 border-zinc-900 text-zinc-900 text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-zinc-900 hover:text-white transition-all disabled:opacity-20 group relative overflow-hidden"
                >
                  <Upload size={18} className="relative z-10" />
                  <span className="relative z-10 transition-transform group-hover:translate-x-[-4px]">UPLOAD_VIDEO</span>
                  <ChevronRight size={18} className="relative z-10 transition-transform group-hover:translate-x-2" />
                  <div className="absolute inset-0 bg-zinc-900/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700"></div>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'UPLOAD_REVIEW') {
    return (
      <UploadReviewInterface
        blob={uploadedBlob}
        action={selectedAction}
        patientId={selectedPatient}
        onClose={onClose}
        onRetake={() => { setStep('SELECTION'); setUploadedBlob(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        onSuccess={() => setStep('SUCCESS')}
      />
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
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const uploadMutation = useUploadVideoSession();

  // Camera Initialization
  useEffect(() => {
    if (step === 'RECORDING' || step === 'INSTRUCTIONS' || step === 'SELECTION') {
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: true
      })
        .then(s => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.error("Camera access denied:", err);
          setError("CAMERA_ACCESS_DENIED: Please enable camera and microphone permissions.");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setTimer((p: number) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      if (previewRef.current) {
        previewRef.current.src = url;
      }
    };

    mediaRecorder.start(1000); // Collect data every 1s
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    setTimer(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStep('REVIEW');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = () => {
    if (!recordedBlob) return;

    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('actionType', action.id);
    formData.append('duration', timer.toString());
    formData.append('recordedAt', new Date().toISOString());
    formData.append('qualityScore', 'high'); // DTO expects lowercase
    formData.append('video', recordedBlob, `recording-${action.id}.webm`);

    uploadMutation.mutate(formData, {
      onSuccess: () => setStep('SUCCESS'),
      onError: (err: any) => {
        console.error('Upload failed:', err);
        setError(`UPLOAD_FAILED: ${err.message || 'Unknown network error'}`);
      }
    });
  };

  if (step === 'REVIEW') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col font-mono text-zinc-900">
        <div className="flex-1 bg-zinc-950 flex items-center justify-center relative overflow-hidden">
          <video
            ref={previewRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
          />
          <div className="absolute inset-0 border-[24px] border-black/20 pointer-events-none"></div>
          <div className="absolute top-8 left-8">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">REVIEW_MODE | RAW_BUFFER</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 p-4 border-l-4 border-red-600 flex items-center gap-4 mx-8 mt-4">
            <AlertTriangle className="text-red-600" size={18} />
            <p className="text-[10px] font-black uppercase text-red-900 tracking-widest">{error}</p>
          </div>
        )}

        <div className="bg-white p-8 md:p-12 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-zinc-900 flex items-center justify-center text-white border border-zinc-900">
              <CheckCircle size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase tracking-tight mb-1">CAPTURE_COMPLETED</h4>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                DURATION: {formatTime(timer)} | NODE: {action.id.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={() => { setStep('RECORDING'); setTimer(0); setRecordedBlob(null); setError(null); }}
              className="flex-1 md:flex-none px-12 py-4 border border-zinc-200 font-black text-xs uppercase tracking-widest hover:bg-zinc-50 transition-colors"
            >
              RETAKE_PROCEDURE
            </button>
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !recordedBlob}
              className="flex-1 md:flex-none px-12 py-4 bg-zinc-900 text-white font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
            >
              {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'SUBMIT_FOR_ANALYSIS'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 text-center font-mono">
        <div className="w-24 h-24 bg-zinc-900 flex items-center justify-center mb-8 border border-zinc-900">
          <CheckCircle size={48} className="text-white" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">UPLOAD_SECURED</h2>
        <div className="max-w-md bg-zinc-50 border border-zinc-200 p-8 space-y-4 mb-12 relative">
          <div className="absolute top-0 right-0 p-1"><div className="w-1 h-1 bg-zinc-900"></div></div>
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-wide leading-relaxed">
            Node <span className="text-zinc-900">[{action.id.toUpperCase()}]</span> has been synchronized with clinical database.
          </p>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
             Automated behavioral analysis sequence pending therapist review.
          </p>
        </div>
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={() => { setStep('SELECTION'); setTimer(0); setRecordedBlob(null); setError(null); }}
            className="w-full py-5 bg-zinc-900 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all"
          >
            CAPTURE_NEW_NODE
          </button>
          <button
            onClick={onClose}
            className="w-full py-5 border border-zinc-200 text-zinc-400 text-xs font-black uppercase tracking-[0.2em] hover:text-zinc-900 hover:bg-zinc-50 transition-all"
          >
            EXIT_INTERFACE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col text-white font-mono selection:bg-white selection:text-black">
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 pt-12 z-20 flex items-start justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white flex items-center justify-center text-black border border-white">
              <span className="text-xl">{action.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">ACTIVE_NODE</p>
              <h3 className="text-xs font-black uppercase tracking-tighter">{action.name.replace(' ', '_')}</h3>
            </div>
          </div>
          {isRecording && (
            <div className="flex gap-2">
              <div className="px-2 py-0.5 border border-emerald-500 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest">OPTIC_STABLE</div>
              <div className="px-2 py-0.5 border border-emerald-500 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest">RAW_SYNC</div>
            </div>
          )}
        </div>
        <button onClick={onClose} className="w-12 h-12 border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
          <X size={24} />
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          autoPlay
          muted
          playsInline
        />

        {/* Optical Center Crosshair */}
        <div className="absolute w-8 h-[1px] bg-white/20"></div>
        <div className="absolute h-8 w-[1px] bg-white/20"></div>

        {/* Silhouette Guide (Technical) */}
        <div className="absolute w-[80%] h-[80%] border border-white/5 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-96 border border-white/10 relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></div>
          </div>
        </div>

        {/* Recording Alert */}
        {isRecording && (
          <div className="absolute top-32 right-12 flex items-center gap-3 animate-pulse">
            <div className="w-3 h-3 bg-red-600"></div>
            <span className="text-red-600 font-black tracking-[0.4em] text-[10px]">RAW_CAPTURE_ACTIVE</span>
          </div>
        )}

        {/* Error HUD */}
        {error && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-950/90 border border-red-500 p-8 max-w-md w-full z-40">
            <AlertTriangle className="text-red-500 mb-4" size={32} />
            <h3 className="text-sm font-black uppercase mb-2">SYSTEM_FAULT_DETECTED</h3>
            <p className="text-[10px] text-red-200/60 uppercase leading-loose">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-6 w-full py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest">FORCE_REBOOT</button>
          </div>
        )}

        {/* Instructions Module */}
        {step === 'INSTRUCTIONS' && showInstructions && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-30 animate-in fade-in duration-500">
            <div className="bg-white text-zinc-900 p-10 max-w-lg w-full relative overflow-hidden">
              <header className="mb-8 border-b border-zinc-100 pb-6 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">PROCEDURAL_GUIDE</p>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{action.name.replace(' ', '_')}</h3>
                </div>
                <div className="text-4xl grayscale mb-2">{action.icon}</div>
              </header>

              <div className="mb-10 space-y-6">
                <ul className="space-y-4">
                  {action.instructions.map((instruction: string, idx: number) => (
                    <li key={idx} className="flex gap-4 items-start">
                      <span className="text-[10px] font-black bg-zinc-900 text-white w-5 h-5 flex items-center justify-center flex-shrink-0">0{idx + 1}</span>
                      <span className="text-[11px] font-bold uppercase leading-relaxed tracking-tight text-zinc-600">{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => { setShowInstructions(false); setStep('RECORDING'); }}
                className="w-full py-5 bg-zinc-900 text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all flex items-center justify-center gap-4"
              >
                START_PROCEDURE <ArrowLeft className="rotate-180" size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="bg-zinc-900 pb-12 pt-8 px-10 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between max-w-4xl mx-auto gap-8">

          <div className="flex flex-col items-center md:items-start gap-1 min-w-[120px]">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em]">CAPTURE_WINDOW</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black tracking-tighter ${timer >= action.duration ? 'text-emerald-500' : 'text-white'}`}>
                {formatTime(timer)}
              </span>
              <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">/ {formatTime(action.duration)}</span>
            </div>
          </div>

          {/* Master Record Trigger */}
          <button
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            disabled={!!error}
            className="group relative"
          >
            <div className={`w-20 h-20 border-2 transition-all duration-500 flex items-center justify-center ${isRecording ? 'border-red-600 bg-red-600/10' : 'border-white bg-transparent hover:border-zinc-400'
              }`}>
              <div className={`transition-all duration-300 ${isRecording ? 'w-6 h-6 bg-red-600' : 'w-14 h-14 bg-red-600 border-4 border-zinc-900'
                }`}></div>
            </div>
            {!isRecording && (
              <div className="absolute inset-0 border border-white/10 scale-150 animate-pulse pointer-events-none"></div>
            )}
          </button>

          <div className="flex gap-4">
            <button className="w-12 h-12 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white" disabled={isRecording}>
              <RotateCw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-6 bg-black border-t border-white/5 flex items-center overflow-hidden">
        <div className="flex gap-12 animate-marquee-slower whitespace-nowrap overflow-hidden pr-12">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="text-[8px] font-black text-white/10 uppercase tracking-[1em]">CAPTURE_MODE_ACTIVE | SIGNAL_ENCRYPTED | ABA-TS_CORE_LINK</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const UploadReviewInterface = ({ blob, action, patientId, onClose, onRetake, onSuccess }: {
  blob: Blob | null;
  action: typeof GUIDED_ACTIONS[number];
  patientId: string;
  onClose: () => void;
  onRetake: () => void;
  onSuccess: () => void;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const uploadMutation = useUploadVideoSession();

  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [blob]);

  const handleUpload = () => {
    if (!blob) return;

    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('actionType', action.id);
    formData.append('duration', '0');
    formData.append('recordedAt', new Date().toISOString());
    formData.append('qualityScore', 'high');
    formData.append('video', blob, `upload-${action.id}.${blob.type.includes('webm') ? 'webm' : 'mp4'}`);

    uploadMutation.mutate(formData, {
      onSuccess: () => onSuccess(),
      onError: (err: any) => {
        console.error('Upload failed:', err);
        setError(`UPLOAD_FAILED: ${err.message || 'Unknown network error'}`);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col font-mono text-zinc-900">
      <div className="flex-1 bg-zinc-950 flex items-center justify-center relative overflow-hidden">
        {previewUrl && (
          <video
            src={previewUrl}
            className="w-full h-full object-contain"
            controls
            autoPlay
          />
        )}
        <div className="absolute inset-0 border-[24px] border-black/20 pointer-events-none"></div>
        <div className="absolute top-8 left-8">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">UPLOAD_REVIEW | FILE_BUFFER</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 border-l-4 border-red-600 flex items-center gap-4 mx-8 mt-4">
          <AlertTriangle className="text-red-600" size={18} />
          <p className="text-[10px] font-black uppercase text-red-900 tracking-widest">{error}</p>
        </div>
      )}

      <div className="bg-white p-8 md:p-12 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-zinc-900 flex items-center justify-center text-white border border-zinc-900">
            <Upload size={32} />
          </div>
          <div>
            <h4 className="text-xl font-black uppercase tracking-tight mb-1">VIDEO_UPLOADED</h4>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              NODE: {action.id.toUpperCase()} | {blob ? `${(blob.size / (1024 * 1024)).toFixed(1)} MB` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={onRetake}
            className="flex-1 md:flex-none px-12 py-4 border border-zinc-200 font-black text-xs uppercase tracking-widest hover:bg-zinc-50 transition-colors"
          >
            CHOOSE_DIFFERENT
          </button>
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending || !blob}
            className="flex-1 md:flex-none px-12 py-4 bg-zinc-900 text-white font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'SUBMIT_FOR_ANALYSIS'}
          </button>
        </div>
      </div>
    </div>
  );
};
