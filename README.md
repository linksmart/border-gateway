## iot-bgw
iot-bgw Container, contains BGW external interface, http-proxy, mqtt-proxy and auth server


## Try it out
```
docker run --rm -p 443:443 -e "ADMIN_KEY_PASSWORD=test" hareeqi/bgw
```
##### [Test Link](https://bgw.hareeqi.com/bgw-auth/user/admin?bgw_key=admin.test.hzytPLXkpcxWRLAx5z9wnzxf9r33YlcNGl8OVgC5GnH)

## Swagger 

* Click autherize and set the api key to "Bearer admin.test.hzytPLXkpcxWRLAx5z9wnzxf9r33YlcNGl8OVgC5GnH"
* You can change the external host by chaning the url 
* Click here to use swagger [Click here](http://hareeqi.com/swagger/?host=https://bgw.hareeqi.com/bgw-auth&url=https://raw.githubusercontent.com/hareeqi/iot-bgw-auth-server/master/swagger.json)


## Usage
```
docker run -p 443:443 -p 8883:8883 -v /path/on/host/config:/bgw/config --name bgw-proj hareeqi/bgw
```

## Components
* https://github.com/hareeqi/iot-bgw-external-interface
* https://github.com/hareeqi/iot-bgw-auth-server
* https://github.com/hareeqi/iot-bgw-mqtt-proxy
* https://github.com/hareeqi/iot-bgw-http-proxy
* https://github.com/hareeqi/iot-bgw-aaa-client
