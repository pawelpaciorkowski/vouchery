/* eslint-disable @typescript-eslint/no-unused-vars */
// Plik: src/AdminPanel.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import * as XLSX from 'xlsx';

import { AddUserForm } from './AddUserForm';
import { UserList } from './UserList';
import { type FormData } from './types';
import { DashboardActions } from './components/DashboardActions';
import { SubmissionsTable } from './components/SubmissionsTable';
import { Modal } from './components/Modal';

// Definicja typu dla użytkownika - może być w types.ts, ale dla prostoty jest tutaj
export interface User {
    id: number;
    username: string;
    role: string;
}

// Funkcje pomocnicze (getBirthDateFromPesel, transformDataForExport) pozostają bez zmian
function getBirthDateFromPesel(pesel: string | undefined): Date | null {
    if (!pesel || !/^\d{11}$/.test(pesel)) return null;
    let year = parseInt(pesel.substring(0, 2), 10);
    let month = parseInt(pesel.substring(2, 4), 10);
    const day = parseInt(pesel.substring(4, 6), 10);
    if (month > 80) { year += 1800; month -= 80; }
    else if (month > 60) { year += 2200; month -= 60; }
    else if (month > 40) { year += 2100; month -= 40; }
    else if (month > 20) { year += 2000; month -= 20; }
    else { year += 1900; }
    return new Date(year, month - 1, day);
}

const transformDataForExport = (data: FormData[], mode: 'export' | 'preview') => {
    const getGenderAbbreviation = (gender: string | undefined): 'K' | 'M' | '' => {
        if (!gender) return '';
        const lowerGender = gender.toLowerCase();
        if (lowerGender === 'kobieta') return 'K';
        if (lowerGender === 'mezczyzna' || lowerGender === 'm') return 'M';
        return '';
    };
    return data.map(form => {
        const formatDate = (date: Date | string | undefined) => {
            if (!date) return "";
            const d = new Date(date);
            if (mode === 'export') return d;
            return d.toLocaleDateString('pl-PL');
        };

        const record: Record<string, any> = {
            "Imię pracownika": form.name, "Nazwisko pracownika": form.surname, "Płeć pracownika": getGenderAbbreviation(form.gender),
            "PESEL pracownika": form.pesel, "Email": form.email, "Nr telefonu": form.phone,
            "Ulica": form.street, "Numer domu": form.houseNumber, "Numer mieszkania": form.flatNumber || "", "Kod-pocztowy": form.zip,
            "Poczta": form.postOffice, "Miasto": form.city, "Województwo": form.region, "Kraj": form.country,
            "Typ dokumentu pracownika": "", "Nr dokumentu pracownika": "", "Kraj wydający dokument pracownika": "",
            "Imię członka rodziny": "", "Nazwisko członka rodziny": "", "Płeć członka rodziny": "", "PESEL członka rodziny": "", "Data urodzenia członka rodziny": "",
            "Typ dokumentu członka rodziny": "", "Nr dokumentu członka rodziny": "", "Kraj wydający dokument członka rodziny": "",
            "Data zgłoszenia": formatDate(form.createdAt),
        };
        if (form.submissionType === 'family') {
            record["Imię członka rodziny"] = form.familyName; record["Nazwisko członka rodziny"] = form.familySurname;
            record["Płeć członka rodziny"] = getGenderAbbreviation(form.familyGender);
            if (form.familyIdentityMethod === 'pesel') {
                record["PESEL członka rodziny"] = form.familyPesel;
                const birthDate = getBirthDateFromPesel(form.familyPesel);
                record["Data urodzenia członka rodziny"] = birthDate ? formatDate(birthDate) : "";
            } else {
                record["Data urodzenia członka rodziny"] = formatDate(form.familyBirthDate);
                record["Typ dokumentu członka rodziny"] = form.familyDocumentType === 'dowod' ? 'Dowód osobisty' : 'Paszport';
                record["Nr dokumentu członka rodziny"] = form.familyDocNumber;
                record["Kraj wydający dokument członka rodziny"] = form.familyIssuingCountry;
            }
        }
        return record;
    });
};


