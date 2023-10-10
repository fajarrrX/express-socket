let express = require('express'),
	app = express(),
	cors = require('cors'),
	spawn = require('child_process').spawn,
	bodyParser = require('body-parser'),
	axios = require('axios'),
	{ WebcastPushConnection } = require("tiktok-live-connector");

require('events').EventEmitter.defaultMaxListeners = 0;

app.use(cors())

app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
    next();
});

app.get('/', (req, res) => {
    res.end('Hello World!\n');
});

spawn('ffmpeg', ['-h']).on('error', function (e) {
  	console.error("Could not find FFMpeg in system path.");
	console.log("error spawn")
  	process.exit(-1);
});

// init socket.io
const httpServer = require("http").createServer();
//adding cors to target localhost
const io = require("socket.io")(httpServer, {
	cors: {
		origins: ['http://localhost:8080/', 'https://sandbox.liveambassador.com/', 'https://liveambassador.com/', 'https://www.liveambassador.com/'],
		methods: ['GET', 'POST'],
		transports: ['websocket', 'polling'],
		allowedHeaders: ["Access-Control-Allow-Credentials"],
		credentials: true
	},
	allowEIO3: true,
	pingTimeout: 60000, // Timeout in ms (1 minute)
    pingInterval: 25000 // Interval to send pings (25 seconds)
});

const registeredStreamHandler = require("./streamHandler.js");
const tiktokLiveConnection = require("./tiktokLiveConnector.js")

const onConnection = (socket) => {
    io.emit('connected', {success: true})

	//register stream handler
	registeredStreamHandler(socket, spawn);

	//register tiktok live connection
	tiktokLiveConnection(socket, WebcastPushConnection, axios);
}

io.on("connection", onConnection);

io.on('connect_error', function (e) {
    console.log('Connection error:', e);
});

io.on('reconnect', function () {
    console.log('Reconnected!');
});

io.on('error', function (e) {
    console.log('socket.io error:' + e);
});

httpServer.listen(4222, function(){
	console.log('https and websocket server is listening on port: 4222')
})

process.on('uncaughtException', function(error) {
    // handle the error safely
    console.log(error)
    // Note: after client disconnect, the subprocess will cause an Error EPIPE, which can only be caught this way.
})