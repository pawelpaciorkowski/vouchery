// backend-api/server.js - WERSJA Z SZYFROWANIEM DANYCH

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const CryptoJS = require('crypto-js');

const app = express();
const port = process.env.PORT || 3001;

// Klucz do szyfrowania pobierany z pliku .env na backendzie
const ENCRYPTION_KEY = process.env.FORM_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
    throw new Error("Klucz 'FORM_ENCRYPTION_KEY' nie jest zdefiniowany w pliku .env");
}

const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: process.env.DATABASE_PORT || 3306,
});

app.use(cors());
app.use(express.json());

// Endpoint do ZAPISU i SZYFROWANIA formularza
app.post('/api/forms', async (req, res) => {
    try {
        const formData = req.body;
        // 1. Oddzielamy dane, które mają pozostać jawne w bazie danych
        const { name, surname, pesel, ...dataToEncrypt } = formData;

        // 2. Szyfrujemy całą resztę danych
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(dataToEncrypt), ENCRYPTION_KEY).toString();

        // 3. Zapisujemy dane jawne i zaszyfrowany blok do nowej tabeli
        const query = `
            INSERT INTO form_submissions (name, surname, pesel, encrypted_data) 
            VALUES (?, ?, ?, ?)
        `;
        const values = [name, surname, pesel, encryptedData];
        const [result] = await pool.query(query, values);

        res.status(201).json({ message: 'Formularz zapisany!', insertedId: result.insertId });
    } catch (error) {
        console.error('Błąd przy zapisie do bazy:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});

// Endpoint do POBIERANIA danych (jawnych + zaszyfrowanych)
app.get('/api/forms', async (req, res) => {
    try {
        // Wysyłamy dane bez ich rozszyfrowywania na serwerze
        const query = 'SELECT id, name, surname, pesel, encrypted_data, created_at FROM form_submissions ORDER BY created_at DESC';
        const [rows] = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu danych:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});

app.listen(port, () => {
    console.log(`Serwer API działa na http://localhost:${port}`);
});