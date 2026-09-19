"use client";

import React, { useState } from "react";
import { useApp, DEMO_USERS } from "@/context/AppContext";
import { UserRole } from "@/types";
import { Lock, User, Shield, AlertCircle, X, Check } from "lucide-react";

export function LoginModal() {
  const { isLoginModalOpen, setIsLoginModalOpen, login, currentUser } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role || "Regular User");
  const [userId, setUserId] = useState("vikram.bora@aswc.gov.in");
  const [password, setPassword] = useState("••••••••••••");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    const demoUser = DEMO_USERS[role];
    setUserId(demoUser.email);
    setPassword("••••••••••••");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      login(selectedRole);
      setIsSubmitting(false);
      setIsLoginModalOpen(false);
    }, 600);
  };

  const roleList: UserRole[] = [
    "Regular User",
    "Field Officer",
    "Administrator",
    "Emergency Commander",
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={() => setIsLoginModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            NER LOGISTICS INTELLIGENCE
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Regional Operations Access Gateway
          </p>
        </div>

        {/* Demo Role Selector Tabs */}
        <div className="mb-6 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
            Select Demo Account Profile:
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {roleList.map((role) => {
              const isSelected = selectedRole === role;
              return (
                <button
                  type="button"
                  key={role}
                  onClick={() => handleSelectRole(role)}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left transition-colors flex items-center justify-between ${
                    isSelected
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{role}</span>
                  {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              User ID
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                placeholder="official.email@gov.in"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                placeholder="••••••••••••"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-900/40 mt-2"
          >
            {isSubmitting ? "Authenticating Session..." : "SIGN IN"}
          </button>
        </form>

        {/* Realistic Disclaimer & Privacy Note */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            &ldquo;Authorized platform users only&rdquo;
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Access to North Eastern interstate logistics and telemetry is subject to Indian Information Technology Act provisions.
          </p>
        </div>
      </div>
    </div>
  );
}
