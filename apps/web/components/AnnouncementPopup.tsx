'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { announcementsApi, type ActiveAnnouncement } from '@/lib/api';
import { useAuth } from '@/hooks/useCloudBaseAuth';
import { renderMarkdown } from '@/lib/markdown';

const DISMISSED_KEY = 'task_announcement_dismissed';

export default function AnnouncementPopup() {
  const { isSignedIn } = useAuth();
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const [visible, setVisible] = useState(false);

  // Get user's plan from workspace/store
  const getPlan = useCallback((): string => {
    if (typeof window === 'undefined') return 'free';
    try {
      const raw = localStorage.getItem('task-manager-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.state?.currentWorkspacePlan || 'free';
      }
    } catch {}
    return 'free';
  }, []);

  const checkAnnouncements = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const plan = getPlan();
      const active = await announcementsApi.getActive(plan);
      if (active.length > 0) {
        // Check local dismissals
        const dismissedIds = getDismissedIds();
        const undismissed = active.filter((a) => !dismissedIds.includes(a.id));
        if (undismissed.length > 0) {
          setAnnouncement(undismissed[0]); // show highest priority first
          setVisible(true);
        }
      }
    } catch {
      // Not logged in or server unavailable, skip
    }
  }, [isSignedIn, getPlan]);

  useEffect(() => {
    // delay a bit to let auth settle
    const timer = setTimeout(checkAnnouncements, 1500);
    return () => clearTimeout(timer);
  }, [checkAnnouncements]);

  const handleDismiss = async () => {
    if (!announcement) return;
    setVisible(false);
    if (announcement.dismissible) {
      // Save to localStorage
      addDismissedId(announcement.id);
      // Also tell server
      try {
        await announcementsApi.dismiss(announcement.id);
      } catch {}
    }
    setTimeout(() => setAnnouncement(null), 300);
  };

  if (!announcement || !visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={announcement.dismissible ? handleDismiss : undefined}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        {announcement.imageUrl && (
          <img
            src={announcement.imageUrl}
            alt=""
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '200px',
              objectFit: 'cover',
              borderRadius: '16px 16px 0 0',
            }}
          />
        )}

        {/* Dismiss button */}
        {announcement.dismissible && (
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(20px)',
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--foreground)',
              lineHeight: 1.4,
            }}
          >
            {announcement.title}
          </h2>
          <div
            style={{
              color: 'var(--foreground)',
              opacity: 0.85,
              lineHeight: 1.7,
              fontSize: '0.92rem',
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(announcement.content) }}
          />

          {/* Footer */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            {announcement.dismissible && (
              <button
                onClick={handleDismiss}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                知道了
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addDismissedId(id: string) {
  if (typeof window === 'undefined') return;
  const ids = getDismissedIds();
  ids.push(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-50))); // keep last 50
}
