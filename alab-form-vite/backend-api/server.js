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

app.post('/api/forms', async (req, res) => {
    try {
        const formData = req.body;
        const { name, surname, pesel, ...dataToEncrypt } = formData;

        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(dataToEncrypt), ENCRYPTION_KEY).toString();

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

app.post('/api/users', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

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

app.get('/api/users', async (req, res) => {
    try {
        const query = 'SELECT id, username, role FROM users ORDER BY id';
        const [users] = await pool.query(query);
        res.status(200).json(users);
    } catch (error) {
        console.error('Błąd przy pobieraniu listy użytkowników:', error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});


app.delete('/api/users/:id', async (req, res) => {
    // Pobieramy ID użytkownika z parametrów URL
    const { id } = req.params;

    // Konwertujemy ID na liczbę
    const userIdToDelete = parseInt(id, 10);

    if (isNaN(userIdToDelete)) {
        return res.status(400).json({ message: 'Nieprawidłowe ID użytkownika.' });
    }

    try {
        // Zabezpieczenie: Sprawdź, czy użytkownik nie próbuje usunąć samego siebie
        // W bardziej złożonej aplikacji sprawdzalibyśmy ID zalogowanego użytkownika z tokenu JWT
        // Tutaj dla uproszczenia, jeśli ID do usunięcia odpowiada np. ID superadmina (załóżmy, że to 1), odrzucamy.
        // Możesz dostosować tę logikę.
        if (userIdToDelete === 1) { // Załóżmy, że superadmin ma zawsze ID = 1
            return res.status(403).json({ message: 'Nie można usunąć głównego superadministratora.' });
        }

        const query = 'DELETE FROM users WHERE id = ?';
        const [result] = await pool.query(query, [userIdToDelete]);

        // Sprawdzamy, czy jakikolwiek wiersz został usunięty
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika o podanym ID.' });
        }

        res.status(200).json({ message: 'Użytkownik został pomyślnie usunięty.' });

    } catch (error) {
        console.error(`Błąd przy usuwaniu użytkownika o ID ${id}:`, error);
        res.status(500).json({ message: 'Wystąpił błąd serwera.' });
    }
});