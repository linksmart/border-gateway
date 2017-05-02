## iot-bgw
iot-bgw Container, contains BGW external interface, http-proxy, mqtt-proxy and auth server

## Usage
```
git clone https://github.com/hareeqi/iot-bgw.git
cd iot-bgw
npm install
sudo npm start
```

## Docker
### Build
```
docker build . -t bgw --no-cache
```
### Run
```
docker run --rm -p 443:443 --name bgw-test -e "ADMIN_KEY_PASSWORD=test" bgw
```


## Test
https://bgw.hareeqi.com/bgw-auth/user/admin?bgw_key=admin.test.hzytPLXkpcxWRLAx5z9wnzxf9r33YlcNGl8OVgC5GnH



## Components
https://github.com/hareeqi/iot-bgw-external-interface

https://github.com/hareeqi/iot-bgw-auth-server

https://github.com/hareeqi/iot-bgw-mqtt-proxy

https://github.com/hareeqi/iot-bgw-http-proxy

https://github.com/hareeqi/iot-bgw-aaa-client
