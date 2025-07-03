/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

type DashboardActionsProps = {
    onExport: () => void;
    onPreview: () => void;
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
    typeFilter: "" | "employee" | "family";
    onTypeChange: (type: "" | "employee" | "family") => void;
    onLogout: () => void;
};

export const DashboardActions: React.FC<DashboardActionsProps> = ({
    onExport,
    onPreview,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    typeFilter,
    onTypeChange,
    onLogout
}) => {
    return (
        <>
            {/* Nagłówek strony */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Panel administratora</h1>
                <button onClick={onLogout} /* ... */ >Wyloguj</button>
            </div>

            {/* Panel z filtrami i akcjami */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <div className="flex flex-wrap items-center gap-6">
                    {/* Przyciski akcji */}
                    <div className="flex items-center gap-3">
                        {/* Nowy przycisk podglądu */}
                        <button
                            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm font-semibold hover:bg-gray-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                            onClick={onPreview}
                        >
                            Podgląd raportu
                        </button>
                        <button
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                            onClick={onExport}
                        >
                            Pobierz raport (Excel)
                        </button>
                    </div>

                    {/* Filtr daty */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="date-from" className="text-sm font-medium text-gray-600">Data od:</label>
                        <input
                            id="date-from"
                            type="date"
                            value={dateFrom}
                            onChange={e => onDateFromChange(e.target.value)}
                            className="border border-gray-300 px-3 py-1.5 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <label htmlFor="date-to" className="text-sm font-medium text-gray-600">do:</label>
                        <input
                            id="date-to"
                            type="date"
                            value={dateTo}
                            onChange={e => onDateToChange(e.target.value)}
                            className="border border-gray-300 px-3 py-1.5 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    {/* Filtr typu zgłoszenia */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="type-filter" className="text-sm font-medium text-gray-600">Filtruj po typie:</label>
                        <select
                            id="type-filter"
                            value={typeFilter}
                            onChange={e => onTypeChange(e.target.value as any)}
                            className="border border-gray-300 px-3 py-1.5 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="employee">Pracownik</option>
                            <option value="family">Członek rodziny</option>
                        </select>
                        {typeFilter && (
                            <button onClick={() => onTypeChange("")} className="text-xs text-gray-500 hover:text-gray-800">Wyczyść</button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};