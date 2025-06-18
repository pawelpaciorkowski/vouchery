/* eslint-disable @typescript-eslint/no-explicit-any */
// w pliku: alab-form-vite/src/AdminPanel.tsx
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import CryptoJS from 'crypto-js';

// Definicja typów (można przenieść do osobnego pliku)
interface FormData {
    id: number;
    name: string;
    surname: string;
    pesel: string;
    [key: string]: any;
}

export const AdminPanel = () => {
    // PRZENIESIONE DO ŚRODKA KOMPONENTU
    const DECRYPTION_KEY = import.meta.env.VITE_DECRYPTION_KEY;

    const [forms, setForms] = useState<FormData[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const loggedIn = localStorage.getItem("isLoggedIn") === "true";
        setIsLoggedIn(loggedIn);
    }, []);

    useEffect(() => {
        if (!isLoggedIn) return;

        // Sprawdzamy klucz dopiero, gdy jest potrzebny
        if (!DECRYPTION_KEY) {
            console.error("Klucz VITE_DECRYPTION_KEY nie został ustawiony w pliku .env frontendu!");
            return;
        }

        const fetchAndDecryptForms = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/forms`);
                if (!response.ok) throw new Error('Błąd pobierania danych');

                const encryptedForms = await response.json();

                const decryptedForms = encryptedForms.map((form: any) => {
                    const bytes = CryptoJS.AES.decrypt(form.encrypted_data, DECRYPTION_KEY);
                    const decryptedDataString = bytes.toString(CryptoJS.enc.Utf8);
                    const decryptedAdditionalData = JSON.parse(decryptedDataString);

                    return {
                        id: form.id,
                        name: form.name,
                        surname: form.surname,
                        pesel: form.pesel,
                        createdAt: form.created_at,
                        ...decryptedAdditionalData,
                    };
                });

                setForms(decryptedForms);

            } catch (error) {
                console.error("Nie udało się pobrać lub rozszyfrować formularzy:", error);
            }
        };

        fetchAndDecryptForms();
    }, [isLoggedIn, DECRYPTION_KEY]); // Dodano DECRYPTION_KEY do tablicy zależności

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(forms);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Zgłoszenia');
        XLSX.writeFile(workbook, 'dane_zgloszeniowe.xlsx');
    };

    const filteredForms = forms.filter(form =>
        (form.name && form.name.toLowerCase().includes(filter.toLowerCase())) ||
        (form.surname && form.surname.toLowerCase().includes(filter.toLowerCase())) ||
        (form.pesel && form.pesel.includes(filter))
    );

    if (!isLoggedIn) {
        // Zamiast AdminLogin, który nie jest zdefiniowany, prosta wiadomość
        return <div className="text-center p-8">Proszę się zalogować, aby uzyskać dostęp. Przejdź do <a href="/login" className="text-blue-600">strony logowania</a>.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Panel Administratora</h2>
            <div className="mb-4 flex gap-4">
                <input
                    type="text"
                    placeholder="Filtruj po imieniu, nazwisku, PESEL..."
                    className="p-2 border rounded w-full"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                <button onClick={exportToExcel} className="bg-green-500 text-white p-2 rounded whitespace-nowrap">
                    Eksportuj do Excel
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border">ID</th>
                            <th className="py-2 px-4 border">Imię</th>
                            <th className="py-2 px-4 border">Nazwisko</th>
                            <th className="py-2 px-4 border">PESEL</th>
                            <th className="py-2 px-4 border">Email</th>
                            <th className="py-2 px-4 border">Telefon</th>
                            <th className="py-2 px-4 border">Data Zgłoszenia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredForms.map(form => (
                            <tr key={form.id}>
                                <td className="py-2 px-4 border">{form.id}</td>
                                <td className="py-2 px-4 border">{form.name}</td>
                                <td className="py-2 px-4 border">{form.surname}</td>
                                <td className="py-2 px-4 border">{form.pesel}</td>
                                <td className="py-2 px-4 border">{form.email}</td>
                                <td className="py-2 px-4 border">{form.phone}</td>
                                <td className="py-2 px-4 border">{new Date(form.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};