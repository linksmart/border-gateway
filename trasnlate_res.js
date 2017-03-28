var config = require('./config.json')

const encode = (data)=> new Buffer(data).toString('base64').replace(/=/g,'');

module.exports = (data, req, res)=> {
  // Creating a simple lookup object of the format {host1:name1, host2,name2}
  //this object is used later for quick comparsion
  let avalaible_services = {}
  Object.keys(config.services).forEach((key)=>{
    avalaible_services[config.services[key].local_address]=key
  })
  /// end lookup opbject here
  return (data+"").replace(/(https?|tcp):\/\/([\-\:\_\.\w\d]*)/g,(e,i,j)=> {
    const protocol = i.includes('http')?  "https://":i+"://";
    const local_address = avalaible_services[e]?avalaible_services[e]:encode(e);
    const external_address = config.external_domain
    const external_port = (i.includes('http') && config.external_port == 443)? "" : `:${config.external_port}`

    return config.sub_domain_mode ?
    protocol+local_address+"."+external_address+external_port
    :
    protocol+external_address+external_port+"/"+local_address
})}
