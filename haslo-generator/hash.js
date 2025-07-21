const bcrypt = require('bcrypt');

const plainPassword = 'moje-super-haslo';
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds)
    .then(hash => {
        console.log("Hasło:", plainPassword);
        console.log("Hash bcrypt:", hash);
    })
    .catch(err => console.error("Błąd podczas generowania hasha:", err));
