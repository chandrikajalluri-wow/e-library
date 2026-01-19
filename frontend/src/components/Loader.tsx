import React from 'react';
import '../styles/Loader.css';

interface LoaderProps {
    small?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ small }) => {
    if (small) {
        return <div className="spinner spinner-small"></div>;
    }
    return (
        <div className="loader-container">
            <div className="spinner"></div>
        </div>
    );
};

export default Loader;
