// Plik: src/UserList.tsx

import React from 'react';
import { type User } from './AdminPanel'; // Importujemy typ z AdminPanel

// Definiujemy typ propsów - komponent oczekuje listy i funkcji zwrotnej
type UserListProps = {
    users: User[];
    onUserDeleted: () => void;
};

export const UserList: React.FC<UserListProps> = ({ users, onUserDeleted }) => {

    const handleDelete = async (userId: number, username: string) => {
        if (!window.confirm(`Czy na pewno chcesz usunąć użytkownika "${username}"?`)) {
            return;
        }
        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error("Brak tokenu autoryzacyjnego.");

            const apiUrl = `${import.meta.env.VITE_API_URL}/api/users/${userId}`;
            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Nie udało się usunąć użytkownika.');
            }

            alert('Użytkownik usunięty pomyślnie.');

            // KLUCZOWY MOMENT: Wywołujemy funkcję od rodzica, aby odświeżyć listę
            onUserDeleted();

        } catch (err: any) {
            alert(`Błąd: ${err.message}`);
            console.error(err);
        }
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Lista administratorów</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="border px-2 py-2 font-semibold text-left">ID</th>
                            <th className="border px-2 py-2 font-semibold text-left">Nazwa</th>
                            <th className="border px-2 py-2 font-semibold text-left">Rola</th>
                            <th className="border px-2 py-2 font-semibold text-left">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="border px-2 py-1">{user.id}</td>
                                <td className="border px-2 py-1">{user.username}</td>
                                <td className="border px-2 py-1">{user.role}</td>
                                <td className="border px-2 py-1">
                                    <button
                                        onClick={() => handleDelete(user.id, user.username)}
                                        className="text-red-600 hover:text-red-800 text-xs font-semibold"
                                        // Wyłącz przycisk dla samego siebie lub dla ID=1
                                        disabled={user.id === parseInt(localStorage.getItem('userId') || '0', 10) || user.id === 1}
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