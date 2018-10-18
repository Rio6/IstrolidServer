require('./fix');

var Istrolid = require('./istrolid.js');
var WebSocket = require('ws');

global.sim = new Sim();
sim.cheatSimInterval = -12;
sim.lastSimInterval = 0;

global.Server = function() {

    this.wss = new WebSocket.Server({port: 8080});

    var players = {};

    this.send = (player, data) => {
        let packet = sim.zJson.dumpDv(data);
        let client = player.ws;
        if(client && client.readyState === WebSocket.OPEN) {
            client.send(packet);
        }
    };

    this.stop = () => {
        console.log("stopping server");
        this.wss.close();
        clearInterval(interval);
    };

    this.say = msg => {
        console.log(msg);
    };

    this.wss.on('connection', (ws, req) => {
        console.log("connection from", req.connection.remoteAddress);

        ws.id = req.headers['sec-websocket-key'];

        ws.on('message', msg => {
            let packet = new DataView(new Uint8Array(msg).buffer);
            let data = sim.zJson.loadDv(packet);
            //console.log(data);
            if(data[0] === "playerJoin") {
                let player = sim.playerJoin(...data);
                player.ws = ws;
                players[ws.id] = player;
                sim.clearNetState();
            } else if(sim[data[0]]) {
                sim[data[0]].apply(sim, [players[ws.id],...data.slice(1)]);
            }
        });

        ws.on('close', msg => {
            delete players[ws.id];
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
            this.wss.clients.forEach(client => {
                if(client.readyState === WebSocket.OPEN) {
                    client.send(packet);
                }
            });
        }
    }, 17);
};

global.server = new Server();

var repl = require('repl');
var ctx = repl.start().context;
