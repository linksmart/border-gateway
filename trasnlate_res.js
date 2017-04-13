const  config = require('./config.json')
const url = require("url");
const domainMatch = require('domain-match');


const bs36 = require('base-x')('0123456789abcdefghijklmnopqrstuvwxyz')

const check_domain = /(https?|tcp|mqtt):\/\/([\-\:\_\.\w\d]*)/g


const encode = (data)=> config.sub_domain_mode?bs36.encode(new Buffer(data)): new Buffer(data).toString('base64').replace(/=/g,'');
const decode = (data)=> {
  const domain = config.sub_domain_mode?bs36.decode(data).toString('ascii'): new Buffer(data, 'base64').toString('ascii');
  let {protocol,host,port} = url.parse(domain);
  port = port?port:(protocol=="https:"?443:80)
  return (protocol && host && port)? domain : false
}


// Creating a simple lookup object of the format {host1:name1, host2,name2}
//this object is used later for quick comparsion
let aliases = {}
Object.keys(config.aliases).forEach((key)=> aliases[config.aliases[key].local_address]=key)
/// end lookup opbject here

const transformURI = (data, req, res)=>
  (data+"").replace(check_domain,(e,i,j)=> {

    // you can make whitelist faster by cashing it in an object
    const whitelist = config.aliases[req.bgw.alias].translate_local_addresses.whitelist
    if( whitelist && whitelist.find(d=>domainMatch(d,e))){
      return e
    }
    // end checking whitlist
    const protocol = i.includes('http')?  "https://":i+"://";
    const local_address = aliases[e]?aliases[e]:encode(e);
    const external_address = config.external_domain
    const external_port = (i.includes('http') && config.external_port == 443)? "" : `:${config.external_port}`

    return config.sub_domain_mode ?
    protocol+local_address+"."+external_address+external_port
    :
    protocol+external_address+external_port+"/"+local_address
})


module.exports = {encode,decode,transformURI}
