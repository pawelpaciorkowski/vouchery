import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import CryptoJS from "crypto-js";

type IdentityFieldsProps = {
    prefix?: string; // "" lub "family"
    method: "pesel" | "birthDoc";
    setMethod: (method: "pesel" | "birthDoc") => void;
    setFieldValue: (field: string, value: string) => void;
};

export const IdentityFields: React.FC<IdentityFieldsProps> = ({
    prefix = "",
    method,
    setMethod,
    setFieldValue,
}) => {
    const peselField = prefix ? `${prefix}Pesel` : "pesel";
    const birthDateField = prefix ? `${prefix}BirthDate` : "birthDate";
    const docNumberField = prefix ? `${prefix}DocNumber` : "docNumber";
    return (
        <>
            {/* --- Metoda identyfikacji --- */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sposób identyfikacji</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                        <Field
                            type="radio"
                            name={prefix ? `${prefix}IdentityMethod` : "identityMethod"}
                            value="pesel"
                            checked={method === "pesel"}
                            onChange={() => {
                                setMethod("pesel");
                                setFieldValue(prefix ? `${prefix}IdentityMethod` : "identityMethod", "pesel");
                            }}
                        />
                        PESEL
                    </label>
                    <label className="flex items-center gap-2">
                        <Field
                            type="radio"
                            name={prefix ? `${prefix}IdentityMethod` : "identityMethod"}
                            value="birthDoc"
                            checked={method === "birthDoc"}
                            onChange={() => {
                                setMethod("birthDoc");
                                setFieldValue(prefix ? `${prefix}IdentityMethod` : "identityMethod", "birthDoc");
                            }}
                        />
                        Data urodzenia + nr dokumentu
                    </label>
                </div>
            </div>
            {/* --- Pola zależne od metody --- */}
            {method === "pesel" ? (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">PESEL</label>
                    <Field
                        name={peselField}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setFieldValue(peselField, e.target.value);
                            const date = getBirthDateFromPesel(e.target.value);
                            if (date) setFieldValue(birthDateField, date);
                        }}
                        maxLength={11}
                    />
                    <ErrorMessage name={peselField} component="div" className="text-xs text-red-500 mt-1" />
                    <Field type="hidden" name={birthDateField} />
                </div>
            ) : (
                <>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data urodzenia</label>
                        <Field
                            name={birthDateField}
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <ErrorMessage name={birthDateField} component="div" className="text-xs text-red-500 mt-1" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nr dokumentu tożsamości</label>
                        <Field
                            name={docNumberField}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <ErrorMessage name={docNumberField} component="div" className="text-xs text-red-500 mt-1" />
                    </div>
                </>
            )}
        </>
    );
};




