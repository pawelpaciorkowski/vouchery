// Plik: src/components/SubmissionsTable.tsx

import React from 'react';
import { type FormData } from '../types';

type SubmissionsTableProps = {
    forms: FormData[];
    columns: { key: string; label: string }[];
};

// UPEWNIJ SIĘ, ŻE JEST TUTAJ SŁOWO "EXPORT"
export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ forms, columns }) => {
    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    {/* Nagłówek tabeli */}
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map(({ key, label }) => (
                                <th key={key} className="px-4 py-3 font-semibold text-left text-gray-600 uppercase tracking-wider">
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    {/* Ciało tabeli */}
                    <tbody className="divide-y divide-gray-200">
                        {forms.length > 0 ? forms.map((form, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                {columns.map(({ key }) => (
                                    <td key={key} className="px-4 py-3 whitespace-nowrap text-gray-700">
                                        {key === "createdAt"
                                            ? form.createdAt ? new Date(form.createdAt).toLocaleDateString('pl-PL') : "-"
                                            : key === "submissionType"
                                                ? (form.submissionType === 'employee' ? 'Pracownik' : 'Członek rodziny')
                                                : String(form[key as keyof FormData] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length} className="text-center p-6 text-gray-500">
                                    Brak danych do wyświetlenia. Dostosuj filtry lub poczekaj na nowe zgłoszenia.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};