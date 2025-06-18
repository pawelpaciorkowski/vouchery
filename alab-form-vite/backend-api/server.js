// backend-api/server.js - WERSJA KOMPLETNA I POPRAWNA

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs'); // Upewnij się, że ten import jest na górze pliku

const app = express();
const port = process.env.PORT || 3001;

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

// --- ENDPOINT DO ZAPISYWANIA FORMULARZA (POPRAWIONY) ---
app.post('/api/forms', async (req, res) => {
    try {
        const formData = req.body;
        // W tej funkcji nie używamy 'password'. Oddzielamy tylko pola, które mają być jawne.
        const { name, surname, pesel, ...dataToEncrypt } = formData;

        // Szyfrujemy resztę danych
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(dataToEncrypt), ENCRYPTION_KEY).toString();

        // Zapisujemy do bazy
        const query = `
            INSERT INTO form_submissions (name, surname, pesel, encrypted_data) 
            VALUES (?, ?, ?, ?)
        `;
        const values = [name, surname, pesel, encryptedData];
        const [result] = await pool.query(query, values);

        res.status(201).json({ message: 'Formularz zapisany!', insertedId: result.insertId });
    } catch (error) {
        // Zmieniono nazwę zmiennej 'password' na 'error', aby uniknąć konfliktów
        console.error('Błąd przy zapisie do bazy:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});

// --- ENDPOINT DO LOGOWANIA (ZAKTUALIZOWANY O ZWRACANIE ROLI) ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane.' });
    }
    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        const [rows] = await pool.query(query, [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Błędne dane logowania.' });
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Błędne dane logowania.' });
        }
        // ZMIANA TUTAJ: Wysyłamy rolę użytkownika do frontendu
        res.status(200).json({ message: 'Logowanie pomyślne!', role: user.role });
    } catch (error) {
        console.error('Błąd logowania:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});


// --- ENDPOINT DO POBIERANIA DANYCH DLA ADMINA ---
app.get('/api/forms', async (req, res) => {
    try {
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

// --- NOWY ENDPOINT DO TWORZENIA UŻYTKOWNIKÓW (DLA SUPERADMINA) ---
app.post('/api/users', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane.' });
    }
    try {
        // Hashowanie hasła nowego użytkownika
        const hashedPassword = await bcrypt.hash(password, 10);

        // Domyślnie każdy nowy użytkownik dostaje rolę 'admin'
        const query = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
        await pool.query(query, [username, hashedPassword, 'admin']);

        res.status(201).json({ message: `Użytkownik ${username} został pomyślnie utworzony.` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Użytkownik o tej nazwie już istnieje.' });
        }
        console.error('Błąd przy tworzeniu użytkownika:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});