// Funkcja do wyliczania daty urodzenia z PESEL
function getBirthDateFromPesel(pesel: string): string | null {
    if (!/^\d{11}$/.test(pesel)) return null;
    const year = parseInt(pesel.substring(0, 2), 10);
    let month = parseInt(pesel.substring(2, 4), 10);
    const day = parseInt(pesel.substring(4, 6), 10);

    let fullYear;
    if (month > 80) {
        fullYear = 1800 + year;
        month -= 80;
    } else if (month > 60) {
        fullYear = 2200 + year;
        month -= 60;
    } else if (month > 40) {
        fullYear = 2100 + year;
        month -= 40;
    } else if (month > 20) {
        fullYear = 2000 + year;
        month -= 20;
    } else {
        fullYear = 1900 + year;
    }
    return `${fullYear.toString().padStart(4, "0")}-${month
        .toString()
        .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function isValidPesel(pesel: string): boolean {
    if (!/^\d{11}$/.test(pesel)) return false;
    const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    const sum = pesel
        .split('')
        .slice(0, 10)
        .map((num, idx) => Number(num) * weights[idx])
        .reduce((a, b) => a + b, 0);
    const control = (10 - (sum % 10)) % 10;
    return control === Number(pesel[10]);
}


// Opcje do wyboru zgłoszenia
const submissionTypes = [
    { value: "employee", label: "Pracownik" },
    { value: "family", label: "Członek rodziny" },
];

// Schemat walidacji
const baseValidation = {
    name: Yup.string().required("Imię jest wymagane"),
    surname: Yup.string().required("Nazwisko jest wymagane"),
    pesel: Yup.string().when("identityMethod", {
        is: "pesel",
        then: (schema) =>
            schema
                .matches(/^\d{11}$/, "PESEL musi mieć dokładnie 11 cyfr")
                .test("valid-pesel", "Nieprawidłowy numer PESEL", value => !value || isValidPesel(value))
                .required("PESEL jest wymagany"),
        otherwise: (schema) => schema.notRequired(),
    }),

    birthDate: Yup.string().when("identityMethod", {
        is: "birthDoc",
        then: (schema) => schema.required("Data urodzenia jest wymagana"),
        otherwise: (schema) => schema.notRequired(),
    }),
    docNumber: Yup.string().when("identityMethod", {
        is: "birthDoc",
        then: (schema) => schema.required("Nr dokumentu jest wymagany"),
        otherwise: (schema) => schema.notRequired(),
    }),
    email: Yup.string()
        .email("Niepoprawny email")
        .required("Email jest wymagany"),
    phone: Yup.string().required("Telefon jest wymagany"),
    street: Yup.string().required("Ulica jest wymagana"),
    houseNumber: Yup.string().required("Nr domu jest wymagany"),
    flatNumber: Yup.string().required("Nr mieszkania jest wymagany"),
    zip: Yup.string().required("Kod pocztowy jest wymagany"),
    city: Yup.string().required("Miasto jest wymagane"),
    region: Yup.string().required("Województwo jest wymagane"),
    zgodaDanePrawdziwe: Yup.boolean()
        .oneOf([true], "Musisz potwierdzić prawdziwość danych"),
    zgodaPrzetwarzanie: Yup.boolean()
        .oneOf([true], "Musisz wyrazić zgodę na przetwarzanie danych"),
    zgodaZapoznanie: Yup.boolean()
        .oneOf([true], "Musisz potwierdzić zapoznanie się z procedurą"),

};

const familyValidation = {
    familyName: Yup.string().required("Imię członka rodziny"),
    familySurname: Yup.string().required("Nazwisko członka rodziny"),
    familyPesel: Yup.string().when("familyIdentityMethod", {
        is: "pesel",
        then: (schema) =>
            schema
                .matches(/^\d{11}$/, "PESEL musi mieć dokładnie 11 cyfr")
                .test("valid-pesel", "Nieprawidłowy numer PESEL", value => !value || isValidPesel(value))
                .required("PESEL członka rodziny jest wymagany"),
        otherwise: (schema) => schema.notRequired(),
    }),

    familyBirthDate: Yup.string().when("familyIdentityMethod", {
        is: "birthDoc",
        then: (schema) => schema.required("Data urodzenia członka rodziny jest wymagana"),
        otherwise: (schema) => schema.notRequired(),
    }),
    familyDocNumber: Yup.string().when("familyIdentityMethod", {
        is: "birthDoc",
        then: (schema) => schema.required("Nr dokumentu jest wymagany"),
        otherwise: (schema) => schema.notRequired(),
    }),
};


const validationSchema = (type: string) =>
    Yup.object().shape({
        ...baseValidation,
        ...(type === "family" ? familyValidation : {}),
    });





const initialValues = {
    identityMethod: "pesel",
    docNumber: "",
    submissionType: "employee",
    name: "",
    surname: "",
    pesel: "",
    birthDate: "",
    email: "",
    phone: "",
    street: "",
    houseNumber: "",
    flatNumber: "",
    zip: "",
    city: "",
    region: "",
    // rodzina
    familyIdentityMethod: "pesel",
    familyDocNumber: "",
    familyName: "",
    familySurname: "",
    familyPesel: "",
    familyBirthDate: "",
    zgodaDanePrawdziwe: false,
    zgodaPrzetwarzanie: false,
    zgodaZapoznanie: false,
};


const SECRET_KEY = "MocnoTajnyKlucz!"; // Tylko na demo!



export const AlabForm = () => {
    const [type, setType] = useState<"employee" | "family">("employee");
    const [identityMethod, setIdentityMethod] = useState<"pesel" | "birthDoc">("pesel");
    const [familyIdentityMethod, setFamilyIdentityMethod] = useState<"pesel" | "birthDoc">("pesel");
    const selectAllRef = React.useRef<HTMLInputElement>(null);

    const submissionLabels = {
        employee: "pracownika",
        family: "członka rodziny",
    };



    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-10">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl">
                <h2
                    className="
    text-4xl sm:text-3xl
    font-extrabold
    text-center
    mb-8
    tracking-tight
    bg-gradient-to-r from-blue-700 via-sky-500 to-blue-400
    bg-clip-text text-transparent
    select-none
    drop-shadow-md
  "
                    style={{
                        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                        letterSpacing: "0.02em",
                        lineHeight: "1.1",
                        textShadow: "0 2px 12px rgba(37, 99, 235, 0.14)",
                    }}
                >
                    Formularz zgłoszeniowy&nbsp;
                    <span className="capitalize">
                        {submissionLabels[type]}
                    </span>
                </h2>

                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema(type)}
                    onSubmit={(values, { setSubmitting, resetForm }) => {
                        const now = new Date().toISOString(); // aktualny czas
                        const dataWithTimestamp = { ...values, createdAt: now };

                        // Jeśli przechowujesz tablicę, dopisuj kolejne
                        const old = JSON.parse(localStorage.getItem("encryptedForms") || "[]");
                        const ciphertext = CryptoJS.AES.encrypt(
                            JSON.stringify(dataWithTimestamp),
                            SECRET_KEY
                        ).toString();
                        old.push(ciphertext);
                        localStorage.setItem("encryptedForms", JSON.stringify(old));

                        alert("Dane zaszyfrowane i zapisane!");
                        setSubmitting(false);
                        resetForm();
                    }}


                >
                    {({ setFieldValue, values }) => {
                        const allChecked =
                            values.zgodaDanePrawdziwe &&
                            values.zgodaPrzetwarzanie &&
                            values.zgodaZapoznanie;

                        const someChecked =
                            values.zgodaDanePrawdziwe ||
                            values.zgodaPrzetwarzanie ||
                            values.zgodaZapoznanie;




                        const handleSelectAll = (checked: boolean) => {
                            setFieldValue("zgodaDanePrawdziwe", checked);
                            setFieldValue("zgodaPrzetwarzanie", checked);
                            setFieldValue("zgodaZapoznanie", checked);
                        };

                        return (
                            <Form>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Typ zgłoszenia</label>
                                    <Select
                                        options={submissionTypes}
                                        value={submissionTypes.find((opt) => opt.value === type)}
                                        onChange={(opt) => {
                                            if (opt && (opt.value === "employee" || opt.value === "family")) {
                                                setType(opt.value as "employee" | "family");
                                                setFieldValue("submissionType", opt.value);
                                            }
                                        }}

                                    />
                                </div>

                                {/* --- Pola pracownika --- */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Imię</label>
                                    <Field
                                        name="name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="name" component="div" className="text-xs text-red-500 mt-1" />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko</label>
                                    <Field
                                        name="surname"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="surname" component="div" className="text-xs text-red-500 mt-1" />
                                </div>

                                <IdentityFields
                                    method={identityMethod}
                                    setMethod={setIdentityMethod}
                                    setFieldValue={setFieldValue}
                                />



                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <Field
                                        name="email"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="email" component="div" className="text-xs text-red-500 mt-1" />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                    <Field
                                        name="phone"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="phone" component="div" className="text-xs text-red-500 mt-1" />
                                </div>

                                {/* --- Adres --- */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ulica</label>
                                    <Field
                                        name="street"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="street" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nr domu</label>
                                    <Field
                                        name="houseNumber"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="houseNumber" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nr mieszkania</label>
                                    <Field
                                        name="flatNumber"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="flatNumber" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kod pocztowy</label>
                                    <Field
                                        name="zip"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="zip" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Miasto</label>
                                    <Field
                                        name="city"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="city" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Województwo</label>
                                    <Field
                                        name="region"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ErrorMessage name="region" component="div" className="text-xs text-red-500 mt-1" />
                                </div>



                                {/* --- Pola członka rodziny --- */}
                                {type === "family" && (
                                    <>
                                        <div className="mb-4 mt-8 border-t border-gray-200 pt-4">
                                            <h3 className="font-bold text-blue-600 mb-2">Dane członka rodziny</h3>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Imię członka rodziny</label>
                                            <Field
                                                name="familyName"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <ErrorMessage name="familyName" component="div" className="text-xs text-red-500 mt-1" />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko członka rodziny</label>
                                            <Field
                                                name="familySurname"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <ErrorMessage name="familySurname" component="div" className="text-xs text-red-500 mt-1" />
                                        </div>
                                        <IdentityFields
                                            prefix="family"
                                            method={familyIdentityMethod}
                                            setMethod={setFamilyIdentityMethod}
                                            setFieldValue={setFieldValue}
                                        />


                                    </>

                                )}

                                {/* --- Zgody --- */}
                                <div className="mb-4 mt-8 border-t border-gray-200 pt-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Zgody:
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        {/* MASTER CHECKBOX */}
                                        <label className="flex items-center gap-2 font-semibold">
                                            <input
                                                type="checkbox"
                                                ref={el => {
                                                    if (el) el.indeterminate = someChecked && !allChecked;
                                                    selectAllRef.current = el;
                                                }}
                                                checked={allChecked}
                                                onChange={e => handleSelectAll(e.target.checked)}
                                            />
                                            <span>Zaznacz wszystkie zgody</span>
                                        </label>

                                        <label className="flex items-center gap-2">
                                            <Field type="checkbox" name="zgodaDanePrawdziwe" />
                                            <span>
                                                Oświadczam, że podane w formularzu dane są zgodne z prawdą.
                                            </span>
                                        </label>
                                        <ErrorMessage name="zgodaDanePrawdziwe" component="div" className="text-xs text-red-500 mb-1 ml-6" />

                                        <label className="flex items-center gap-2">
                                            <Field type="checkbox" name="zgodaPrzetwarzanie" />
                                            <span>
                                                Wyrażam zgodę na przetwarzanie danych osobowych podanych w formularzu w celu udzielenia zniżki na badania.
                                            </span>
                                        </label>
                                        <ErrorMessage name="zgodaPrzetwarzanie" component="div" className="text-xs text-red-500 mb-1 ml-6" />

                                        <label className="flex items-center gap-2">
                                            <Field type="checkbox" name="zgodaZapoznanie" />
                                            <span>
                                                Zapoznałem/am się i akceptuję „Procedurę udzielania zniżek na badania diagnostyczne dla pracowników i ich rodzin”.
                                            </span>
                                        </label>
                                        <ErrorMessage name="zgodaZapoznanie" component="div" className="text-xs text-red-500 mb-1 ml-6" />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 text-white py-2 mt-4 rounded-lg shadow hover:bg-blue-700 transition"
                                >
                                    Wyślij
                                </button>
                            </Form>
                        )
                    }}
                </Formik>

            </div>
        </div>
    );
};
