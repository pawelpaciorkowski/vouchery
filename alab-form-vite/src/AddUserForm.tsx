/* eslint-disable @typescript-eslint/no-explicit-any */
// Plik: src/AddUserForm.tsx
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
            // 1. Pobieramy token z localStorage
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error("Brak tokenu autoryzacyjnego. Zaloguj się ponownie.");
            }

            const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users`;

            // 2. Wysyłamy zapytanie z poprawnymi nagłówkami
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Dołączamy token do nagłówka 'Authorization'
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
        <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-bold mb-4">Dodaj nowego administratora</h3>
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-start">
                <input
                    type="text"
                    placeholder="Nazwa użytkownika"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="p-2 border rounded w-full md:w-auto"
                    required
                />
                <input
                    type="password"
                    placeholder="Hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-2 border rounded w-full md:w-auto"
                    required
                />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full md:w-auto">
                    Dodaj użytkownika
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