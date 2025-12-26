import React from 'react';
import { User, Bell, Shield, Database, Save } from 'lucide-react';

export default function SettingsScreen() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
        <Section icon={<User />} title="Profile" desc="Manage your account info">
           <div className="grid grid-cols-2 gap-4">
             <input type="text" className="border p-2 rounded text-sm" defaultValue="Dr. Sarah Williams" />
             <input type="email" className="border p-2 rounded text-sm" defaultValue="dr.sarah@neurocare.com" disabled />
           </div>
        </Section>
        
        <Section icon={<Bell />} title="Notifications" desc="Email and push alerts">
           <label className="flex items-center justify-between text-sm py-2">
             <span>Email on new analysis</span>
             <input type="checkbox" defaultChecked />
           </label>
        </Section>
        
        <Section icon={<Shield />} title="Security" desc="2FA and Password">
           <button className="text-blue-600 text-sm font-medium hover:underline">Change Password</button>
           <button className="text-blue-600 text-sm font-medium hover:underline block mt-2">Configure 2FA</button>
        </Section>
        
        <div className="p-6 bg-slate-50 flex justify-end">
           <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700">
             <Save size={16} /> Save Changes
           </button>
        </div>
      </div>
    </div>
  );
}

const Section = ({ icon, title, desc, children }: any) => (
  <div className="p-6">
    <div className="flex gap-4 mb-4">
      <div className="p-2 bg-slate-100 rounded text-slate-600 h-fit">{icon}</div>
      <div>
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
    </div>
    <div className="pl-12">{children}</div>
  </div>
);