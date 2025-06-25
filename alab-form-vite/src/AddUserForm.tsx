// Plik: src/AddUserForm.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';

export const AddUserForm = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error("Brak tokenu autoryzacyjnego. Zaloguj się ponownie.");
            }

            const apiUrl = `${import.meta.env.VITE_API_URL}/api/users`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setIsError(true);
                throw new Error(data.message || 'Nie udało się dodać użytkownika.');
            }

            setMessage(data.message);
            setUsername('');
            setPassword('');

        } catch (error: any) {
            setMessage(error.message);
            setIsError(true);
        }
    };

    return (
        // Usunęliśmy zewnętrzny div z obramowaniem, ponieważ karta w AdminPanel już go zapewnia.
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Dodaj nowego administratora</h3>
            {/* Zmieniamy układ na wertykalny i dodajemy etykiety */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="new-username" className="block text-sm font-medium text-gray-700 mb-1">
                        Nazwa użytkownika
                    </label>
                    <input
                        id="new-username"
                        type="text"
                        placeholder="Nazwa nowego admina"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        // Ujednolicone, nowocześniejsze style dla inputa
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                        Hasło
                    </label>
                    <input
                        id="new-password"
                        type="password"
                        placeholder="Hasło dla nowego admina"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        // Ujednolicone, nowocześniejsze style dla inputa
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    // Ujednolicone, nowocześniejsze style dla przycisku
                    className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Utwórz użytkownika
                </button>
            </form>
            {message && (
                <p className={`mt-4 text-sm ${isError ? 'text-red-500' : 'text-green-500'}`}>
                    {message}
                </p>
            )}
        </div>
    );
};