export const AdminPanel = () => {
    const navigate = useNavigate();
    const DECRYPTION_KEY = import.meta.env.VITE_DECRYPTION_KEY;

    // Stany dla formularzy i panelu
    const [forms, setForms] = useState<FormData[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [typeFilter, setTypeFilter] = useState<"" | "employee" | "family">("");
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    // NOWE: Stany do zarządzania użytkownikami
    const [users, setUsers] = useState<User[]>([]);
    const [userManagementError, setUserManagementError] = useState<string | null>(null);

    // Efekt do sprawdzania logowania (bez zmian)
    useEffect(() => {
        const loggedIn = localStorage.getItem("isLoggedIn") === "true";
        const role = localStorage.getItem("userRole");
        setIsLoggedIn(loggedIn);
        setUserRole(role);
        setIsLoading(false);
        const today = new Date().toISOString().split('T')[0];
        setDateFrom(today);
        setDateTo(today);
    }, []);

    // Efekt do pobierania formularzy (bez zmian)
    useEffect(() => {
        if (!isLoggedIn || !DECRYPTION_KEY) return;
        const fetchAndDecryptForms = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const apiUrl = `${import.meta.env.VITE_API_URL}/api/forms`;
                const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!response.ok) throw new Error('Błąd pobierania danych');
                const encryptedForms = await response.json();
                const decryptedForms = encryptedForms.map((form: any) => {
                    try {
                        const bytes = CryptoJS.AES.decrypt(form.encrypted_data, DECRYPTION_KEY);
                        const decryptedDataString = bytes.toString(CryptoJS.enc.Utf8);
                        const decryptedAllData = decryptedDataString ? JSON.parse(decryptedDataString) : {};
                        return { id: form.id, createdAt: form.created_at, ...decryptedAllData };
                    } catch (e) { console.error(`Nie udało się przetworzyć rekordu ID: ${form.id}`, e); return null; }
                }).filter(Boolean);
                setForms(decryptedForms as FormData[]);
            } catch (error) { console.error("Nie udało się pobrać formularzy:", error); }
        };
        fetchAndDecryptForms();
    }, [isLoggedIn, DECRYPTION_KEY]);

    // NOWA FUNKCJA: Do pobierania listy użytkowników
    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error("Brak tokenu autoryzacyjnego.");
            const apiUrl = `${import.meta.env.VITE_API_URL}/api/users`;
            const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Nie udało się pobrać listy użytkowników.');
            }
            const data = await response.json();
            setUsers(data);
            setUserManagementError(null);
        } catch (err: any) {
            setUserManagementError(err.message);
            console.error(err);
        }
    };

    // Efekt do pobierania użytkowników (tylko dla superadmina)
    useEffect(() => {
        if (isLoggedIn && userRole === 'superadmin') {
            fetchUsers();
        }
    }, [isLoggedIn, userRole]);


    const handleExport = () => {
        const dataToExport = transformDataForExport(filteredForms, 'export');
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Formularze");
        XLSX.writeFile(wb, "raport_formularzy.xlsx");
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/admin");
    };

    const filteredForms = forms
        .filter(f => {
            if (!dateFrom || !dateTo || !f.createdAt) return true;
            const formDate = new Date(f.createdAt).getTime();
            const fromDate = new Date(dateFrom).getTime();
            const toDate = new Date(dateTo).getTime();
            return formDate >= fromDate && formDate <= toDate + (24 * 60 * 60 * 1000 - 1); // Dodajemy 1 dzień w milisekundach, aby uwzględnić cały dzień "do"
        })
        .filter(f => typeFilter ? f.submissionType === typeFilter : true);

    const tableColumns = [
        { key: 'name', label: 'Imię' }, { key: 'surname', label: 'Nazwisko' },
        { key: 'pesel', label: 'PESEL' }, { key: 'email', label: 'Email' },
        { key: 'submissionType', label: 'Typ' }, { key: 'familyName', label: 'Imię czł. rodziny' },
        { key: 'createdAt', label: 'Data zgłoszenia' },
    ];

    const dataForPreview = transformDataForExport(filteredForms, 'preview');
    const previewHeaders = dataForPreview.length > 0 ? Object.keys(dataForPreview[0]) : [];

    if (isLoading) return <div className="flex items-center justify-center min-h-screen">Ładowanie...</div>;
    if (!isLoggedIn) return <Navigate to="/admin" replace />;

    return (
        <div className="bg-gray-50 min-h-screen">
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <DashboardActions
                    onExport={handleExport}
                    onPreview={() => setIsPreviewModalOpen(true)}
                    dateFrom={dateFrom}
                    onDateFromChange={setDateFrom}
                    dateTo={dateTo}
                    onDateToChange={setDateTo}
                    typeFilter={typeFilter}
                    onTypeChange={setTypeFilter}
                    onLogout={handleLogout}
                />

                <SubmissionsTable forms={filteredForms} columns={tableColumns} />

                {userRole === 'superadmin' && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Zarządzanie użytkownikami</h2>
                        {userManagementError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{userManagementError}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <AddUserForm onUserAdded={fetchUsers} />
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <UserList users={users} onUserDeleted={fetchUsers} />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Podgląd raportu do eksportu">
                <div className="overflow-x-auto bg-gray-10 p-4">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                {previewHeaders.map(header => (
                                    <th key={header} className="border px-2 py-2 font-bold text-left text-gray-700">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataForPreview.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                    {previewHeaders.map(header => (
                                        <td key={`${rowIndex}-${header}`} className="border px-2 py-1 text-gray-800">{String(row[header] ?? "")}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
}