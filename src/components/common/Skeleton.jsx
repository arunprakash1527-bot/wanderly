import React from 'react';
import { T } from '../../styles/tokens';

// Pulsing skeleton placeholder
const pulse = {
  animation: 'skeletonPulse 1.5s ease-in-out infinite',
};

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return <div style={{ width, height, borderRadius: 6, background: T.s3, ...pulse, ...style }} />;
}

export function SkeletonCircle({ size = 40, style = {} }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: T.s3, ...pulse, ...style }} />;
}

export function SkeletonCard({ style = {} }) {
  return (
    <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}`, ...style }}>
      <SkeletonLine width="60%" height={16} style={{ marginBottom: 10 }} />
      <SkeletonLine width="90%" style={{ marginBottom: 8 }} />
      <SkeletonLine width="75%" style={{ marginBottom: 8 }} />
      <SkeletonLine width="40%" />
    </div>
  );
}

// Trip card skeleton for home screen
export function TripCardSkeleton() {
  return (
    <div style={{ padding: 20, borderRadius: 16, background: T.s, border: `1px solid ${T.border}`, marginBottom: 12 }}>
      <SkeletonLine width="50%" height={20} style={{ marginBottom: 12 }} />
      <SkeletonLine width="70%" height={12} style={{ marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <SkeletonLine width={60} height={24} style={{ borderRadius: 12 }} />
        <SkeletonLine width={80} height={24} style={{ borderRadius: 12 }} />
        <SkeletonLine width={50} height={24} style={{ borderRadius: 12 }} />
      </div>
    </div>
  );
}

// Timeline item skeleton for itinerary
export function TimelineItemSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <SkeletonCircle size={10} />
        <div style={{ width: 2, height: 40, background: T.s3, ...pulse }} />
      </div>
      <div style={{ flex: 1 }}>
        <SkeletonLine width={50} height={10} style={{ marginBottom: 6 }} />
        <SkeletonLine width="80%" height={14} style={{ marginBottom: 6 }} />
        <SkeletonLine width="60%" height={11} />
      </div>
    </div>
  );
}
