/* eslint-disable @typescript-eslint/no-unused-vars */
// Plik: src/AdminPanel.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, type Key } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import * as XLSX from 'xlsx';

import { AddUserForm } from './AddUserForm';
import { UserList } from './UserList';
import { type FormData } from './types';
import { DashboardActions } from './components/DashboardActions';
import { SubmissionsTable } from './components/SubmissionsTable';
import { Modal } from './components/Modal';

// Definicja typu dla użytkownika
export interface User {
    id: number;
    username: string;
    role: string;
}

// === OSTATECZNA WERSJA KOMPONENTU ===

// Funkcje pomocnicze
const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try {
        return new Date(date).toLocaleDateString('pl-PL');
    } catch (e) {
        return "";
    }
};

const getGenderAbbreviation = (gender: string | undefined): 'M' | 'K' | '' => {
    if (!gender) return '';
    const lowerGender = gender.toLowerCase();
    if (lowerGender === 'male' || lowerGender === 'm' || lowerGender === 'mężczyzna') return 'M';
    if (lowerGender === 'female' || lowerGender === 'k' || lowerGender === 'kobieta') return 'K';
    return '';
};

const getBirthDateFromPesel = (pesel: string | undefined): Date | null => {
    if (typeof pesel !== 'string' || pesel.length !== 11) return null;
    let year = parseInt(pesel.substring(0, 2), 10);
    let month = parseInt(pesel.substring(2, 4), 10);
    const day = parseInt(pesel.substring(4, 6), 10);

    if (month > 80) { year += 1800; month -= 80; }
    else if (month > 60) { year += 2200; month -= 60; }
    else if (month > 40) { year += 2100; month -= 40; }
    else if (month > 20) { year += 2000; month -= 20; }
    else { year += 1900; }

    const birthDate = new Date(year, month - 1, day);
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return null;
    return birthDate;
};

