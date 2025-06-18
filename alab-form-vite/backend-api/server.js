// backend-api/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const CryptoJS = require('crypto-js'); // Import biblioteki do szyfrowania

const app = express();
const port = process.env.PORT || 3001;

// Klucz do szyfrowania danych z pliku .env
const ENCRYPTION_KEY = process.env.FORM_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
    throw new Error("Klucz 'FORM_ENCRYPTION_KEY' nie jest zdefiniowany w pliku .env");
}

// Konfiguracja połączenia z bazą danych (bez zmian)
const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: process.env.DATABASE_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use(cors());
app.use(express.json());


// --- NOWA LOGIKA ENDPOINTU POST ---
app.post('/api/forms', async (req, res) => {
    try {
        const formData = req.body;

        // Kopiujemy obiekt, aby go nie modyfikować
        const dataToEncrypt = { ...formData };

        // Usuwamy pola, które będą w oddzielnych kolumnach, aby ich nie duplikować w zaszyfrowanych danych
        delete dataToEncrypt.name;
        delete dataToEncrypt.surname; // Zakładam, że A1_name to imię i nazwisko
        delete dataToEncrypt.email;
        delete dataToEncrypt.phone;
        delete dataToEncrypt.pesel;

        // Szyfrujemy resztę danych
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(dataToEncrypt), ENCRYPTION_KEY).toString();

        // Zapytanie SQL dopasowane do nowej tabeli 'form_submissions'
        const query = `
            INSERT INTO form_submissions (pesel, A1_name, A2_email, A3_phone, A4_encrypted_data) 
            VALUES (?, ?, ?, ?, ?)
        `;

        // Zbieramy wartości do zapytania
        const values = [
            formData.pesel,
            `${formData.name} ${formData.surname}`, // Łączymy imię i nazwisko do kolumny A1_name
            formData.email,
            formData.phone,
            encryptedData // Zaszyfrowane pozostałe dane
        ];

        const [result] = await pool.query(query, values);

        res.status(201).json({ message: 'Formularz zapisany!', insertedId: result.insertId });
    } catch (error) {
        console.error('Błąd przy zapisie do bazy:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});


// --- NOWA LOGIKA ENDPOINTU GET ---
app.get('/api/forms', async (req, res) => {
    try {
        // Zapytanie wybierające dane z tabeli 'form_submissions'
        const query = 'SELECT * FROM form_submissions ORDER BY created_at DESC';
        const [rows] = await pool.query(query);

        // Odszyfrowujemy i składamy dane z powrotem w jeden obiekt
        const forms = rows.map(row => {
            // Deszyfrujemy dane z kolumny A4_encrypted_data
            const bytes = CryptoJS.AES.decrypt(row.A4_encrypted_data, ENCRYPTION_KEY);
            const decryptedDataString = bytes.toString(CryptoJS.enc.Utf8);
            const decryptedData = JSON.parse(decryptedDataString);

            // Dzielimy A1_name z powrotem na imię i nazwisko (proste założenie)
            const [name, ...surnameParts] = (row.A1_name || "").split(" ");
            const surname = surnameParts.join(" ");

            // Składamy pełny obiekt, jakiego oczekuje frontend
            return {
                ...decryptedData, // Odszyfrowane dane (np. adres, zgody, dane rodziny)
                id: row.id,
                pesel: row.pesel,
                name: name,
                surname: surname,
                email: row.A2_email,
                phone: row.A3_phone,
                createdAt: row.created_at,
            };
        });

        res.status(200).json(forms);
    } catch (error) {
        console.error('Błąd przy pobieraniu danych:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});


app.listen(port, () => {
    console.log(`Serwer API działa na http://localhost:${port}`);
});