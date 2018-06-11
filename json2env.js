

const fs = require('fs');

const prefix = "json2env: ";

const envFile = "./config/config.env";
const jsonFile = "./config/config.json";
const outFile = "./node_modules/config.env";

const envExist = fs.existsSync(envFile);
const jsonExist = fs.existsSync(jsonFile);

let env = "";
let json = "";


if ( envExist && jsonExist) {
  console.log(prefix, "Found config.env and config.json, will append config.json to config.env");
  env = fs.readFileSync(envFile) +"\n\n";
  json = json2env();

} else if (envExist){
  console.log(prefix, "Found config.env it will be used as main config");
  env = fs.readFileSync(envFile);

} else if (jsonExist){
  console.log(prefix, "Found config.json it will be used as main config");
  json = json2env();

} else {
  console.log(prefix, "could not find config.env or config.json, will start BGW with default configs");

}

fs.writeFileSync(outFile,env+json);



function json2env(){
  let e = "";
  let j = JSON.parse(fs.readFileSync(jsonFile));

  Object.keys(j).forEach(function(key) {
        const value =  JSON.stringify(j[key]);
        e += key.toUpperCase()+"="+value+"\n\n";

  });
  return e;
}