export const AdminPanel = () => {
    const navigate = useNavigate();
    const DECRYPTION_KEY = import.meta.env.VITE_DECRYPTION_KEY;

    // Stany (bez zmian)
    const [forms, setForms] = useState<FormData[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [typeFilter, setTypeFilter] = useState<"" | "employee" | "family">("employee");
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [userManagementError, setUserManagementError] = useState<string | null>(null);

    // Efekty i pobieranie danych (bez zmian)
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

    useEffect(() => {
        if (isLoggedIn && userRole === 'superadmin') {
            fetchUsers();
        }
    }, [isLoggedIn, userRole]);

    // ODPORNA NA BŁĘDY FUNKCJA EKSPORTU
    // ZASTĄP STARĄ FUNKCJĘ TĄ NOWĄ, POPRAWIONĄ WERSJĄ
    const handleExport = () => {
        // Zostaw tę linię do diagnozowania problemów z danymi!
        console.log("Dane przekazywane do eksportu:", filteredForms);

        // 1. Definicja nagłówków - stała, zgodna z test.xlsx
        const mainHeader = [
            null, null, null, null, null, null, null,
            "Dokument tożsamości", null, null,
            "Adres", null, null, null, null, null, null, null, null
        ];
        const detailedHeader = [
            "Imiona", "Nazwisko", "PESEL", "Płeć", "Data urodzenia", "Email", "Nr telefonu",
            "Typ dokumentu", "Nr dokumentu", "Kraj wydający",
            "Kraj", "Województwo", "Miasto", "Kod-pocztowy", "Poczta", "Ulica", "Numer domu", "Numer mieszkania", "Niestandardowy adres"
        ];

        // 2. Transformacja danych na podstawie filtra
        let peopleToExport: any[] = [];

        if (typeFilter === 'family') {
            peopleToExport = filteredForms
                .filter(form => form.submissionType === 'family')
                .map(form => {
                    const birthDate = (form.familyIdentityMethod === 'pesel' && form.familyPesel)
                        ? getBirthDateFromPesel(form.familyPesel)
                        : (form.familyBirthDate ? new Date(form.familyBirthDate) : null);

                    const document = form.familyIdentityMethod !== 'pesel' ? {
                        type: form.familyDocumentType === 'dowod' ? 'Dowód osobisty' : 'Paszport',
                        number: form.familyDocNumber || "",
                        country: form.familyIssuingCountry || ""
                    } : { type: "", number: "", country: "" };

                    return {
                        name: form.familyName || "", surname: form.familySurname || "", pesel: form.familyPesel || "",
                        gender: getGenderAbbreviation(form.familyGender), birthDate: formatDate(birthDate),
                        email: "", phone: "",
                        docType: document.type, docNumber: document.number, docCountry: document.country,
                        country: form.country || "", region: form.region || "", city: form.city || "", zip: form.zip || "",
                        postOffice: form.postOffice || "", street: form.street || "", houseNumber: form.houseNumber || "",
                        flatNumber: form.flatNumber || "", customAddress: ""
                    };
                });
        } else {
            peopleToExport = filteredForms
                .filter(form => typeFilter === 'employee' ? form.submissionType === 'employee' : true)
                .map(form => ({
                    name: form.name || "", surname: form.surname || "", pesel: form.pesel || "",
                    gender: getGenderAbbreviation(form.gender), birthDate: formatDate(getBirthDateFromPesel(form.pesel)),
                    email: form.email || "", phone: form.phone || "",
                    docType: "", docNumber: "", docCountry: "",
                    country: form.country || "", region: form.region || "", city: form.city || "", zip: form.zip || "",
                    postOffice: form.postOffice || "", street: form.street || "", houseNumber: form.houseNumber || "",
                    flatNumber: form.flatNumber || "", customAddress: ""
                }));
        }

        // 3. POPRAWKA: Ręczne mapowanie danych do wierszy w prawidłowej kolejności
        const dataRows = peopleToExport.map(person => [
            person.name,
            person.surname,
            person.pesel,
            person.gender, // Płeć jest teraz na pewno na właściwym miejscu
            person.birthDate,
            person.email,
            person.phone,
            person.docType,
            person.docNumber,
            person.docCountry,
            person.country,
            person.region,
            person.city,
            person.zip,
            person.postOffice,
            person.street,
            person.houseNumber,
            person.flatNumber,
            person.customAddress
        ]);

        // 4. Budowanie i pobieranie pliku .xlsx
        const dataToExport = [mainHeader, detailedHeader, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(dataToExport);

        ws['!merges'] = [
            { s: { r: 0, c: 7 }, e: { r: 0, c: 9 } },
            { s: { r: 0, c: 10 }, e: { r: 0, c: 18 } }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Zgłoszenia");
        XLSX.writeFile(wb, "raport_zgloszen.xlsx");
    };

    const handleLogout = () => { localStorage.clear(); navigate("/admin"); };

    const filteredForms = forms
        .filter(f => {
            if (!dateFrom || !dateTo || !f.createdAt) return true;
            const formDate = new Date(f.createdAt).getTime();
            const fromDate = new Date(dateFrom).getTime();
            const toDate = new Date(dateTo).getTime();
            return formDate >= fromDate && formDate <= toDate + (24 * 60 * 60 * 1000 - 1);
        })
        .filter(f => typeFilter ? f.submissionType === typeFilter : true);

    // Reszta komponentu bez zmian
    const tableColumns = [
        { key: 'name', label: 'Imię' }, { key: 'surname', label: 'Nazwisko' },
        { key: 'pesel', label: 'PESEL' }, { key: 'email', label: 'Email' },
        { key: 'submissionType', label: 'Typ' }, { key: 'familyName', label: 'Imię czł. rodziny' },
        { key: 'createdAt', label: 'Data zgłoszenia' },
    ];

    const dataForPreview = filteredForms.map(form => ({
        "Imię": form.name, "Nazwisko": form.surname, "PESEL": form.pesel,
        "Typ": form.submissionType, "Imię członka rodziny": form.familyName || "N/A",
        "Data zgłoszenia": formatDate(form.createdAt)
    }));
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
                            <div className="bg-white p-6 rounded-xl shadow-md"><AddUserForm onUserAdded={fetchUsers} /></div>
                            <div className="bg-white p-6 rounded-xl shadow-md"><UserList users={users} onUserDeleted={fetchUsers} /></div>
                        </div>
                    </div>
                )}
            </main>
            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Podgląd raportu (uproszczony)">
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
                            {dataForPreview.map((row: { [x: string]: any; }, rowIndex: Key | null | undefined) => (
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
};