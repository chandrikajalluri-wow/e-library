import React from 'react';
import '../styles/Loader.css';

interface LoaderProps {
    small?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ small }) => {
    return (
        <div className={small ? 'spinner-small' : 'loader-container'}>
            <div className={small ? 'spinner spinner-small' : 'spinner'}></div>
        </div>
    );
};

export default Loader;
