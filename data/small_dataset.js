// create small_dataset.js and run once locally
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('airbnb_with_photos.json', 'utf8'));
const small = data.slice(0, 100);
fs.writeFileSync('airbnb_small.json', JSON.stringify(small, null, 2));

console.log('Created small dataset with 100 records');
