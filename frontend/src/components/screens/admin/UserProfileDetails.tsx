import React, { useState } from 'react';
import {
    X, Mail, Phone, Calendar, Clock, Shield,
    FileText, Building2, MapPin, Activity,
    Download, Loader2, User, Hash, AlertCircle, CheckCircle
} from 'lucide-react';
import { useAdminUserDetails } from '../../../api/admin';

interface UserProfileDetailsProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    actions?: React.ReactNode;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode; icon?: any; className?: string }> = ({
    label, value, icon: Icon, className = ''
}) => (
    <div className={`p-4 border-b border-zinc-100 last:border-0 ${className}`}>
        <div className="flex items-start gap-3">
            {Icon && <Icon size={16} className="text-zinc-400 mt-0.5" />}
            <div className="flex-1">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    {label}
                </div>
                <div className="text-sm font-mono text-zinc-900 break-words">
                    {value || <span className="text-zinc-300">-</span>}
                </div>
            </div>
        </div>
    </div>
);

const SectionHeader: React.FC<{ title: string; icon?: any }> = ({ title, icon: Icon }) => (
    <div className="bg-zinc-50 px-4 py-2 border-y border-zinc-200 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-zinc-500" />}
        <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">{title}</span>
    </div>
);

const UserProfileDetails: React.FC<UserProfileDetailsProps> = ({
    userId, isOpen, onClose, title = 'USER_PROFILE', actions
}) => {
    const { data: user, isLoading, error } = useAdminUserDetails(userId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-black text-white px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 border border-white/20">
                            <User size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight uppercase">{title}</h2>
                            {isLoading ? (
                                <div className="h-3 w-24 bg-white/20 animate-pulse rounded mt-1" />
                            ) : (
                                <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider mt-0.5">
                                    ID: {user?.id}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 transition-colors text-zinc-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <Loader2 size={32} className="animate-spin text-zinc-300" />
                            <p className="text-xs text-zinc-400 uppercase tracking-widest">Loading profile data...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-red-500">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <p className="font-bold">Failed to load user data</p>
                            <p className="text-sm mt-2 text-zinc-500">{(error as any)?.message || 'Unknown error occurred'}</p>
                        </div>
                    ) : user ? (
                        <div className="flex flex-col md:flex-row h-full">
                            {/* Left Column: Identity & Contact */}
                            <div className="md:w-1/3 border-r border-zinc-200 bg-zinc-50/50">
                                <div className="p-6 text-center border-b border-zinc-200 bg-white">
                                    <div className="w-24 h-24 bg-zinc-100 mx-auto flex items-center justify-center mb-4 text-3xl font-bold text-zinc-400 border-2 border-zinc-200">
                                        {user.fullName?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <h3 className="text-xl font-bold text-zinc-900 mb-1">{user.fullName}</h3>
                                    <div className={`inline-flex items-center px-2.5 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${user.role === 'therapist' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            user.role === 'caregiver' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                                                'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                        {user.role}
                                    </div>
                                </div>

                                <div className="bg-white">
                                    <SectionHeader title="Contact Info" icon={Mail} />
                                    <DetailRow label="Email Address" value={user.email} icon={Mail} />
                                    <DetailRow label="Phone Number" value={user.phoneNumber} icon={Phone} />
                                    <DetailRow label="Joined Date" value={new Date(user.createdAt).toLocaleDateString()} icon={Calendar} />
                                    <DetailRow label="Last Login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'} icon={Clock} />
                                </div>

                                <div className="bg-white mt-4">
                                    <SectionHeader title="Account Status" icon={Activity} />
                                    <div className="p-4">
                                        <div className={`p-3 border-l-4 ${user.status === 'active' ? 'border-green-500 bg-green-50 text-green-700' :
                                            user.status === 'suspended' ? 'border-red-500 bg-red-50 text-red-700' :
                                                'border-amber-500 bg-amber-50 text-amber-700'
                                            }`}>
                                            <div className="text-xs font-bold uppercase mb-1">Current Status</div>
                                            <div className="text-lg font-mono font-bold">{user.status?.toUpperCase()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Role Specific Details */}
                            <div className="md:w-2/3 bg-white">
                                {user.role === 'therapist' && (
                                    <>
                                        <SectionHeader title="Professional Credentials" icon={Shield} />
                                        <div className="grid grid-cols-1 md:grid-cols-2">
                                            <DetailRow label="License Number" value={user.roleSpecific?.licenseNumber} icon={Hash} />
                                            <DetailRow label="License Type" value={user.roleSpecific?.licenseType} icon={FileText} />
                                            <DetailRow
                                                label="License Verified"
                                                value={
                                                    user.roleSpecific?.licenseVerified ?
                                                        <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Verified</span> :
                                                        <span className="text-zinc-400">Unverified</span>
                                                }
                                                icon={Shield}
                                            />
                                            <DetailRow
                                                label="Experience"
                                                value={user.roleSpecific?.yearsOfExperience ? `${user.roleSpecific.yearsOfExperience} years` : null}
                                                icon={Clock}
                                            />
                                        </div>

                                        <SectionHeader title="Organization" icon={Building2} />
                                        <div className="grid grid-cols-1 md:grid-cols-2">
                                            <DetailRow label="Organization Name" value={user.roleSpecific?.organizationName} icon={Building2} />
                                            <DetailRow label="Department" value={user.roleSpecific?.department} icon={MapPin} />
                                        </div>

                                        <SectionHeader title="Profile Bio" icon={FileText} />
                                        <div className="p-6 border-b border-zinc-100">
                                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">My Bio</div>
                                            <div className="text-sm text-zinc-700 leading-relaxed font-mono bg-zinc-50 p-4 border border-zinc-200">
                                                {user.roleSpecific?.bio || 'No bio provided'}
                                            </div>
                                        </div>

                                        <SectionHeader title="Documents" icon={FileText} />
                                        <div className="p-4 grid grid-cols-1 gap-4">
                                            {user.roleSpecific?.licenseCertificate ? (
                                                <a
                                                    href={user.roleSpecific.licenseCertificate}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-4 p-4 border-2 border-zinc-200 hover:border-black transition-colors group"
                                                >
                                                    <div className="p-3 bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-zinc-900 mb-0.5">License Certificate</div>
                                                        <div className="text-xs text-zinc-500 font-mono">Click to view</div>
                                                    </div>
                                                    <div className="p-2">
                                                        <Download size={20} className="text-zinc-400 group-hover:text-black" />
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="p-8 text-center border-2 border-dashed border-zinc-200 text-zinc-400 text-sm font-mono">
                                                    No documents uploaded
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {user.role === 'caregiver' && (
                                    <>
                                        <SectionHeader title="Caregiver Details" icon={Activity} />
                                        <div className="grid grid-cols-1 md:grid-cols-2">
                                            <DetailRow label="Linked Therapist" value={user.roleSpecific?.linkedTherapistId} icon={User} />
                                            <DetailRow label="Relationship" value={user.roleSpecific?.relationshipToPatient} icon={Activity} />
                                        </div>
                                        <SectionHeader title="Patients Managed" icon={User} />
                                        <div className="p-4">
                                            {user.roleSpecific?.patientIds && user.roleSpecific.patientIds.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {user.roleSpecific.patientIds.map(pid => (
                                                        <span key={pid} className="px-3 py-1.5 bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-600">
                                                            {pid}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-400 text-sm font-mono">No patients linked</span>
                                            )}
                                        </div>
                                    </>
                                )}
                                {user.role === 'patient' && (
                                    <div className="p-12 text-center text-zinc-400 italic">
                                        Patient clinical details are restricted.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer Actions */}
                {actions && (
                    <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-200 shrink-0 flex items-center justify-end gap-3">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfileDetails;
