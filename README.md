## iot-bgw
iot-bgw Container, contains BGW external interface, http-proxy, mqtt-proxy and auth server


## Try it out
```
docker pull hareeqi/bgw
docker run --rm -p 443:443 -e "ADMIN_KEY_PASSWORD=test" hareeqi/bgw
# Click on the test link below
```
* [Test Link](https://bgw.hareeqi.com/bgw-auth/user?bgw_key=admin.test.hzytPLXkpcxWRLAx5z9wnzxf9r33YlcNGl8OVgC5GnH)


## Usage

* Map a volume to /bgw/config that contains three file "config.env", "[cert name].pem" and "[cert name].pem" 
* Edit config.env to your desired sittings [example here](https://github.com/hareeqi/iot-bgw/blob/master/config/config.env)
* You final docker comman looks like this.
```
docker run -p 443:443 -p 8883:8883 -v /path/on/host/config:/bgw/config hareeqi/bgw
```


## Swagger 

* Click autherize and set the api key to "Bearer admin.test.hzytPLXkpcxWRLAx5z9wnzxf9r33YlcNGl8OVgC5GnH"
* You can change the swagger target host host by chaning the url 
* Click here to use swagger [Click here](http://hareeqi.com/swagger/?host=https://bgw.hareeqi.com/bgw-auth&url=https://raw.githubusercontent.com/hareeqi/iot-bgw/master/swagger.json)

## Configs
* You can edit config.env to your desired settings
* All configs for the bgw are passed as envaiorment variables 
* Each bgw component has a config prifix (**EI_, HTTP_PROXY_, MQTT_PROXY_, AUTH_SERVER_, AAA_CLIENT_**)
* Shared config like the aaa client, can be used globally like AAA_CLIENT_ or selectivily like EI_AAA_CLEINT_
* If configs gets complicated, you write in JSON and use this site to conver it [json2env](http://hareeqi.com/json2env/)

## Components
* https://github.com/hareeqi/iot-bgw-external-interface
* https://github.com/hareeqi/iot-bgw-auth-server
* https://github.com/hareeqi/iot-bgw-mqtt-proxy
* https://github.com/hareeqi/iot-bgw-http-proxy
* https://github.com/hareeqi/iot-bgw-aaa-client
