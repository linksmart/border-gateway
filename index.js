
try {
  // this is used during devolopent and outside docker
  module.exports  = require('../../iot-bgw-aaa-client/main.js')
} catch (e){
  module.exports  = require('./main.js')
}
