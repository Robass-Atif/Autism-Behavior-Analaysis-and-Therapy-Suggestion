import React, { useState, useRef, useEffect } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward,
  ChevronLeft, Activity, Brain, Clock, TrendingUp, FileText,
  Loader2, Sparkles, CheckCircle2, AlertCircle, Zap, Target
} from 'lucide-react';
import { useVideoSession, useTriggerAIAnalysis, useUpdateVideoSession } from '../../../api/clinical';

export default function VideoReviewInterface() {
  const { videoId } = useParams({ strict: false });
  const id = videoId as string;
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: session, isLoading } = useVideoSession(id || '');
  const triggerAnalysis = useTriggerAIAnalysis();
  const updateSession = useUpdateVideoSession();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (session?.therapistNotes) {
      setNotes(session.therapistNotes);
    }
  }, [session]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
    if (vol === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!id) return;

    try {
      await triggerAnalysis.mutateAsync(id);
      setTimeout(() => {
        window.location.reload();
      }, 3500);
    } catch (error) {
      console.error('Failed to trigger AI analysis:', error);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    try {
      await updateSession.mutateAsync({
        id,
        data: { therapistNotes: notes }
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleMarkReviewed = async () => {
    if (!id) return;

    try {
      await updateSession.mutateAsync({
        id,
        data: { reviewed: true, reviewedAt: new Date() }
      });
      setShowSuccess(true);
      setTimeout(() => {
        window.location.href = '/videos';
      }, 1500);
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'analyzed':
        return 'bg-zinc-900 text-white border-zinc-900';
      case 'processing':
        return 'bg-amber-500 text-white border-amber-500 animate-pulse';
      case 'uploaded':
        return 'bg-zinc-400 text-white border-zinc-400';
      case 'reviewed':
        return 'bg-green-600 text-white border-green-600';
      default:
        return 'bg-zinc-200 text-zinc-700 border-zinc-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 font-mono">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-zinc-900" size={48} />
          <p className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 font-mono">
        <div className="bg-white border-2 border-zinc-900 p-12 max-w-md text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
          <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-2">Session Not Found</h2>
          <p className="text-zinc-600 mb-6 text-sm">The video session doesn't exist.</p>
          <button
            onClick={() => window.location.href = '/videos'}
            className="px-6 py-3 bg-zinc-900 text-white border-2 border-zinc-900 font-bold uppercase text-xs tracking-widest hover:bg-zinc-800 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-mono">
      {/* Header */}
      <header className="bg-zinc-900 border-b-2 border-zinc-900">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/videos'}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Back</span>
              </button>

              <div className="h-8 w-px bg-white/20"></div>

              <div>
                <h1 className="text-lg font-black text-white uppercase tracking-tight">
                  {session.actionType || 'Video Analysis'}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">{session.patientName}</p>
                  <span className="text-zinc-600">•</span>
                  <p className="text-xs text-zinc-500 font-bold">
                    {new Date(session.recordedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 border-2 text-xs font-bold uppercase tracking-widest ${getStatusStyle(session.status)}`}>
                {session.status}
              </span>

              {session.aiConfidence && (
                <div className="flex items-center gap-2 bg-zinc-100 border-2 border-zinc-300 px-3 py-1.5">
                  <Brain size={14} className="text-zinc-900" />
                  <span className="text-xs font-black text-zinc-900">{session.aiConfidence}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Video Player Section */}
          <div className="xl:col-span-2 space-y-6">

            {/* Video Container */}
            <div className="bg-zinc-900 border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="aspect-video relative bg-black">
                <video
                  ref={videoRef}
                  src={session.videoUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={handlePlayPause}
                />

                {/* Play Overlay */}
                {!isPlaying && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer group"
                    onClick={handlePlayPause}
                  >
                    <div className="bg-white p-6 border-2 border-zinc-900 group-hover:bg-zinc-100 transition-colors">
                      <Play size={48} className="text-zinc-900" fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>

              {/* Video Controls */}
              <div className="bg-zinc-950 px-6 py-4 border-t-2 border-zinc-800">
                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-zinc-700 appearance-none cursor-pointer border border-zinc-600
                      [&::-webkit-slider-thumb]:appearance-none 
                      [&::-webkit-slider-thumb]:w-4 
                      [&::-webkit-slider-thumb]:h-4 
                      [&::-webkit-slider-thumb]:bg-white
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-zinc-900
                      [&::-webkit-slider-thumb]:cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #fff 0%, #fff ${(currentTime / duration) * 100}%, #3f3f46 ${(currentTime / duration) * 100}%, #3f3f46 100%)`
                    }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlayPause}
                      className="px-3 py-2 bg-white text-zinc-900 border-2 border-white hover:bg-zinc-100 transition-colors"
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    <button onClick={() => skip(-10)} className="p-2 text-white/70 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all">
                      <SkipBack size={16} />
                    </button>
                    <button onClick={() => skip(10)} className="p-2 text-white/70 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all">
                      <SkipForward size={16} />
                    </button>

                    <div className="text-xs font-bold text-white/90 tabular-nums ml-2">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button onClick={handleToggleMute} className="text-white/70 hover:text-white transition-colors">
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>

                    <select
                      value={playbackRate}
                      onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                      className="bg-zinc-800 text-white text-xs border border-zinc-700 px-2 py-1 font-bold uppercase cursor-pointer"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1.0x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2.0x</option>
                    </select>

                    <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white/70 hover:text-white transition-colors">
                      <Maximize size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-zinc-50 px-6 py-4 border-b-2 border-zinc-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} />
                    Clinical Notes
                  </h3>
                  {showSuccess && (
                    <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 size={14} />
                      Saved
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document clinical observations..."
                  className="w-full h-40 p-4 border-2 border-zinc-300 focus:border-zinc-900 focus:outline-none text-sm resize-none font-mono"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={updateSession.isPending}
                  className="mt-4 px-6 py-3 bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800 transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  {updateSession.isPending ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>

          {/* AI Analysis Panel */}
          <div className="space-y-6">

            {/* AI Analysis Card */}
            <div className="bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-zinc-900 px-6 py-4 border-b-2 border-zinc-900">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Brain size={16} />
                  AI Analysis
                </h3>
                <p className="text-zinc-400 text-xs mt-1 uppercase tracking-wider font-bold">Neural Detection System</p>
              </div>

              <div className="p-6">

                {/* No Analysis State */}
                {session.status === 'uploaded' && (
                  <div className="text-center py-8">
                    <div className="bg-zinc-100 p-8 border-2 border-zinc-300 mb-6 inline-block">
                      <Sparkles className="text-zinc-900" size={48} />
                    </div>
                    <h4 className="text-base font-black text-zinc-900 mb-2 uppercase tracking-tight">Ready for Analysis</h4>
                    <p className="text-zinc-600 text-xs mb-6 uppercase tracking-wider">
                      Behavioral pattern detection
                    </p>
                    <button
                      onClick={handleTriggerAnalysis}
                      disabled={triggerAnalysis.isPending}
                      className="px-6 py-3 bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800 font-bold uppercase text-xs tracking-widest transition-colors disabled:opacity-50"
                    >
                      {triggerAnalysis.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Initializing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Zap size={16} />
                          Start AI Analysis
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* Processing State */}
                {session.status === 'processing' && (
                  <div className="text-center py-8">
                    <Loader2 className="mx-auto mb-6 text-zinc-900 animate-spin" size={48} />
                    <h4 className="text-base font-black text-zinc-900 mb-2 uppercase tracking-tight">Processing Video</h4>
                    <p className="text-zinc-600 text-xs uppercase tracking-wider">
                      Analyzing patterns...
                    </p>
                  </div>
                )}

                {/* Analysis Results */}
                {session.status === 'analyzed' && session.aiAnalysis && (
                  <div className="space-y-6">

                    {/* Confidence Score */}
                    <div className="bg-zinc-50 border-2 border-zinc-300 p-6 text-center">
                      <div className="inline-flex relative mb-3">
                        <svg className="w-28 h-28 transform -rotate-90">
                          <circle
                            cx="56"
                            cy="56"
                            r="50"
                            stroke="#e4e4e7"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <circle
                            cx="56"
                            cy="56"
                            r="50"
                            stroke="#18181b"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 50}`}
                            strokeDashoffset={`${2 * Math.PI * 50 * (1 - (session.aiConfidence || 0) / 100)}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black text-zinc-900">
                            {session.aiConfidence}%
                          </span>
                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Confidence</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <Target size={14} className="text-zinc-900" />
                        <span className="text-zinc-700">High Accuracy</span>
                      </div>
                    </div>

                    {/* Summary */}
                    {session.aiAnalysis.summary && (
                      <div>
                        <h4 className="text-xs font-black text-zinc-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                          <Activity size={14} />
                          Summary
                        </h4>
                        <div className="bg-zinc-50 p-4 border-l-4 border-zinc-900">
                          <p className="text-xs text-zinc-700 leading-relaxed">
                            {session.aiAnalysis.summary}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Detected Behaviors */}
                    {session.aiAnalysis.behaviors && session.aiAnalysis.behaviors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black text-zinc-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp size={14} />
                          Detected Behaviors
                        </h4>
                        <div className="space-y-2">
                          {session.aiAnalysis.behaviors.map((behavior: any, index: number) => (
                            <div
                              key={index}
                              className="bg-white border-2 border-zinc-200 p-3 hover:border-zinc-900 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="font-bold text-zinc-900 text-xs uppercase tracking-tight">{behavior.type}</span>
                                <span className="px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider">
                                  {Math.round(behavior.confidence * 100)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                                <Clock size={10} />
                                <span>{formatTime(behavior.timestamp)}</span>
                                <span className="w-1 h-1 bg-zinc-400"></span>
                                <span className={`px-1.5 py-0.5 border ${behavior.severity === 'Normal' ? 'bg-green-50 border-green-600 text-green-700' :
                                    behavior.severity === 'Mild' ? 'bg-amber-50 border-amber-600 text-amber-700' :
                                      'bg-red-50 border-red-600 text-red-700'
                                  }`}>
                                  {behavior.severity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {session.aiAnalysis.recommendations && session.aiAnalysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black text-zinc-900 mb-3 uppercase tracking-wider">
                          Recommendations
                        </h4>
                        <div className="space-y-2">
                          {session.aiAnalysis.recommendations.map((rec: string, index: number) => (
                            <div key={index} className="flex gap-3 items-start">
                              <div className="w-5 h-5 bg-zinc-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CheckCircle2 size={12} className="text-white" />
                              </div>
                              <p className="text-xs text-zinc-700 leading-relaxed flex-1 font-bold">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mark as Reviewed Button */}
            {session.status === 'analyzed' && (
              <button
                onClick={handleMarkReviewed}
                disabled={updateSession.isPending || session.reviewed}
                className="w-full py-4 bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800 font-bold uppercase text-sm tracking-widest transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {session.reviewed ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} />
                    Reviewed
                  </span>
                ) : updateSession.isPending ? (
                  'Saving...'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} />
                    Mark as Reviewed
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}