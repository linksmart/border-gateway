const {AAA, CAT, debug} = require('./log');
const config = require('./config_mgr')();

// just to make sure it is a string

const setTimer = !!config.aaa_client.purge_exp_cache_timer;
config.aaa_client.cache_for +="";
config.aaa_client.purge_exp_cache_timer +="";
config.aaa_client.cache_for = config.aaa_client.cache_for.split('*').reduce((t,c)=>(t*c),1000);
config.aaa_client.purge_exp_cache_timer =  config.aaa_client.purge_exp_cache_timer.split('*').reduce((t,c)=>(t*c),1000);

let cache = {};


const set = (key,res,path,source, profile, ...message)=>{
  message && AAA.log(...message,path,source);
  debug('caching profile');
  debug('profile: ', JSON.stringify(profile, null, 4));
  const cache_until = (profile && profile.cache_until)?profile.cache_until: (Date.now() + config.aaa_client.cache_for);
  cache[key]= {
    aaa_message: message.join(' '),
    return_object: res,
    passed: !!profile,
    profile:profile,
    cache_until: cache_until
  };
};
const get = (key)=> {
  if (cache[key] && Date.now() < cache[key].cache_until){

      return cache[key];
  }
  cache[key] && (cache[key].expired = true);
  return cache[key];
};

setTimer && setInterval(()=>{
  const now = Date.now();
  let counter = 0;
  Object.keys(cache).forEach(function(key) {
    if(now > cache[key].cache_until){
      counter ++;
      delete cache[key];
    }
  });
  debug(`purged a total of ${counter} from cache`);
},config.aaa_client.purge_exp_cache_timer);

module.exports={get,set};
 
