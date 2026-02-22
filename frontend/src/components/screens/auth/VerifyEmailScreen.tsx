import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useVerifyEmail } from '../../../api/auth';
import { useNavigate, useSearch } from '@tanstack/react-router';

export default function VerifyEmailScreen() {
    const navigate = useNavigate();
    const search = useSearch({ from: '/verify-email' }) as { token?: string };
    const token = search.token;
    
    const verifyEmail = useVerifyEmail();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Verification token is missing.');
            return;
        }

        const handleVerify = async () => {
            try {
                const result = await verifyEmail.mutateAsync(token);
                if (result.success) {
                    setStatus('success');
                    setMessage(result.message);
                } else {
                    setStatus('error');
                    setMessage(result.message || 'Verification failed.');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'An error occurred during verification.');
            }

        };

        handleVerify();
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono">
            <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                        status === 'loading' ? 'bg-zinc-100 text-zinc-400' :
                        status === 'success' ? 'bg-emerald-50 text-emerald-500' :
                        'bg-red-50 text-red-500'
                    }`}>
                        {status === 'loading' && <Loader2 className="w-8 h-8 animate-spin" />}
                        {status === 'success' && <CheckCircle2 className="w-8 h-8" />}
                        {status === 'error' && <XCircle className="w-8 h-8" />}
                    </div>

                    <h1 className="text-xl font-bold text-zinc-900 mb-2">
                        {status === 'loading' && 'Verifying Your Email'}
                        {status === 'success' && 'Email Verified!'}
                        {status === 'error' && 'Verification Failed'}
                    </h1>

                    <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                        {status === 'loading' && 'Please wait while we secure your account...'}
                        {message}
                    </p>

                    {(status === 'success' || status === 'error') && (
                        <button
                            onClick={() => navigate({ to: '/login' })}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all group"
                        >
                            Back to Login
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-zinc-400 text-xs">
                <Mail className="w-3 h-3" />
                <span>ASD Therapy Platform Security</span>
            </div>
        </div>
    );
}
