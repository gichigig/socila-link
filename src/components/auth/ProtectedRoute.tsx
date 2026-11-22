'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { SociLinkLogo } from '../ui/SociLinkLogo';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex flex-col items-center gap-3">
          <SociLinkLogo size="md" showText={false} />
          <span className="text-xs text-gray-500 font-mono tracking-widest uppercase animate-pulse">
            Verifying Authentication...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

