import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const AdminLogin = () => {
    // Upewnij się, że stany nazywają się 'username' i 'password'
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const apiUrl = `${import.meta.env.VITE_API_URL}/api/login`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // POPRAWKA TUTAJ: Wysyłamy obiekt z kluczem 'password', a nie 'password_hash'
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json(); // Odbieramy odpowiedź z serwera
                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("userRole", data.role);
                localStorage.setItem("authToken", data.token);
                navigate("/panel");
            } else {
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
                        placeholder="superadmin"
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
                        value={password}
                        onChange={e => setPassword(e.target.value)}
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

export default AdminLogin;