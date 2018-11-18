# IstrolidServer

**Istrolid game server reverse engineered!!**

## How does it work
It basically just listens on a web socket server and dumps everything it got to sim

A root proxy is neede to make the server show up in client's server list and to use chat

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
  - `root_addr` is the ip to root server's proxy, in would look like `ws://address:port/server`

3. Install missing dependencies
```
npm install .
```

4. Run the server
```
npm start
```

## Root server proxy
In order to make your server to show up and use the chat, you'll need to set up a root proxy as well.

You can host your own root proxy, or you can use this one `ws://istrolid-root.herokuapp.com/server`

To host your own:

1. Get the root proxy code
```
git clone -b rootProxy https://github.com/Rio6/IstrolidServer.git IstrolidRootProxy
cd IstrolidRootProxy
```

2. Install missing dependencies
```
npm install .
```

3. Run the proxy
```
npm start
```

## Join the server
Now, go to `http://istrolid.com/game.html?rootAddress=<YOUR ROOT PROXY IP>` eg. [http://istrolid.com/game.html?rootAddress=ws://istrolid-root.herokuapp.com](http://istrolid.com/game.html?rootAddress=ws://istrolid-root.herokuapp.com).
Your game server should be added in the server list.

**Dont forget to open holes on your router**

## REPL
There's a [nodejs repl](https://nodejs.org/api/repl.html) server listening on localhost port 5001.
You can use [this tool](https://gist.github.com/Rio6/21fe0a23b93084cf88cd0a095d3782c2) to access it
