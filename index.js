const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_FILE_PATH = path.join(__dirname, 'name-data.txt');
const HTML_FILE_PATH = path.join(__dirname, 'index.html');

const app = express();
app.use(express.json());

app.get('/name-data', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).send({ message: 'Name parameter is required' });
  }

  let nameData;

  try {
    const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    const lines = data.split('\n');
    lines.forEach(line => {
      const [lineName, gender, age, country] = line.split(',');
      if (lineName === name) {
        nameData = { name: lineName, gender, age, country };
      }
    });
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(err);
    }
  }

  if (!nameData) {
    try {
      const genderPromise = axios.get(`https://api.genderize.io/?name=${name}`);
      const agePromise = axios.get(`https://api.agify.io/?name=${name}`);
      const countryPromise = axios.get(`https://api.nationalize.io/?name=${name}`);

      const [genderResponse, ageResponse, countryResponse] = await Promise.all([
        genderPromise,
        agePromise,
        countryPromise,
      ]);

      const gender = genderResponse.data.gender;
      const age = ageResponse.data.age;
      const country = countryResponse.data.country[0]?.country_id;

      nameData = { name, gender, age, country };

      const line = `${nameData.name},${nameData.gender},${nameData.age},${nameData.country}\n`;
      fs.appendFileSync(DATA_FILE_PATH, line);
    } catch (err) {
      console.error(err);
      return res.status(500).send({ message: 'Failed to retrieve name data' });
    }
  }

  return res.send(nameData);
});



app.get('/statistics', (req, res) => {
    const stats = { gender: {}, age: {} };
    const genderCounts = { male: 0, female: 0 };
    const ageCounts = { 'Younger than 18': 0, '18-65': 0, 'Older than 60': 0 };
  
    try {
      const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
      const lines = data.split('\n');
      const total = lines.length - 1; // subtract 1 for the last empty line
  
      lines.forEach(line => {
        const [_, gender, age, country] = line.split(',');
  
        stats.gender[gender] = (stats.gender[gender] || 0) + 1;
        if (gender === 'male') {
          genderCounts.male++;
        } else if (gender === 'female') {
          genderCounts.female++;
        }
  
        if (age < 18) {
          stats.age['Younger than 18'] = (stats.age['Younger than 18'] || 0) + 1;
          ageCounts['Younger than 18']++;
        } else if (age <= 65) {
          stats.age['18-65'] = (stats.age['18-65'] || 0) + 1;
          ageCounts['18-65']++;
        } else {
          stats.age['Older than 60'] = (stats.age['Older than 60'] || 0) + 1;
          ageCounts['Older than 60']++;
        }
      });
  
      res.send({ gender: stats.gender, age: stats.age, genderCounts, ageCounts });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: 'Failed to retrieve statistics' });
    }
  });
  




app.get('/numbers', (req, res) => {
try {
  const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
  const lines = data.split('\n');
  const count = lines.length - 1;
  res.send({ count });
} catch (err) {
  console.error(err);
  res.status(500).send({ message: 'Failed to retrieve count' });
}
});

app.get('/', (req, res) => {
    res.sendFile(HTML_FILE_PATH);
  });

app.listen(3000, () => {
console.log('API is running on port 3000');
});