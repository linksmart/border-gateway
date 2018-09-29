const config = require('./config');
const url = require("url");
const domainMatch = require('domain-match');
const {httpAuth, AAA, CAT, debug} = require('../bgw-aaa-client');
const bs36 = require('base-x')('0123456789abcdefghijklmnopqrstuvwxyz');

const check_domain = /(https?|tcp|ssl|mqtt):\/\/([\-\:\_\.\w\d]*)/g;

const encode = (data) => config.sub_domain_mode ? bs36.encode(new Buffer(data)) : new Buffer(data).toString('base64').replace(/=/g, '');
const decode = (data) => {
    const domain = config.sub_domain_mode ? bs36.decode(data).toString('ascii') : new Buffer(data, 'base64').toString('ascii');
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
                if (e.includes(property) || (whitelist && whitelist.find(d => domainMatch(d, e)))) {
                    return e;
                }
            }
        }

        const protocol = (i.includes('http') && !config.disable_ei) ? "https://" : i + "://";
        const local_address = aliases[e] ? aliases[e] : encode(e);
        const external_address = req.bgw.alias.target_domain || req.hostname;
        return protocol + external_address + "/" + local_address;
    });

module.exports = {decode, transformURI};
