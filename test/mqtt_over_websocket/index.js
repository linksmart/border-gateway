const mqtt = require('mqtt')
const https = require('https');
const fs = require('fs');
const url = process.argv[3];
const username = process.argv[4];
const password = process.argv[5];
const qos = process.argv[6];

let client
if (url.includes('wss:')) {
    agentOptions = {
        //rejectUnauthorized: false,
        ca: fs.readFileSync(process.argv[2])
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
    client.subscribe('Test', function (err) {
        if (!err) {
            client.publish('Test', 'Message via Websocket proxy')
        }
    })
})
