import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const AdminLogin = () => {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === "tajneHaslo123") {  // <- tu ZMIENIĆ na własne!
            localStorage.setItem("admin-logged-in", "1");
            navigate("/panel");
        } else {
            setError("Błędne hasło.");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4 text-center">Logowanie do panelu administracyjnego</h2>
                <input
                    type="password"
                    className="w-full mb-4 p-2 border rounded"
                    placeholder="Hasło"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                {error && <div className="text-red-500 mb-4">{error}</div>}
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
