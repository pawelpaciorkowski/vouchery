// Plik: backend-api/server.js - WERSJA FINALNA Z ZABEZPIECZENIEM TOKENAMI JWT

// --- INICJALIZACJA ---
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Biblioteka do tokenów

const app = express();
const port = process.env.PORT || 3001;

// --- KLUCZE I KONFIGURACJA ---
const ENCRYPTION_KEY = process.env.FORM_ENCRYPTION_KEY;
const JWT_SECRET = process.env.JWT_SECRET; // Nowy sekret dla tokenów
if (!ENCRYPTION_KEY || !JWT_SECRET) {
    throw new Error("Klucze FORM_ENCRYPTION_KEY i JWT_SECRET muszą być zdefiniowane w pliku .env");
}

const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: process.env.DATABASE_PORT || 3306,
});

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- NOWY MIDDLEWARE DO WERYFIKACJI TOKENU ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Oczekujemy formatu "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ message: 'Brak autoryzacji - token nie został dostarczony.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Brak dostępu - token jest nieprawidłowy lub nieważny.' });
        }
        req.user = user; // Zapisujemy dane z tokenu (np. id, rola) w obiekcie zapytania
        next(); // Przechodzimy dalej
    });
};


// --- ENDPOINTY API ---

// Endpoint do zapisu formularza (publiczny, nie wymaga tokenu)
// Zmień ten endpoint w pliku server.js
app.post('/api/forms', async (req, res) => {
    try {
        const formData = req.body;
        // Szyfrujemy cały obiekt formData, bez wyciągania z niego pól
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(formData), ENCRYPTION_KEY).toString();

        // Zapisujemy tylko zaszyfrowany blok danych
        const query = `INSERT INTO form_submissions (encrypted_data) VALUES (?)`;
        const [result] = await pool.query(query, [encryptedData]);

        res.status(201).json({ message: 'Formularz zapisany!', insertedId: result.insertId });
    } catch (error) {
        console.error('Błąd przy zapisie do bazy:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});


// Endpoint logowania (publiczny, bo tutaj generujemy token)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane.' });
    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        const [rows] = await pool.query(query, [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Błędne dane logowania.' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Błędne dane logowania.' });

        const userPayload = { id: user.id, username: user.username, role: user.role };
        const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Logowanie pomyślne!', token: accessToken, role: user.role });
    } catch (error) {
        console.error('Błąd logowania:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});


// --- ENDPOINTY CHRONIONE (wymagają tokenu) ---

app.get('/api/forms', authenticateToken, async (req, res) => {
    try {
        // Pobieramy tylko ID, zaszyfrowane dane i datę
        const query = 'SELECT id, encrypted_data, created_at FROM form_submissions ORDER BY created_at DESC';
        const [rows] = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu danych:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});

// Pobieranie listy użytkowników - teraz wymaga tokenu
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Brak uprawnień.' });
    try {
        const query = 'SELECT id, username, role FROM users ORDER BY id';
        const [users] = await pool.query(query);
        res.status(200).json(users);
    } catch (error) {
        console.error('Błąd przy pobieraniu listy użytkowników:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});

// Tworzenie nowego użytkownika - teraz wymaga tokenu
app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Brak uprawnień.' });
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane.' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
        await pool.query(query, [username, hashedPassword, 'admin']);
        res.status(201).json({ message: `Użytkownik ${username} został pomyślnie utworzony.` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Użytkownik o tej nazwie już istnieje.' });
        console.error('Błąd przy tworzeniu użytkownika:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});

// Usuwanie użytkownika - teraz wymaga tokenu
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Brak uprawnień.' });
    const userIdToDelete = parseInt(req.params.id, 10);
    if (isNaN(userIdToDelete)) return res.status(400).json({ message: 'Nieprawidłowe ID użytkownika.' });
    if (userIdToDelete === req.user.id || userIdToDelete === 1) return res.status(403).json({ message: 'Nie można usunąć samego siebie lub głównego superadministratora.' });
    try {
        const query = 'DELETE FROM users WHERE id = ?';
        const [result] = await pool.query(query, [userIdToDelete]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Nie znaleziono użytkownika o podanym ID.' });
        res.status(200).json({ message: 'Użytkownik został pomyślnie usunięty.' });
    } catch (error) {
        console.error(`Błąd przy usuwaniu użytkownika o ID ${userIdToDelete}:`, error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});


// --- URUCHOMIENIE SERWERA ---
app.listen(port, () => {
    console.log(`Serwer API działa na http://localhost:${port}`);
});