// hash_password.js
import bcrypt from 'bcryptjs'; // Zmieniamy 'require' na 'import'

async function generateHash(password) {
    const hash = await bcrypt.hash(password, 10);
    console.log(hash);
}




generateHash('Diviruse007@');