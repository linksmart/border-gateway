const config = require('./config');
const url = require("url");
const domainMatch = require('domain-match');
const bs36 = require('base-x')('0123456789abcdefghijklmnopqrstuvwxyz');

const check_domain = /(https?|tcp|ssl|mqtt):\/\/([\-\:\_\.\w\d]*)/g;

const encode = (data) => config.sub_domain_mode ? bs36.encode(Buffer.from(data)) : Buffer.from(data).toString('base64').replace(/=/g, '');
const decode = (data) => {
    const domain = config.sub_domain_mode ? bs36.decode(data).toString('utf8') : Buffer.from(data, 'base64').toString('utf8');
    let {protocol, host, port} = url.parse(domain);
    port = port ? port : (protocol === "https:" ? 443 : 80);
    return (protocol && host && port) ? domain : false;
};

const transformURI = (data, req, res) =>
    (data + "").replace(check_domain, (e, i, j) => {

        let aliases = {};
        Object.keys(config.domains[req.hostname]).forEach((key) => aliases[config.domains[req.hostname][key].local_address] = key);
        const whitelist = req.bgw.alias.translate_local_addresses.whitelist;

        for (let property in config.domains) {
            if (config.domains.hasOwnProperty(property)) {

                if (e.includes(property)) {
                    return e
                }

                if (i.includes('http')) {

                    if ((whitelist && whitelist.find(d => domainMatch(d, e)))) {
                        return e;
                    }
                }
                else {
                    if (whitelist) {
                        for (let k = 0; k < whitelist.length; k++) {
                            if (e.includes(whitelist[k])) {
                                return e;
                            }
                        }
                    }
                }
            }
        }

        const protocol = (i.includes('http') && !config.disable_ei) ? "https://" : i + "://";
        const local_address = aliases[e] ? aliases[e] : encode(e);
        const external_address = req.bgw.alias.target_domain || req.hostname;
        return protocol + external_address + "/" + local_address;
    })
;

module.exports = {decode, transformURI};
