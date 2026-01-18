import React from 'react';
import { User, Bell, Shield, Database, Save, Fingerprint } from 'lucide-react';

export default function SettingsScreen() {
  return (
    <div className="p-8 max-w-4xl mx-auto font-mono">
      <div className="mb-8 border-b-2 border-zinc-900 pb-6">
        <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Settings</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">SYSTEM CONFIGURATION & PREFERENCES</p>
      </div>

      <div className="bg-white border-2 border-zinc-200">
        <Section icon={<User size={18} />} title="Profile Identity" desc="MANAGE ACCOUNT CREDENTIALS">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Display Name</label>
              <input type="text" className="w-full border-2 border-zinc-200 p-2 text-xs font-bold text-zinc-900 focus:border-zinc-900 focus:outline-none bg-zinc-50" defaultValue="Dr. Sarah Williams" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email Address</label>
              <input type="email" className="w-full border-2 border-zinc-200 p-2 text-xs font-bold text-zinc-500 bg-zinc-100 cursor-not-allowed" defaultValue="dr.sarah@neurocare.com" disabled />
            </div>
          </div>
        </Section>

        <div className="border-t-2 border-zinc-100"></div>

        <Section icon={<Bell size={18} />} title="Notifications" desc="ALERT PREFERENCES">
          <label className="flex items-center justify-between py-2 cursor-pointer group">
            <span className="text-sm font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors">EMAIL ON NEW ANALYSIS</span>
            <input type="checkbox" defaultChecked className="hidden peer" />
            <div className="w-10 h-5 bg-zinc-200 peer-checked:bg-zinc-900 relative transition-colors border border-zinc-300 peer-checked:border-zinc-900">
              <div className="absolute left-0.5 top-0.5 w-3.5 h-3.5 bg-white transition-transform peer-checked:translate-x-5 border border-zinc-400 peer-checked:border-zinc-900 shadow-sm"></div>
            </div>
          </label>
        </Section>

        <div className="border-t-2 border-zinc-100"></div>

        <Section icon={<Shield size={18} />} title="Security Protocols" desc="2FA & PASSWORD ENCRYPTION">
          <div className="flex gap-4">
            <button className="text-xs font-black uppercase tracking-widest text-zinc-900 border-b-2 border-zinc-900 hover:bg-zinc-100 transition-colors py-1">Change Password</button>
            <button className="text-xs font-black uppercase tracking-widest text-zinc-500 border-b-2 border-transparent hover:text-zinc-900 hover:border-zinc-300 transition-all py-1">Configure 2FA</button>
          </div>
        </Section>

        <div className="p-6 bg-zinc-50 border-t-2 border-zinc-200 flex justify-end">
          <button className="bg-zinc-900 text-white px-8 py-3 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1">
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

const Section = ({ icon, title, desc, children }: any) => (
  <div className="p-8 hover:bg-zinc-50/50 transition-colors">
    <div className="flex gap-4 mb-6">
      <div className="p-3 bg-zinc-100 text-zinc-900 h-fit border-2 border-zinc-200 shadow-sm">{icon}</div>
      <div>
        <h3 className="font-black text-lg text-zinc-900 uppercase tracking-tight">{title}</h3>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{desc}</p>
      </div>
    </div>
    <div className="pl-16">{children}</div>
  </div>
);
