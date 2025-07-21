// Plik: backend-api/server.js - WERSJA FINALNA Z ZABEZPIECZENIEM TOKENAMI JWT i logowaniem debug

// --- INICJALIZACJA ---
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Biblioteka do tokenów
const axios = require('axios'); // Do weryfikacji reCAPTCHA
const debug = require('debug');

// Inicjalizacja logerów debug
const logServer = debug('app:server');
const logDb = debug('app:db');
const logError = debug('app:error');
const logAuth = debug('app:auth');
const logApi = debug('app:api');


const app = express();
const port = process.env.PORT || 3001;

logServer('Aplikacja startuje...');

// --- KLUCZE I KONFIGURACJA ---
const ENCRYPTION_KEY = process.env.FORM_ENCRYPTION_KEY;
const JWT_SECRET = process.env.JWT_SECRET; // Nowy sekret dla tokenów
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY; // Klucz reCAPTCHA

if (!ENCRYPTION_KEY || !JWT_SECRET || !RECAPTCHA_SECRET_KEY) {
    logError("Krytyczny błąd: Brak kluczy w .env. Kończę pracę.");
    throw new Error("Klucze FORM_ENCRYPTION_KEY, JWT_SECRET i RECAPTCHA_SECRET_KEY muszą być zdefiniowane w pliku .env");
}
logServer('Klucze konfiguracyjne wczytane pomyślnie.');


const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: process.env.DATABASE_PORT || 3306,
});
logDb('Pula połączeń z bazą danych utworzona.');


// --- MIDDLEWARES ---
app.use(express.json());
app.use(cors({
    origin: "*",
}));

// Middleware do logowania każdego zapytania
app.use((req, res, next) => {
    logApi('Otrzymano zapytanie: %s %s', req.method, req.url);
    next();
});


// --- NOWY MIDDLEWARE DO WERYFIKACJI TOKENU ---
const authenticateToken = (req, res, next) => {
    logAuth('Próba autoryzacji tokenu...');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Oczekujemy formatu "Bearer TOKEN"

    if (token == null) {
        logAuth('Autoryzacja nieudana: Brak tokenu.');
        return res.status(401).json({ message: 'Brak autoryzacji - token nie został dostarczony.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logAuth('Autoryzacja nieudana: Token nieprawidłowy lub nieważny. Błąd: %o', err);
            return res.status(403).json({ message: 'Brak dostępu - token jest nieprawidłowy lub nieważny.' });
        }
        req.user = user; // Zapisujemy dane z tokenu (np. id, rola) w obiekcie zapytania
        logAuth('Autoryzacja pomyślna dla użytkownika: %o', user);
        next(); // Przechodzimy dalej
    });
};


// --- ENDPOINTY API ---

