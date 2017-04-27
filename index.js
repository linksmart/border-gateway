
try {
  // this is used during devolopent and outside docker
  module.exports  = require('../../iot-bgw-aaa-client/main.js')
  console.log('taking local file');
} catch (e){
  module.exports  = require('./main.js')
  console.log('taking remote file');

}
