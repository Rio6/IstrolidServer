var config = require('./config.json');
var WebSocket = require('ws');
require('./fix');
var Istrolid = require('./istrolid.js');

const allowedCmds = ["gameKey", "playerJoin", "alpha", "mouseMove", "playerSelected", "setRallyPoint", "buildRq", "stopOrder", "holdPositionOrder", "followOrder", "selfDestructOrder", "moveOrder", "configGame", "startGame", "addAi", "switchSide", "kickPlayer", "surrender"]

global.sim = new Sim();
sim.cheatSimInterval = -12;
sim.lastSimInterval = 0;

global.Server = function() {

    var wss = new WebSocket.Server({port: config.port});
    var root = null;

    var players = {};
    var info = {};

    this.send = (player, data) => {
        let packet = sim.zJson.dumpDv(data);
        let client = player.ws;
        if(client && client.readyState === WebSocket.OPEN) {
            client.send(packet);
        }
    };

    this.sendToRoot = (data) => {
        root.sendData(data);
    };

    this.stop = () => {
        console.log("stopping server");
        wss.close();
        clearInterval(interval);
    };

    this.say = msg => {
        root.sendData(['message', {
            text: msg,
            channel: config.name,
            color: "FFFFFF",
            name: "Server",
            server: true
        }]);
    };

    var connectToRoot = () => {
        root = new WebSocket(config.root_addr);

        root.on('open', () => {
            console.log("connected to root proxy");
            info = {};
        });

        root.on('close', () => {
            console.log("cannot connect to root, retrying");
            setTimeout(connectToRoot, 5000);
        });

        root.on('error', e => {
            console.log("connection to root failed");
        });

        root.sendData = data => {
            if(root.readyState === WebSocket.OPEN) {
                root.send(JSON.stringify(data));
            }
        }
    };

    connectToRoot();

    wss.on('connection', (ws, req) => {
        console.log("connection from", req.connection.remoteAddress);

        let id = req.headers['sec-websocket-key'];

        ws.on('message', msg => {
            let packet = new DataView(new Uint8Array(msg).buffer);
            let data = sim.zJson.loadDv(packet);
            //console.log(data);
            if(data[0] === 'playerJoin') {
                let player = sim.playerJoin(...data);
                player.ws = ws;
                players[id] = player;
                sim.clearNetState();
            } else if(allowedCmds.includes(data[0])) {
                sim[data[0]].apply(sim, [players[id],...data.slice(1)]);
            }
        });

        ws.on('close', e => {
            players[id].connected = false;
            delete players[id];
        });
    });

    var interval = setInterval(() => {
        let rightNow = now();
        if(sim.lastSimInterval + 1000 / 16 + sim.cheatSimInterval <= rightNow) {
            sim.lastSimInterval = rightNow;

            if(!sim.paused) {
                sim.simulate();
            } else {
                sim.startingSim();
            }

            let packet = sim.send();
            wss.clients.forEach(client => {
                if(client.readyState === WebSocket.OPEN) {
                    client.send(packet);
                }
            });

            // Send server info
            let newInfo = {
                name: config.name,
                address: "ws://" + config.addr + ":" + config.port,
                observers: sim.players.filter(p => p.connected).length,
                players: sim.players.filter(p => p.connected).map(p => { return {
                    name: p.name,
                    side: p.side,
                    ai: p.ai
                }}),
                type: sim.serverType,
                version: VERSION,
                state: sim.state
            };

            let diffInfo = {};
            for(let k in newInfo) {
                if(!simpleEquals(info[k], newInfo[k])) {
                    diffInfo[k] = newInfo[k];
                }
            }

            if(Object.keys(diffInfo).length > 0) {
                root.sendData(['info', config.name, diffInfo]);
                info = newInfo;
            }
        }
    }, 17);
};

global.server = new Server();

// Remote repl
var repl = require('repl');
var net = require('net');
net.createServer(function (socket) {
    repl.start({
        input: socket,
        output: socket,
        terminal: true
    }).on('exit', () => socket.end());
}).listen(5001, "localhost");
