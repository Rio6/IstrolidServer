# IstrolidServer

**Istrolid game server reverse engineered!!**

## How does it work
It basically just listens on a web socket server and sends everything it got to sim

## What's needed
- [nodejs](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/)

## Install
1. Get the server code
```
git clone https://github.com/Rio6/IstrolidServer.git
cd IstrolidServer
```
2. Edit `config.json` to change:
  - `name` to your server name
  - `port` to the port you want your server to run on
  - `addr` is your public ip
  - `root_addr` is the ip to root server or proxy, in would look like `ws://address:port/server`

3. Install missing dependencies
```
npm install .
```

4. Run the server
```
npm start
```

## Root server proxy
Root proxy is no longer required, but can still be used.
I have one set up here `ws://istrolid-root.herokuapp.com/server`

Just put it in root\_addr field in config.json, then you can access it through `http://istrolid.com/game.html?rootAddress=ws://istrolid-root.herokuapp.com`

**Dont forget to open holes on your router**

## REPL
There's a [nodejs repl](https://nodejs.org/api/repl.html) server listening on localhost port 5001.
You can use [this tool](https://gist.github.com/Rio6/21fe0a23b93084cf88cd0a095d3782c2) to access it
