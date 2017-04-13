
let config = false ;

module.exports = ()=> {
  if(!config){
    console.log(`BGW: Fatael Error you must init the auth clinet in your entery index.js file e.g. require('iot-bgw-auth-client').init(config)`);
    process.exit(1);
  }
  
  return config
}

module.exports.setConfig = (c)=> (config=c)
