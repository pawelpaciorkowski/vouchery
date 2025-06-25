/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import * as XLSX from 'xlsx';
import { AddUserForm } from './AddUserForm';
import { UserList } from './UserList';

// Typ danych
export type FormData = {
    id: number;
    submissionType: "employee" | "family";
    name: string;
    surname: string;
    gender: string;
    pesel: string;
    birthDate: string;
    email: string;
    phone: string;
    street: string;
    houseNumber: string;
    flatNumber?: string;
    zip: string;
    postOffice: string;
    city: string;
    country: string;
    region: string;
    familyName?: string;
    familySurname?: string;
    familyGender?: string;
    familyPesel?: string;
    familyIdentityMethod?: "pesel" | "birthDoc";
    familyBirthDate?: string;
    familyDocumentType?: 'dowod' | 'paszport';
    familyDocNumber?: string;
    familyIssuingCountry?: string;
    zgodaDanePrawdziwe: boolean;
    zgodaPrzetwarzanie: boolean;
    zgodaZapoznanie: boolean;
    createdAt?: string;
};

// --- FUNKCJE POMOCNICZE ---
function getBirthDateFromPesel(pesel: string | undefined): string {
    if (!pesel || !/^\d{11}$/.test(pesel)) return "";
    let year = parseInt(pesel.substring(0, 2), 10);
    let month = parseInt(pesel.substring(2, 4), 10);
    const day = parseInt(pesel.substring(4, 6), 10);
    if (month > 80) { year += 1800; month -= 80; }
    else if (month > 60) { year += 2200; month -= 60; }
    else if (month > 40) { year += 2100; month -= 40; }
    else if (month > 20) { year += 2000; month -= 20; }
    else { year += 1900; }
    return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

// --- NOWA, POPRAWIONA FUNKCJA DO TRANSFORMACJI DANYCH ---
const transformDataForExport = (data: FormData[]) => {
    const getGenderAbbreviation = (gender: string | undefined): 'K' | 'M' | '' => {
        if (!gender) return '';
        const lowerGender = gender.toLowerCase();
        if (lowerGender === 'kobieta') return 'K';
        if (lowerGender === 'mezczyzna' || lowerGender === 'm') return 'M';
        return '';
    };

    return data.map(form => {
        // Tworzymy obiekt z kluczami w DOKŁADNIE takiej kolejności jak na zrzucie ekranu
        const record: Record<string, any> = {
            "Imię pracownika": form.name,
            "Nazwisko pracownika": form.surname,
            "Płeć pracownika": getGenderAbbreviation(form.gender),
            "PESEL pracownika": form.pesel,
            "Email": form.email,
            "Nr telefonu": form.phone,
            "Adres": `${form.street || ''} ${form.houseNumber || ''}${form.flatNumber ? `/${form.flatNumber}` : ''}, ${form.zip || ''} ${form.city || ''}`,
            "Ulica": form.street,
            "Numer domu": form.houseNumber,
            "Numer mieszkania": form.flatNumber || "",
            "Kod-pocztowy": form.zip,
            "Poczta": form.postOffice,
            "Miasto": form.city,
            "Województwo": form.region,
            "Kraj": form.country,
            "Typ dokumentu pracownika": "", // Zostawiamy puste, bo identyfikacja jest przez PESEL
            "Nr dokumentu pracownika": "",
            "Kraj wydający dokument pracownika": "",
            "Imię członka rodziny": "", // Inicjujemy puste pola dla członka rodziny
            "Nazwisko członka rodziny": "",
            "Płeć członka rodziny": "",
            "PESEL członka rodziny": "",
            "Data urodzenia członka rodziny": "",
            "Typ dokumentu członka rodziny": "",
            "Nr dokumentu członka rodziny": "",
            "Kraj wydający dokument członka rodziny": "",
            "Data zgłoszenia": form.createdAt ? new Date(form.createdAt).toLocaleDateString('pl-PL') : "-",
        };

        // Warunkowo wypełniamy dane członka rodziny, jeśli zgłoszenie go dotyczy
        if (form.submissionType === 'family') {
            record["Imię członka rodziny"] = form.familyName;
            record["Nazwisko członka rodziny"] = form.familySurname;
            record["Płeć członka rodziny"] = getGenderAbbreviation(form.familyGender);

            if (form.familyIdentityMethod === 'pesel') {
                record["PESEL członka rodziny"] = form.familyPesel;
                record["Data urodzenia członka rodziny"] = getBirthDateFromPesel(form.familyPesel);
            } else { // Metoda 'birthDoc'
                record["Data urodzenia członka rodziny"] = form.familyBirthDate;
                record["Typ dokumentu członka rodziny"] = form.familyDocumentType === 'dowod' ? 'Dowód osobisty' : 'Paszport';
                record["Nr dokumentu członka rodziny"] = form.familyDocNumber;
                record["Kraj wydający dokument członka rodziny"] = form.familyIssuingCountry;
            }
        }
        return record;
    });
};


// --- GŁÓWNY KOMPONENT PANELU ADMINA ---
export const AdminPanel = () => {
    const navigate = useNavigate();
    const DECRYPTION_KEY = import.meta.env.VITE_DECRYPTION_KEY;

    const [forms, setForms] = useState<FormData[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<string>("");
    const [typeFilter, setTypeFilter] = useState<"" | "employee" | "family">("");

    useEffect(() => {
        const loggedIn = localStorage.getItem("isLoggedIn") === "true";
        const role = localStorage.getItem("userRole");
        setIsLoggedIn(loggedIn);
        setUserRole(role);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!isLoggedIn) return;
        if (!DECRYPTION_KEY) {
            console.error("Klucz VITE_DECRYPTION_KEY nie jest ustawiony!");
            return;
        }
        const fetchAndDecryptForms = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/forms`;
                const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!response.ok) throw new Error('Błąd pobierania danych');
                const encryptedForms = await response.json();
                const decryptedForms = encryptedForms.map((form: any) => {
                    try {
                        const bytes = CryptoJS.AES.decrypt(form.encrypted_data, DECRYPTION_KEY);
                        const decryptedDataString = bytes.toString(CryptoJS.enc.Utf8);
                        const decryptedAllData = decryptedDataString ? JSON.parse(decryptedDataString) : {};
                        return { id: form.id, createdAt: form.created_at, ...decryptedAllData };
                    } catch (e) {
                        console.error(`Nie udało się przetworzyć rekordu ID: ${form.id}`, e);
                        return null;
                    }
                }).filter(Boolean);
                setForms(decryptedForms as FormData[]);
            } catch (error) {
                console.error("Nie udało się pobrać formularzy:", error);
            }
        };
        fetchAndDecryptForms();
    }, [isLoggedIn, DECRYPTION_KEY]);

    const handleExport = () => {
        const dataToExport = transformDataForExport(filteredForms);
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Formularze");
        XLSX.writeFile(wb, "raport_formularzy.xlsx");
    };

    const filteredForms = forms
        .filter(f => dateFilter ? (f.createdAt && f.createdAt.startsWith(dateFilter)) : true)
        .filter(f => typeFilter ? f.submissionType === typeFilter : true);

    const tableColumns = [
        { key: 'name', label: 'Imię' }, { key: 'surname', label: 'Nazwisko' },
        { key: 'gender', label: 'Płeć' }, { key: 'pesel', label: 'PESEL' },
        { key: 'email', label: 'Email' }, { key: 'phone', label: 'Telefon' },
        { key: 'city', label: 'Miasto' }, { key: 'submissionType', label: 'Typ zgłoszenia' },
        { key: 'familyName', label: 'Imię czł. rodziny' }, { key: 'familySurname', label: 'Nazwisko czł. rodziny' },
        { key: 'createdAt', label: 'Data zgłoszenia' },
    ];

    if (isLoading) return <div>Ładowanie...</div>;
    if (!isLoggedIn) return <Navigate to="/admin" replace />;

    return (
        <div className="p-8 w-full">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Panel administratora</h1>
                <button
                    onClick={() => { localStorage.clear(); navigate("/admin"); }}
                    className="ml-4 px-4 py-2 bg-gray-100 border rounded-lg"
                >
                    Wyloguj
                </button>
            </div>
            <div className="mb-6 flex gap-4 items-center flex-wrap">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow font-semibold" onClick={handleExport}>
                    Pobierz raport (Excel)
                </button>
                <div>
                    <label className="font-semibold mr-2">Filtruj po dacie:</label>
                    <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border px-2 py-1 rounded" />
                    <button onClick={() => setDateFilter("")} className="ml-2 px-3 py-1 text-sm">Wyczyść</button>
                </div>
                <div>
                    <label className="font-semibold mr-2">Filtruj po typie:</label>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="border px-2 py-1 rounded">
                        <option value="">Wszystkie</option>
                        <option value="employee">Pracownik</option>
                        <option value="family">Członek rodziny</option>
                    </select>
                    <button onClick={() => setTypeFilter("")} className="ml-2 px-3 py-1 text-sm">Wyczyść</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border">
                    <thead>
                        <tr className="bg-gray-100">
                            {tableColumns.map(({ key, label }) => (
                                <th key={key} className="border px-2 py-2 font-bold text-left">{label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredForms.length > 0 ? filteredForms.map((form, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                {tableColumns.map(({ key }) => (
                                    <td key={key} className="border px-2 py-1">
                                        {key === "createdAt"
                                            ? form.createdAt ? form.createdAt.substring(0, 10) : "-"
                                            : key === "submissionType"
                                                ? (form.submissionType === 'employee' ? 'Pracownik' : 'Członek rodziny')
                                                : String(form[key as keyof FormData] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={tableColumns.length} className="text-center p-4">Brak danych do wyświetlenia.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {userRole === 'superadmin' && (
                <>
                    <AddUserForm />
                    <UserList />
                </>
            )}
        </div>
    );
}