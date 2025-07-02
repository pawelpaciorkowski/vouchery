/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage, useField } from "formik";
import * as Yup from "yup";
import Select from "react-select";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-center">
                <h3 className="text-xl font-bold mb-4">{title}</h3>
                <div className="mb-6 text-gray-700">
                    {children}
                </div>
                <button
                    onClick={onClose}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Zamknij
                </button>
            </div>
        </div>
    );
};


const GENDERS = [
    { value: "kobieta", label: "Kobieta" },
    { value: "mezczyzna", label: "Mężczyzna" },
];

const DOCUMENT_TYPES = [
    { value: "dowod", label: "Dowód osobisty" },
    { value: "paszport", label: "Paszport" },
];

const CapitalizedField = (props: any) => {
    const [field, , helpers] = useField(props.name);
    const { setValue } = helpers;

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value) {
            const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
            setValue(capitalized);
        }
        field.onBlur(e);
    };

    return <input {...field} {...props} onBlur={handleBlur} />;
};

type IdentityFieldsProps = {
    prefix?: string;
    method: "pesel" | "birthDoc";
    setMethod: (method: "pesel" | "birthDoc") => void;
    setFieldValue: (field: string, value: any) => void;
    values: any;
};

export const IdentityFields: React.FC<IdentityFieldsProps> = ({
    prefix = "",
    method,
    setMethod,
    setFieldValue,
    values,
}) => {
    const peselField = prefix ? `${prefix}Pesel` : "pesel";
    const birthDateField = prefix ? `${prefix}BirthDate` : "birthDate";
    const docNumberField = prefix ? `${prefix}DocNumber` : "docNumber";
    const docTypeField = prefix ? `${prefix}DocumentType` : "documentType";
    const issuingCountryField = prefix ? `${prefix}IssuingCountry` : "issuingCountry";
    const identityMethodName = prefix ? `${prefix}IdentityMethod` : "identityMethod";

    return (
        <>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sposób identyfikacji</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                        <Field type="radio" name={identityMethodName} value="pesel" checked={method === "pesel"} onChange={() => { setMethod("pesel"); setFieldValue(identityMethodName, "pesel"); }} />
                        PESEL
                    </label>
                    <label className="flex items-center gap-2">
                        <Field type="radio" name={identityMethodName} value="birthDoc" checked={method === "birthDoc"} onChange={() => { setMethod("birthDoc"); setFieldValue(identityMethodName, "birthDoc"); }} />
                        Data urodzenia + nr dokumentu
                    </label>
                </div>
            </div>

            {method === "pesel" ? (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">PESEL</label>
                    <Field
                        name={peselField}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
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
                        <Field name={birthDateField} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                        <ErrorMessage name={birthDateField} component="div" className="text-xs text-red-500 mt-1" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Typ dokumentu</label>
                        <Select
                            options={DOCUMENT_TYPES}
                            value={DOCUMENT_TYPES.find(opt => opt.value === (prefix ? values.familyDocumentType : values.documentType))}
                            onChange={(opt) => setFieldValue(docTypeField, opt?.value)}
                        />
                        <ErrorMessage name={docTypeField} component="div" className="text-xs text-red-500 mt-1" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nr dokumentu tożsamości</label>
                        <Field name={docNumberField} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                        <ErrorMessage name={docNumberField} component="div" className="text-xs text-red-500 mt-1" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kraj wydający dokument</label>
                        <Field name={issuingCountryField} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                        <ErrorMessage name={issuingCountryField} component="div" className="text-xs text-red-500 mt-1" />
                    </div>
                </>
            )}
        </>
    );
};

