import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface StatusDropdownProps {
    currentStatus: string;
    onStatusChange: (status: string) => void;
    isLoading?: boolean;
}

const statuses = [
    { value: 'pending', label: 'Pending', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'processing', label: 'Processing', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'shipped', label: 'Shipped', color: 'text-blue-600 bg-blue-50' },
    { value: 'delivered', label: 'Delivered', color: 'text-green-600 bg-green-50' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-red-600 bg-red-50' },
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => !isLoading && setIsOpen(!isOpen)}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${currentStatusObj.color} border-current border-opacity-20 hover:brightness-95 disabled:opacity-50`}
            >
                <span className="font-medium capitalize">{currentStatusObj.label}</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                    {statuses.map((status) => (
                        <button
                            key={status.value}
                            onClick={() => {
                                onStatusChange(status.value);
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <span className={`text-sm font-medium ${status.value === currentStatus ? status.color.replace('bg-', 'text-') : 'text-gray-700'}`}>
                                {status.label}
                            </span>
                            {status.value === currentStatus && <Check size={14} className="text-gray-900" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StatusDropdown;
