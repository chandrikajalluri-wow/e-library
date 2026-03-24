import React from 'react';
import { Zap, Flame, BookOpen, Award, MessageSquare } from 'lucide-react';
import './BadgeIcon.css';

interface BadgeIconProps {
  type: string;
  name: string;
  description: string;
  awardedAt?: string;
}

const badgeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  STREAK_7: { icon: <Zap size={20} />, color: '#fbbf24' }, // Yellow-400
  STREAK_30: { icon: <Flame size={20} />, color: '#ef4444' }, // Red-500
  READER_LITE: { icon: <BookOpen size={20} />, color: '#3b82f6' }, // Blue-500
  READER_PRO: { icon: <Award size={20} />, color: '#8b5cf6' }, // Purple-500
  CRITIC: { icon: <MessageSquare size={20} />, color: '#10b981' }, // Green-500
};

const BadgeIcon: React.FC<BadgeIconProps> = ({ type, name, description, awardedAt }) => {
  const config = badgeConfig[type] || { icon: <Award size={20} />, color: '#6b7280' };

  return (
    <div className="badge-icon-container" title={`${name}: ${description}${awardedAt ? ` (Earned: ${new Date(awardedAt).toLocaleDateString()})` : ''}`}>
      <div className="badge-icon-hex" style={{ backgroundColor: config.color }}>
        {config.icon}
      </div>
      <span className="badge-name-tooltip">{name}</span>
    </div>
  );
};

export default BadgeIcon;
