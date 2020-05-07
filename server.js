var config = require('./config.json');
var WebSocket = require('ws');
require('./fix');
var Istrolid = require('./istrolid.js');

const allowedCmds = ["playerJoin", "mouseMove", "playerSelected", "setRallyPoint", "buildRq", "stopOrder", "holdPositionOrder", "followOrder", "selfDestructOrder", "moveOrder", "configGame", "startGame", "addAi", "switchSide", "kickPlayer", "surrender"]

global.sim = new Sim();
Sim.prototype.cheatSimInterval = -12;
Sim.prototype.lastSimInterval = 0;

global.Server = function() {

    var wss = new WebSocket.Server({port: process.env.PORT || config.port});
    var root = null;

    var players = {};

    var lastInfoTime = 0;

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
            console.log("connected to root");
            sendInfo();
            lastInfoTime = now();
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

    var sendInfo = () => {
        // Send server info
        let info = {
            name: config.name,
            address: "ws://" + config.addr + ":" + config.port,
            observers: sim.players.filter(p => p.connected && !p.ai).length,
            players: sim.players.filter(p => p.connected && !p.ai).map(p => { return {
                name: p.name,
                side: p.side,
                ai: false
            }}),
            type: sim.serverType,
            version: VERSION,
            state: sim.state
        };
        root.sendData(['setServer', info]);
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
            if(players[id]) {
                players[id].connected = false;
                delete players[id];
            }
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
        }
        if(rightNow - lastInfoTime > 15000) {
            sendInfo();
            lastInfoTime = rightNow;
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
    socket.on('error', () => {});
}).listen(5001, "localhost");
