import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

// Ten sam klucz co w formularzu
const SECRET_KEY = "MocnoTajnyKlucz!";
export type FormData = {
    identityMethod: "pesel" | "birthDoc";
    docNumber: string;
    submissionType: "employee" | "family";
    name: string;
    surname: string;
    pesel: string;
    birthDate: string;
    email: string;
    phone: string;
    street: string;
    houseNumber: string;
    flatNumber: string;
    zip: string;
    city: string;
    region: string;
    // rodzina:
    familyIdentityMethod: "pesel" | "birthDoc";
    familyDocNumber: string;
    familyName: string;
    familySurname: string;
    familyPesel: string;
    familyBirthDate: string;
    zgodaDanePrawdziwe: boolean;
    zgodaPrzetwarzanie: boolean;
    zgodaZapoznanie: boolean;
    createdAt?: string;
};


const COLUMNS = [
    "identityMethod",
    "docNumber",
    "submissionType",
    "name",
    "surname",
    "pesel",
    "birthDate",
    "email",
    "phone",
    "street",
    "houseNumber",
    "flatNumber",
    "zip",
    "city",
    "region",
    "familyIdentityMethod",
    "familyDocNumber",
    "familyName",
    "familySurname",
    "familyPesel",
    "familyBirthDate",
    "zgodaDanePrawdziwe",
    "zgodaPrzetwarzanie",
    "zgodaZapoznanie",
    "createdAt",
] as const;

const COLUMN_LABELS: Record<string, string> = {
    identityMethod: "Sposób identyfikacji",
    docNumber: "Nr dokumentu",
    submissionType: "Typ zgłoszenia",
    name: "Imię",
    surname: "Nazwisko",
    pesel: "PESEL",
    birthDate: "Data urodzenia",
    email: "Email",
    phone: "Telefon",
    street: "Ulica",
    houseNumber: "Nr domu",
    flatNumber: "Nr mieszkania",
    zip: "Kod pocztowy",
    city: "Miasto",
    region: "Województwo",
    familyIdentityMethod: "Sposób identyfikacji członka rodziny",
    familyDocNumber: "Nr dokumentu członka rodziny",
    familyName: "Imię członka rodziny",
    familySurname: "Nazwisko członka rodziny",
    familyPesel: "PESEL członka rodziny",
    familyBirthDate: "Data urodzenia członka rodziny",
    zgodaDanePrawdziwe: "Zgoda na prawdziwość danych",
    zgodaPrzetwarzanie: "Zgoda na przetwarzanie danych osobowych",
    zgodaZapoznanie: "Zgoda na zapoznanie się z procedurą",
    createdAt: "Data utworzenia formularza"
};


export const AdminPanel = () => {
    const navigate = useNavigate();
    const [typeFilter, setTypeFilter] = useState<"" | "employee" | "family">("");
    const [forms, setForms] = useState<FormData[]>([]);
    const [dateFilter, setDateFilter] = useState<string>("");


    useEffect(() => {
        if (localStorage.getItem("admin-logged-in") !== "1") {
            navigate("/admin");
        }
    }, [navigate]);




    // Odszyfruj i wczytaj wszystkie formularze przy starcie
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("encryptedForms") || "[]");
        const decrypted = stored.map((cipher: string) => {
            try {
                const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
                return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            } catch (error) {
                console.error("Błąd odszyfrowania:", error);
                return { error: "Nie udało się odszyfrować", cipher };
            }
        });
        setForms(decrypted);
    }, []);

    // Generowanie pliku Excel
    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(filteredForms);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Formularze");
        XLSX.writeFile(wb, "formularze.xlsx");
    };


    const filteredForms = forms
        .filter(f => dateFilter ? (f.createdAt && f.createdAt.startsWith(dateFilter)) : true)
        .filter(f => typeFilter ? f.submissionType === typeFilter : true);



    return (
        <div className="p-8 min-w-0 w-full">

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-center flex-1">
                    Panel administratora
                </h1>
                <button
                    onClick={() => {
                        localStorage.removeItem("admin-logged-in");
                        navigate("/admin");
                    }}
                    className="ml-4 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold shadow hover:bg-gray-200 transition"
                    title="Wyloguj się"
                >
                    Wyloguj
                    <svg className="inline w-5 h-5 ml-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
                </button>
            </div>

            <button
                className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow font-semibold hover:bg-blue-700 transition"
                onClick={handleExport}
            >
                Pobierz Excel (XLSX)
            </button>
            <div className="overflow-x-auto">
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <label className="font-semibold">Filtruj po dacie:</label>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        className="border px-2 py-1 rounded"
                    />
                    <button
                        type="button"
                        onClick={() => setDateFilter("")}
                        className="ml-2 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg transition hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm active:bg-blue-200 select-none"
                    >
                        Wyczyść
                    </button>
                    {/* NOWOŚĆ: filtr typu */}
                    <label className="font-semibold ml-4">Filtruj po typie zgłoszenia:</label>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as "" | "employee" | "family")}
                        className="border px-2 py-1 rounded"
                    >
                        <option value="">Wszystkie</option>
                        <option value="employee">Pracownik</option>
                        <option value="family">Członek rodziny</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => setTypeFilter("")}
                        className="ml-2 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg transition hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm active:bg-blue-200 select-none"
                    >
                        Wyczyść
                    </button>
                </div>

                <table className="w-full text-sm border">
                    <thead>
                        <tr>
                            {COLUMNS.map((key) => (
                                <th key={key} className="border px-2 py-1 bg-gray-100 font-bold">
                                    {COLUMN_LABELS[key] || key}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredForms.map((form, i) => (

                            <tr key={i}>
                                {COLUMNS.map((key, j) => (
                                    <td key={j} className="border px-2 py-1">
                                        {key === "createdAt"
                                            ? form.createdAt
                                                ? new Date(form.createdAt).toLocaleString("pl-PL", {
                                                    dateStyle: "short",
                                                    timeStyle: "short",
                                                })
                                                : "-"
                                            : String(form[key as keyof typeof form] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>


            </div>
            {!forms.length && <div className="mt-6 text-center text-gray-500">Brak danych</div>}
        </div>
    );
}
