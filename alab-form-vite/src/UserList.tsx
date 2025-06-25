/* eslint-disable @typescript-eslint/no-explicit-any */
// Plik: src/UserList.tsx - WERSJA POPRAWIONA Z DOŁĄCZANIEM TOKENU

import { useState, useEffect } from 'react';

// Typ dla pojedynczego użytkownika
interface User {
    id: number;
    username: string;
    role: string;
}

export const UserList = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // 1. Pobieramy token z localStorage
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error("Brak tokenu autoryzacyjnego. Zaloguj się ponownie.");
                }

                const apiUrl = `${import.meta.env.VITE_API_URL}/api/users`;

                // 2. Wysyłamy zapytanie Z NAGŁÓWKIEM autoryzacyjnym
                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Nie udało się pobrać listy użytkowników (brak uprawnień).');
                }

                const data = await response.json();
                setUsers(data);
            } catch (err: any) {
                setError(err.message);
            }
        };

        fetchUsers();
    }, []);

    // Funkcja do usuwania użytkownika, która również musi wysyłać token
    const handleDelete = async (userId: number, username: string) => {
        if (!window.confirm(`Czy na pewno chcesz usunąć użytkownika "${username}"?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error("Brak tokenu autoryzacyjnego.");
            }

            const apiUrl = `${import.meta.env.VITE_API_URL}/api/users/${userId}`;
            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Nie udało się usunąć użytkownika.');
            }

            setUsers(currentUsers => currentUsers.filter(user => user.id !== userId));
            alert('Użytkownik usunięty pomyślnie.');

        } catch (err: any) {
            alert(`Błąd: ${err.message}`);
        }
    };

    if (error) {
        return <div className="mt-4 text-red-500">Błąd: {error}</div>;
    }

    return (
        <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-bold mb-4">Istniejący użytkownicy</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border px-2 py-2 text-left">ID</th>
                            <th className="border px-2 py-2 text-left">Nazwa użytkownika</th>
                            <th className="border px-2 py-2 text-left">Rola</th>
                            <th className="border px-2 py-2 text-left">Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="border px-2 py-1">{user.id}</td>
                                <td className="border px-2 py-1">{user.username}</td>
                                <td className="border px-2 py-1">{user.role}</td>
                                <td className="border px-2 py-1">
                                    <button
                                        onClick={() => handleDelete(user.id, user.username)}
                                        className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                                        disabled={user.role === 'superadmin'}
                                    >
                                        Usuń
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};