function getBirthDateFromPesel(pesel: string): string | null {
    if (!/^\d{11}$/.test(pesel)) return null;
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

function isValidPesel(pesel: string): boolean {
    if (!/^\d{11}$/.test(pesel)) return false;
    const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    const sum = pesel.split('').slice(0, 10).reduce((acc, num, idx) => acc + (parseInt(num, 10) * weights[idx]), 0);
    const control = (10 - (sum % 10)) % 10;
    return control === parseInt(pesel[10], 10);
}

const submissionTypes = [{ value: "employee", label: "Pracownik" }, { value: "family", label: "Członek rodziny" },];

const baseValidation = {
    name: Yup.string().required("Imię jest wymagane"),
    surname: Yup.string().required("Nazwisko jest wymagane"),
    gender: Yup.string().required("Płeć jest wymagana"),
    pesel: Yup.string()
        .matches(/^\d{11}$/, "PESEL musi mieć 11 cyfr")
        .test("valid-pesel", "Nieprawidłowy PESEL", v => !v || isValidPesel(v))
        .required("PESEL jest wymagany"),
    email: Yup.string().email("Niepoprawny email").required("Email jest wymagany"),
    phone: Yup.string().required("Telefon jest wymagany"),
    street: Yup.string().required("Ulica jest wymagana"),
    houseNumber: Yup.string().required("Nr domu jest wymagany"),
    zip: Yup.string().required("Kod pocztowy jest wymagany"),
    postOffice: Yup.string().required("Poczta jest wymagana"),
    city: Yup.string().required("Miasto jest wymagane"),
    country: Yup.string().required("Kraj jest wymagany"),
    region: Yup.string().required("Województwo jest wymagane"),
    zgodaDanePrawdziwe: Yup.boolean().oneOf([true], "Zgoda jest wymagana"),
    zgodaPrzetwarzanie: Yup.boolean().oneOf([true], "Zgoda jest wymagana"),
    zgodaZapoznanie: Yup.boolean().oneOf([true], "Zgoda jest wymagana"),
};

const familyValidation = {
    familyName: Yup.string().required("Imię członka rodziny jest wymagane"),
    familySurname: Yup.string().required("Nazwisko członka rodziny jest wymagane"),
    familyGender: Yup.string().required("Płeć członka rodziny jest wymagana"),
    familyPesel: Yup.string().when("familyIdentityMethod", {
        is: "pesel",
        then: schema => schema.matches(/^\d{11}$/, "PESEL musi mieć 11 cyfr").test("valid-pesel", "Nieprawidłowy PESEL", v => !v || isValidPesel(v)).required("PESEL jest wymagany"),
    }),
    familyBirthDate: Yup.string().when("familyIdentityMethod", { is: "birthDoc", then: schema => schema.required("Data urodzenia jest wymagana"), }),
    familyDocumentType: Yup.string().when("familyIdentityMethod", { is: "birthDoc", then: schema => schema.required("Typ dokumentu jest wymagany"), }),
    familyDocNumber: Yup.string().when(["familyIdentityMethod", "familyDocumentType"], {
        is: (idMethod: string) => idMethod === "birthDoc",
        then: schema => schema.required("Nr dokumentu jest wymagany")
            .when("familyDocumentType", {
                is: "dowod",
                then: s => s.matches(/^[A-Z]{3}\d{6}$/, "Format dowodu: 3 litery i 6 cyfr"),
                otherwise: s => s.matches(/^[A-Z]{2}\d{7}$/, "Format paszportu: 2 litery i 7 cyfr")
            })
    }),
    familyIssuingCountry: Yup.string().when("familyIdentityMethod", { is: "birthDoc", then: schema => schema.required("Kraj wydający jest wymagany"), }),
};

const validationSchema = (type: string) => Yup.object().shape({ ...baseValidation, ...(type === "family" ? familyValidation : {}), });

const initialValues = {
    submissionType: "employee",
    name: "",
    surname: "",
    gender: "",
    pesel: "",
    birthDate: "",
    email: "",
    phone: "",
    street: "",
    houseNumber: "",
    flatNumber: "",
    zip: "",
    postOffice: "",
    city: "",
    country: "Polska",
    region: "",
    familyIdentityMethod: "pesel",
    familyName: "",
    familySurname: "",
    familyGender: "",
    familyPesel: "",
    familyBirthDate: "",
    familyDocumentType: "dowod",
    familyDocNumber: "",
    familyIssuingCountry: "Polska",
    zgodaDanePrawdziwe: false,
    zgodaPrzetwarzanie: false,
    zgodaZapoznanie: false,
};


export const AlabForm = () => {
    const [type, setType] = useState<"employee" | "family">("employee");
    const [familyIdentityMethod, setFamilyIdentityMethod] = useState<"pesel" | "birthDoc">("pesel");
    const [areAllConsentsSelected, setAreAllConsentsSelected] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: "", message: "" });


    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-10">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-5xl">
                <h2 className="text-4xl sm:text-3xl font-extrabold text-center mb-8 tracking-tight bg-gradient-to-r from-blue-700 via-sky-500 to-blue-400 bg-clip-text text-transparent select-none">
                    Formularz zgłoszeniowy {type === 'employee' ? 'pracownika' : 'członka rodziny'}
                </h2>

                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema(type)}
                    onSubmit={async (values, { setSubmitting, resetForm }) => {
                        setSubmitting(true);
                        try {
                            const response = await fetch(`${apiUrl}/api/forms`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(values),
                            });

                            if (!response.ok) {
                                throw new Error('Odpowiedź serwera nie była pomyślna.');
                            }

                            setModalContent({ title: "Sukces!", message: "Formularz został pomyślnie wysłany." });
                            resetForm();
                            setType("employee");
                            setFamilyIdentityMethod("pesel");

                        } catch (error) {
                            console.error("Błąd podczas wysyłania formularza:", error);
                            setModalContent({ title: "Błąd", message: "Wystąpił błąd podczas wysyłania formularza. Sprawdź konsolę serwera lub spróbuj ponownie." });
                        } finally {
                            setSubmitting(false);
                            setIsModalOpen(true);
                        }
                    }}
                >
                    {({ setFieldValue, values }) => (
                        <Form>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Typ zgłoszenia</label>
                                <Select
                                    options={submissionTypes}
                                    value={submissionTypes.find(opt => opt.value === type)}
                                    onChange={opt => {
                                        if (opt) { setType(opt.value as "employee" | "family"); setFieldValue("submissionType", opt.value); }
                                    }}
                                />
                            </div>

                            <h3 className="text-lg font-semibold text-blue-600 border-b pb-2 mb-4">Dane pracownika</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Imię</label>
                                    <CapitalizedField name="name" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="name" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko</label>
                                    <CapitalizedField name="surname" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="surname" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Płeć</label>
                                <Select
                                    options={GENDERS}
                                    value={GENDERS.find(opt => opt.value === values.gender)}
                                    onChange={(opt) => setFieldValue("gender", opt?.value)}
                                />
                                <ErrorMessage name="gender" component="div" className="text-xs text-red-500 mt-1" />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">PESEL</label>
                                <Field
                                    name="pesel"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm"
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setFieldValue("pesel", e.target.value);
                                        const date = getBirthDateFromPesel(e.target.value);
                                        if (date) setFieldValue("birthDate", date);
                                    }}
                                    maxLength={11}
                                />
                                <ErrorMessage name="pesel" component="div" className="text-xs text-red-500 mt-1" />
                                <Field type="hidden" name="birthDate" />
                            </div>

                            <h3 className="text-lg font-semibold text-blue-600 border-b pb-2 mb-4 mt-6">Dane kontaktowe i adresowe</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <Field name="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="email" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                    <Field name="phone" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="phone" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ulica</label>
                                    <Field name="street" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="street" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nr domu</label>
                                    <Field name="houseNumber" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="houseNumber" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nr mieszkania</label>
                                    <Field name="flatNumber" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kod pocztowy</label>
                                    <Field name="zip" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="zip" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Poczta</label>
                                    <Field name="postOffice" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="postOffice" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Miasto</label>
                                    <Field name="city" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="city" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Województwo</label>
                                    <Field name="region" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="region" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kraj</label>
                                    <Field name="country" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                    <ErrorMessage name="country" component="div" className="text-xs text-red-500 mt-1" />
                                </div>
                            </div>

                            {type === "family" && (
                                <>
                                    <h3 className="text-lg font-semibold text-blue-600 border-b pb-2 mb-4 mt-6">Dane członka rodziny</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Imię członka rodziny</label>
                                            <CapitalizedField name="familyName" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                            <ErrorMessage name="familyName" component="div" className="text-xs text-red-500 mt-1" />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko członka rodziny</label>
                                            <CapitalizedField name="familySurname" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm" />
                                            <ErrorMessage name="familySurname" component="div" className="text-xs text-red-500 mt-1" />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Płeć członka rodziny</label>
                                        <Select
                                            options={GENDERS}
                                            value={GENDERS.find(opt => opt.value === values.familyGender)}
                                            onChange={(opt) => setFieldValue("familyGender", opt?.value)}
                                        />
                                        <ErrorMessage name="familyGender" component="div" className="text-xs text-red-500 mt-1" />
                                    </div>
                                    <IdentityFields prefix="family" method={familyIdentityMethod} setMethod={setFamilyIdentityMethod} setFieldValue={setFieldValue} values={values} />
                                </>
                            )}

                            <div className="mb-4 mt-8 border-t border-gray-200 pt-4">
                                <h3 className="text-lg font-semibold text-blue-600 pb-2 mb-4">Zgody</h3>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 font-bold">
                                        <input
                                            type="checkbox"
                                            checked={areAllConsentsSelected}
                                            onChange={() => {
                                                const newValue = !areAllConsentsSelected;
                                                setAreAllConsentsSelected(newValue);
                                                setFieldValue("zgodaDanePrawdziwe", newValue);
                                                setFieldValue("zgodaPrzetwarzanie", newValue);
                                                setFieldValue("zgodaZapoznanie", newValue);
                                            }}
                                        />
                                        <span>Zaznacz wszystko</span>
                                    </label>
                                    <hr className="my-2" />
                                    <label className="flex items-center gap-2"><Field type="checkbox" name="zgodaDanePrawdziwe" /><span>Oświadczam, że podane w formularzu dane są zgodne z prawdą.</span></label>
                                    <ErrorMessage name="zgodaDanePrawdziwe" component="div" className="text-xs text-red-500 ml-6" />
                                    <label className="flex items-center gap-2"><Field type="checkbox" name="zgodaPrzetwarzanie" /><span>Wyrażam zgodę na przetwarzanie danych osobowych podanych w formularzu w celu udzielenia zniżki na badania.</span></label>
                                    <ErrorMessage name="zgodaPrzetwarzanie" component="div" className="text-xs text-red-500 ml-6" />
                                    <label className="flex items-center gap-2"><Field type="checkbox" name="zgodaZapoznanie" /><span>Oświadczam, że zapoznałam/em się i akceptuję <a href="/procedura.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">„Procedurę udzielania zniżek na badania diagnostyczne dla pracowników i ich rodzin”</a>.</span></label>
                                    <ErrorMessage name="zgodaZapoznanie" component="div" className="text-xs text-red-500 ml-6" />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white py-3 mt-4 rounded-lg shadow font-semibold hover:bg-blue-700 transition">Wyślij</button>
                        </Form>
                    )}
                </Formik>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalContent.title}
            >
                <p>{modalContent.message}</p>
            </Modal>

        </div>
    );
};