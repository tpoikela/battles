

const LZString = require('lz-string');

const data = 'dsadbasd dsfafa sf adsf  12214124 adsadfasf ';
console.log('Data is ', data);

console.log('data length is ', data.length);

const dataCompr = LZString.compress(data);
console.log('AFTER data length is ', dataCompr.length);


const newData = LZString.decompress(dataCompr);
console.log('New data length is ', newData.length);
console.log('New data is ', newData);