// Endpoint do zapisu formularza (publiczny, nie wymaga tokenu)
app.post('/api/forms', async (req, res) => {
    logApi('POST /api/forms - próba zapisu nowego formularza.');

    try {
        const { recaptcha, ...formData } = req.body;

        // 🔒 --- WYŁĄCZONA WALIDACJA RECAPTCHA (tryb testowy) ---
        logApi('🧪 TRYB TESTOWY: Pomijamy weryfikację reCAPTCHA.');

        /*
        // --- WŁAŚCIWA WALIDACJA (ZAKOMENTOWANA) ---
        if (!recaptcha) {
            logApi('Zapis formularza odrzucony: Brak tokenu reCAPTCHA.');
            return res.status(400).json({ message: 'Weryfikacja reCAPTCHA jest wymagana.' });
        }

        logApi('Weryfikacja reCAPTCHA...');
        const recaptchaRes = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            new URLSearchParams({
                secret: RECAPTCHA_SECRET_KEY,
                response: recaptcha
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (!recaptchaRes.data.success) {
            logApi('Weryfikacja reCAPTCHA nie powiodła się. Kody błędów: %o', recaptchaRes.data['error-codes']);
            return res.status(400).json({
                message: 'Weryfikacja reCAPTCHA nie powiodła się.',
                'error-codes': recaptchaRes.data['error-codes'],
            });
        }

        logApi('Weryfikacja reCAPTCHA pomyślna.');
        */

        // --- Szyfrowanie i zapis danych ---
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(formData), ENCRYPTION_KEY).toString();
        logDb('Dane formularza zaszyfrowane.');

        const query = `INSERT INTO form_submissions (encrypted_data) VALUES (?)`;
        logDb('Wykonywanie zapytania do bazy: %s', query);
        const [result] = await pool.query(query, [encryptedData]);
        logDb('Formularz zapisany w bazie, ID: %s', result.insertId);

        res.status(201).json({ message: 'Formularz zapisany!', insertedId: result.insertId });
    } catch (error) {
        logError('Błąd przy zapisie do bazy: %o', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});



// Endpoint logowania (publiczny, bo tutaj generujemy token)
app.post('/login', async (req, res) => {
    logAuth('Otrzymano zapytanie do /login. Ciało zapytania: %o', req.body);
    const { username, password } = req.body;
    logAuth('Próba logowania dla użytkownika: %s', username);
    if (!username || !password) {
        logAuth('Logowanie odrzucone: Brak nazwy użytkownika lub hasła.');
        return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane.' });
    }
    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        logDb('Wykonywanie zapytania do bazy: %s', query);
        const [rows] = await pool.query(query, [username]);
        if (rows.length === 0) {
            logAuth('Logowanie nieudane: Nie znaleziono użytkownika %s', username);
            return res.status(401).json({ message: 'Błędne dane logowania.' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            logAuth('Logowanie nieudane: Błędne hasło dla użytkownika %s', username);
            return res.status(401).json({ message: 'Błędne dane logowania.' });
        }

        const userPayload = { id: user.id, username: user.username, role: user.role };
        const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });
        logAuth('Logowanie pomyślne. Wygenerowano token dla użytkownika: %o', userPayload);

        res.status(200).json({ message: 'Logowanie pomyślne!', token: accessToken, role: user.role });
    } catch (error) {
        logError('Błąd logowania: %o', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});


// --- ENDPOINTY CHRONIONE (wymagają tokenu) ---

app.get('/api/forms', authenticateToken, async (req, res) => {
    logApi('GET /api/forms - pobieranie wszystkich zgłoszeń (chronione).');
    try {
        // Pobieramy tylko ID, zaszyfrowane dane i datę
        const query = 'SELECT id, encrypted_data, created_at FROM form_submissions ORDER BY created_at DESC';
        logDb('Wykonywanie zapytania do bazy: %s', query);
        const [rows] = await pool.query(query);
        logDb('Pobrano %d zgłoszeń z bazy.', rows.length);
        res.status(200).json(rows);
    } catch (error) {
        logError('Błąd przy pobieraniu danych: %o', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera' });
    }
});

// Pobieranie listy użytkowników - teraz wymaga tokenu
app.get('/api/users', authenticateToken, async (req, res) => {
    logApi('GET /api/users - pobieranie listy użytkowników (chronione).');
    if (req.user.role !== 'superadmin') {
        logAuth('Odmowa dostępu do /api/users dla użytkownika %s (rola: %s)', req.user.username, req.user.role);
        return res.status(403).json({ message: 'Brak uprawnień.' });
    }
    try {
        const query = 'SELECT id, username, role FROM users ORDER BY id';
        logDb('Wykonywanie zapytania do bazy: %s', query);
        const [users] = await pool.query(query);
        logDb('Pobrano %d użytkowników z bazy.', users.length);
        res.status(200).json(users);
    } catch (error) {
        logError('Błąd przy pobieraniu listy użytkowników: %o', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});

// Tworzenie nowego użytkownika - teraz wymaga tokenu
app.post('/api/users', authenticateToken, async (req, res) => {
    logApi('POST /api/users - tworzenie nowego użytkownika (chronione).');
    if (req.user.role !== 'superadmin') {
        logAuth('Odmowa dostępu do POST /api/users dla użytkownika %s (rola: %s)', req.user.username, req.user.role);
        return res.status(403).json({ message: 'Brak uprawnień.' });
    }
    const { username, password } = req.body;
    if (!username || !password) {
        logApi('Tworzenie użytkownika odrzucone: Brak nazwy użytkownika lub hasła.');
        return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
        logDb('Wykonywanie zapytania do bazy: %s', query);
        await pool.query(query, [username, hashedPassword, 'admin']);
        logDb('Utworzono nowego użytkownika: %s', username);
        res.status(201).json({ message: `Użytkownik ${username} został pomyślnie utworzony.` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            logDb('Nie udało się utworzyć użytkownika - nazwa %s już istnieje.', username);
            return res.status(409).json({ message: 'Użytkownik o tej nazwie już istnieje.' });
        }
        logError('Błąd przy tworzeniu użytkownika: %o', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});

// Usuwanie użytkownika - teraz wymaga tokenu
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    const userIdToDelete = parseInt(req.params.id, 10);
    logApi('DELETE /api/users/%d - usuwanie użytkownika (chronione).', userIdToDelete);

    if (req.user.role !== 'superadmin') {
        logAuth('Odmowa dostępu do DELETE /api/users dla użytkownika %s (rola: %s)', req.user.username, req.user.role);
        return res.status(403).json({ message: 'Brak uprawnień.' });
    }
    if (isNaN(userIdToDelete)) {
        logApi('Usuwanie użytkownika odrzucone: Nieprawidłowe ID.');
        return res.status(400).json({ message: 'Nieprawidłowe ID użytkownika.' });
    }
    if (userIdToDelete === req.user.id || userIdToDelete === 1) {
        logAuth('Odmowa usunięcia użytkownika %d przez %s - próba usunięcia samego siebie lub superadmina.', userIdToDelete, req.user.username);
        return res.status(403).json({ message: 'Nie można usunąć samego siebie lub głównego superadministratora.' });
    }
    try {
        const query = 'DELETE FROM users WHERE id = ?';
        logDb('Wykonywanie zapytania do bazy: %s', query);
        const [result] = await pool.query(query, [userIdToDelete]);
        if (result.affectedRows === 0) {
            logDb('Nie znaleziono użytkownika o ID %d do usunięcia.', userIdToDelete);
            return res.status(404).json({ message: 'Nie znaleziono użytkownika o podanym ID.' });
        }
        logDb('Pomyślnie usunięto użytkownika o ID %d.', userIdToDelete);
        res.status(200).json({ message: 'Użytkownik został pomyślnie usunięty.' });
    } catch (error) {
        logError(`Błąd przy usuwaniu użytkownika o ID ${userIdToDelete}: %o`, error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});


// --- URUCHOMIENIE SERWERA ---
const https = require('https');
const fs = require('fs');
const path = require('path');

try {
    logServer('Próba wczytania certyfikatów SSL...');
    const key = fs.readFileSync(path.join(__dirname, 'certs', 'key.pem'));
    const cert = fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'));
    logServer('Certyfikaty SSL wczytane pomyślnie.');

    https.createServer({ key, cert }, app).listen(port, '0.0.0.0', () => {
        logServer(`✅ Serwer API (HTTPS) działa i nasłuchuje na https://0.0.0.0:${port}`);
    });
} catch (err) {
    logError('Nie udało się uruchomić serwera HTTPS. Sprawdź, czy pliki certs/key.pem i certs/cert.pem istnieją. Błąd: %o', err);
    logServer('Uruchamianie serwera na HTTP jako fallback...');
    app.listen(port, '0.0.0.0', () => {
        logServer(`✅ Serwer API (HTTP - FALLBACK) działa na http://0.0.0.0:${port}`);
    });
}


// --- OBSŁUGA BŁĘDÓW ---
process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logError('Uncaught Exception thrown:', error);
    process.exit(1);
});