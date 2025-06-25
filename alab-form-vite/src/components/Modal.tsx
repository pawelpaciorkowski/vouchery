// Plik: src/components/Modal.tsx

import React from 'react';

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        // Tło modala (przyciemnienie)
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center"
            onClick={onClose} // Zamykanie po kliknięciu w tło
        >
            {/* Kontener modala */}
            <div
                className="bg-white rounded-xl shadow-2xl m-4 w-full max-w-5xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()} // Zapobiega zamykaniu po kliknięciu w modal
            >
                {/* Nagłówek modala */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                        aria-label="Zamknij"
                    >
                        &times;
                    </button>
                </div>

                {/* Zawartość modala (z przewijaniem) */}
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};