import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface StatusDropdownProps {
    currentStatus: string;
    onStatusChange: (status: string) => void;
    isLoading?: boolean;
}

const statuses = [
    { value: 'pending', label: 'Pending', icon: 'pending' },
    { value: 'processing', label: 'Processing', icon: 'processing' },
    { value: 'shipped', label: 'Shipped', icon: 'shipped' },
    { value: 'delivered', label: 'Delivered', icon: 'delivered' },
    { value: 'return_requested', label: 'Return Req.', icon: 'return_requested' },
    { value: 'returned', label: 'Returned', icon: 'returned' },
    { value: 'return_rejected', label: 'Return Rej.', icon: 'return_rejected' },
    { value: 'cancelled', label: 'Cancelled', icon: 'cancelled' },
];

const StatusDropdown: React.FC<StatusDropdownProps> = ({ currentStatus, onStatusChange, isLoading }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentStatusObj = statuses.find(s => s.value === currentStatus) || statuses[0];
    const isCancelled = currentStatus === 'cancelled';

    return (
        <div className="premium-status-dropdown" ref={dropdownRef}>
            <button
                onClick={() => !isLoading && !isCancelled && setIsOpen(!isOpen)}
                disabled={isLoading || isCancelled}
                className={`status-trigger ${currentStatus} ${isOpen ? 'active' : ''} ${isCancelled ? 'locked' : ''}`}
            >
                <div className="status-indicator"></div>
                <span className="status-label">{currentStatusObj.label}</span>
                {!isCancelled && <ChevronDown size={14} className={`arrow-icon ${isOpen ? 'rotate' : ''}`} />}
            </button>

            {isOpen && (
                <div className="status-menu">
                    <div className="menu-header">Update Status</div>
                    {statuses.map((status) => (
                        <button
                            key={status.value}
                            onClick={() => {
                                onStatusChange(status.value);
                                setIsOpen(false);
                            }}
                            className={`status-option ${status.value === currentStatus ? 'current' : ''} ${status.value}`}
                        >
                            <div className="option-dot"></div>
                            <span className="option-label">{status.label}</span>
                            {status.value === currentStatus && <Check size={14} className="check-icon" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StatusDropdown;
