# iot-bgw
IoT Border Gateway, remote access and security for the internet of things, contains BGW external interface, http-proxy, mqtt-proxy and auth server


## Try it out
```
docker pull hareeqi/bgw
docker run --rm -it -p 443:443 -e "ADMIN_KEY_PASSWORD=test" hareeqi/bgw
```
* Admin key "admin.test.7UQ4zTKbjv85YKxJwX6Tky1tIl7cpvGHPdsqBTwGZMz"
* [Test Link](https://bgw.hareeqi.com/bgw-auth/user?bgw_key=admin.test.7UQ4zTKbjv85YKxJwX6Tky1tIl7cpvGHPdsqBTwGZMz) note: port 443 requires sudo access


## Usage

* Map a volume to /bgw/config that contains the three files below
 * Provide a certificate file ("[cert name].pem") - [example](./config/)
 * Provide a key file ("[key name].pem") - [example](./config/)
 * provide a config file (either [config.env](./config/config.env.example) or [config.json](./config/config.json.example) or both)
* You final docker run command looks like this.
```
docker run -p 80:80 -p 443:443 -p 8883:8883 -v /my/host/config:/bgw/config hareeqi/bgw
```


## Swagger 

* Click autherize and set the api key to "Bearer [BGW ADMIN KEY]"
* You can change the swagger target host host by chaning the url 
* Click here to use swagger [Click here](http://hareeqi.com/swagger/?host=https://bgw.hareeqi.com/bgw-auth&url=https://raw.githubusercontent.com/hareeqi/iot-bgw/master/swagger.json)

## Configs
* All configs for the bgw are passed as envaiorment variables 
* You can suppliy envaiorment variables from a file by providing config.env or config.json or both
* Each bgw component has a config prifix (**EI_, HTTP_PROXY_, MQTT_PROXY_, AUTH_SERVER_, AAA_CLIENT_**)
* Shared config like the aaa client, can be used globally like AAA_CLIENT_ or selectivily like EI_AAA_CLEINT_
* note: configs in config.json will be converted to envaiorment variables and passed to all components 

## Components
* [iot-bgw-external-interface](../../../iot-bgw-external-interface)
* [iot-bgw-auth-server](../../../iot-bgw-auth-server)
* [iot-bgw-mqtt-proxy](../../../iot-bgw-mqtt-proxy)
* [iot-bgw-http-proxy](../../../iot-bgw-http-proxy)
* [iot-bgw-aaa-client](../../../iot-bgw-aaa-client)

## Development Mode

If you would like to further develop the bgw in your local machine:
1. Clone the rep by running this command
```
git clone https://github.com/hareeqi/iot-bgw.git
```

2. Build the dependencies for all components and remove the container using this command:
```
docker run --rm -it -v "$(pwd)"/iot-bgw:/bgw hareeqi/bgw build
```

3. Create and run a container with dependencies in dev mode:
```
docker run --rm -it -p 80:80 -p 443:443 -p 8883:8883 -v "$(pwd)"/iot-bgw:/bgw hareeqi/bgw dev
```
Whenever you change the code in you local dev folder the component will automatically restarts and your changes are reflected immediately 

## Benchmarking
[iot-bgw-benchmark](../../../iot-bgw-benchmark)
