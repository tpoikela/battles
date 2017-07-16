
const ROT = require('./rot');

ROT.Map.Forest = require('./map.forest');

ROT.Map.Mountain = function(width, height, options) {
    ROT.Map.Forest.call(this, width, height, options);
};
ROT.Map.Mountain.extend(ROT.Map.Forest);

module.exports = ROT.Map.Mountain;

