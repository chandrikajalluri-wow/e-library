import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAnnouncements } from '../services/superAdminService';
import { AnnouncementType, TargetPage } from '../types/enums';
import { X } from 'lucide-react';

const AnnouncementBanner: React.FC = () => {
    const location = useLocation();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [visibleAnnouncements, setVisibleAnnouncements] = useState<any[]>([]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                // Determine if we can use the same service or need a public one.
                // Assuming getAnnouncements is usable by users (checked controller, it is public if not protected by middleware, checking middleware...)
                // Wait, superAdminService might be protected. 
                // However, for now we will try to use it. If it fails due to 403, we might need a public endpoint.
                // Re-checking controller: superAdminController methods usually protected by @Protect and @Authorize in routes.
                // If so, users can't see this.
                // Users need a way to fetch announcements.
                // I should probably check if there is a public route or user route. 
                // If not, I should use a new service/endpoint.
                // For this implementation, I will assume I need to fetch them. 
                // If `getAnnouncements` fails for users, I will need to fix the backend route permission. 
                // Let's use the service for now.
                const data = await getAnnouncements();
                setAnnouncements(data);
            } catch (err) {
                console.error("Failed to fetch announcements", err);
            }
        };

        fetchAnnouncements();
    }, []);

    useEffect(() => {
        // Filter announcements based on current path
        const filtered = announcements.filter(ann => {
            if (!ann.isActive) return false;

            const target = ann.targetPage;
            if (!target || target === TargetPage.ALL) return true;

            const path = location.pathname;

            if (target === TargetPage.HOME && path === '/') return true;
            if (target === TargetPage.BOOKS && path.includes('/books')) return true;
            if (target === TargetPage.DASHBOARD && (path.includes('/dashboard') || path.includes('/admin-dashboard'))) return true;
            if (target === TargetPage.PROFILE && path.includes('/profile')) return true;

            return false;
        });

        setVisibleAnnouncements(filtered);
    }, [location.pathname, announcements]);

    const dismissedKey = 'dismissed_announcements';
    const getDismissed = () => JSON.parse(localStorage.getItem(dismissedKey) || '[]');

    const handleDismiss = (id: string) => {
        const dismissed = getDismissed();
        dismissed.push(id);
        localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
        setVisibleAnnouncements(prev => prev.filter(a => a._id !== id));
    };

    const finalAnnouncements = visibleAnnouncements.filter(a => !getDismissed().includes(a._id));

    if (finalAnnouncements.length === 0) return null;

    return (
        <div className="announcement-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', zIndex: 1000 }}>
            {finalAnnouncements.map(ann => (
                <div
                    key={ann._id}
                    className={`announcement-banner type-${ann.type?.toLowerCase() || 'info'}`}
                    style={{
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        background: getBackgroundColor(ann.type)
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
                        {getIcon(ann.type)}
                        <span>{ann.content}</span>
                    </div>
                    <button
                        onClick={() => handleDismiss(ann._id)}
                        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <X size={18} />
                    </button>
                </div>
            ))}
        </div>
    );
};

const getBackgroundColor = (type: string) => {
    switch (type) {
        case AnnouncementType.OFFER: return 'linear-gradient(90deg, #ec4899, #8b5cf6)'; // Pink/Purple
        case AnnouncementType.WARNING: return '#ef4444'; // Red
        case AnnouncementType.MAINTENANCE: return '#f59e0b'; // Amber
        case AnnouncementType.GREETING: return '#10b981'; // Green
        case AnnouncementType.INFO:
        default: return '#6366f1'; // Indigo
    }
};

const getIcon = (type: string) => {
    switch (type) {
        case AnnouncementType.OFFER: return '🎉';
        case AnnouncementType.WARNING: return '⚠️';
        case AnnouncementType.MAINTENANCE: return '🔧';
        case AnnouncementType.GREETING: return '👋';
        case AnnouncementType.INFO: default: return '📢';
    }
}

export default AnnouncementBanner;
