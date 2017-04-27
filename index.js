
try {
  module.exports  = require('../../iot-bgw-auth-client/main.js')
} catch (e){
  module.exports  = require('./main.js')
}
