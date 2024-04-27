const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const port = 3000;
const path = require('path');
const cors = require('cors');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());

async function openDb() {
    return open({
        filename: 'bmi.db',
        driver: sqlite3.Database
    });
}

const dbPromise = openDb();

async function initializeDb() {
    const db = await dbPromise;
    
    await db.exec('CREATE TABLE IF NOT EXISTS bmi_entries (id INTEGER PRIMARY KEY, name TEXT, height REAL, weight REAL, bmi REAL, status TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)');
}

initializeDb();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/calculateBMI', async (req, res) => {
    const { name, height, weight } = req.body;
    
    const bmi = weight / (height * height);
    let status = '';
    let message = '';

    if (bmi < 18.5) {
        status = 'Underweight';
        message = 'You should eat a little bit more';
    } else if (bmi < 25) {
        status = 'Normal';
        message = 'Keep doing what you are doing';
    } else if (bmi < 30) {
        status = 'Overweight';
        message = 'You should cut down on your food a little bit';
    } else {
        status = 'Obese';
        message = 'You should really do something about your appetite ASAP';
    }

    const db = await dbPromise;

    const existingEntry = await db.get('SELECT id FROM bmi_entries WHERE name = ?', [name]);

    if (existingEntry) {
        await db.run('UPDATE bmi_entries SET height = ?, weight = ?, bmi = ?, status = ?, message = ? WHERE id = ?', [height, weight, bmi, status, message, existingEntry.id]);
    } else {
        await db.run('INSERT INTO bmi_entries (name, height, weight, bmi, status, message) VALUES (?, ?, ?, ?, ?, ?)', [name, height, weight, bmi, status, message]);
    }

    await db.run('INSERT INTO bmi_entries (height, weight, bmi, status, message) VALUES (?, ?, ?, ?, ?)', [height, weight, bmi, status, message]);

    res.send(`Hello ${name}, your BMI is ${bmi}. Status: ${status}. ${message}`);
});

app.get('/bmiHistory', async (req, res) => {
    const db = await dbPromise;
    const entries = await db.all('SELECT * FROM bmi_entries ORDER BY timestamp DESC');
    res.json(entries);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
