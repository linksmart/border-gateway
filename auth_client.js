const fetch = require('node-fetch')
const config =  require ('./config.json')

module.exports  = async(client_key,method,path)=>{

    const url = `http://${config.auth_server}/user/${client_key}/validate?admin_key=${config.bgw_admin_key}`
    const payload = {
      protocol:"MQTT",
      host:config.broker.address,
      port:config.broker.port,
      method:method,
      path:path
    }

    const options = {
      method:"POST",
      body:JSON.stringify(payload),
    	headers: {'Content-Type': 'application/json' }
    }
    try {
      let result = await fetch(url,options)
      return (await result.json()).status
    } catch (e) {
      console.log('error occoured in getting and parsing  from auth server');
      return false
    }

}
