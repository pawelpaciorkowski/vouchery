import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const AdminLogin = () => {
    const [username, setUsername] = useState("");
    const [password_hash, setPassword_hash] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/login`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password_hash }),
            });

            if (response.ok) {
                // Logowanie udane
                localStorage.setItem("isLoggedIn", "true"); // Używamy tego samego klucza co w AdminPanel
                navigate("/panel");
            } else {
                // Logowanie nieudane
                const data = await response.json();
                setError(data.message || 'Błędne dane logowania.');
            }
        } catch (err) {
            setError('Nie można połączyć się z serwerem.');
            console.error(err);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">Logowanie do panelu</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa użytkownika</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="login"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
                    <input
                        type="password"
                        className="w-full p-2 border rounded"
                        placeholder="Hasło"
                        value={password_hash}
                        onChange={e => setPassword_hash(e.target.value)}
                        required
                    />
                </div>

                {error && <div className="text-red-500 mb-4 text-center">{error}</div>}

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700"
                >
                    Zaloguj
                </button>
            </form>
        </div>
    );
};