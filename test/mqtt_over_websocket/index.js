const mqtt = require('mqtt')
const logger = require('../../logger/log')("mqtt_over_websocket", "debug");
const https = require('https');
const fs = require('fs');
const ca = process.argv[2];
const cert = process.argv[3];
const key = process.argv[4];
const url = process.argv[5];
const username = process.argv[6];
const password = process.argv[7];
const qos = process.argv[8];

logger.log('debug', 'Starting mqtt_over_websocket', {
    ca: ca,
    cert: cert,
    key: key,
    url: url,
    username: username,
    password: password
});

let client
if (url.includes('wss:')) {
    agentOptions = {
        //rejectUnauthorized: false,
        ca: fs.readFileSync(ca),
        cert: fs.readFileSync(cert),
        key: fs.readFileSync(key)
    };
    agent = new https.Agent(agentOptions);
    client = mqtt.connect(url, {wsOptions: {agent: agent}, username: username, password: password});
} else {
    client = mqtt.connect(url, {username: username, password: password});
}

client.on('reconnect', function () {
    console.log("reconnect");
});

client.on('close', function () {
    console.log("close");
    process.exit(1);
});

client.on('offline', function () {
    console.log("offline");
});

client.on('end', function () {
    console.log("end");
});

client.on('packetsend', function (packet) {
    console.log("packetsend");
    //console.log("packet");
});

client.on('packetreceive', function (packet) {
    console.log("packetreceive");
    //console.log(packet);
});


client.on('error', function (error) {
    console.log(error)
    client.end()
    process.exit(1);
});

client.on('message', function (topic, message) {
    // message is Buffer
    console.log("message", message.toString())
    client.end()
    process.exit(0);
});

client.on('connect', function () {
    client.subscribe('tutorial', function (err) {
        if (!err) {
            client.publish('tutorial', 'Message via Websocket proxy')
        }
    })
})
