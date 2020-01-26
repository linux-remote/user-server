const {execSync} = require('child_process');
const path = require('path');
const { FLAG, ERROR_FLAG } = require('./lib/util');

const PORT = process.env.PORT;

const isUnixSocket = !Number(PORT);
if(isUnixSocket) {
  if(PORT.indexOf('/linux-remote') !== -1) {
    execSync('rm -rf -- ' + PORT); //删除旧的 sock 文件, 才能启动.
  } else {
    console.error('PORT path error');
    console.info(ERROR_FLAG);
    throw new Error('Port is not reasonable');
  }
}


const NODE_ENV = process.env.NODE_ENV;
const IS_PRO = NODE_ENV === 'production';
global.IS_PRO = IS_PRO;

const LR_PATH = path.join(process.env.HOME, 'linux-remote');
global.LR_PATH = LR_PATH;
global.DESKTOP_PATH = path.join(LR_PATH , 'desktop');
global.RECYCLE_BIN_PATH = path.join(LR_PATH , '.recycle-bin');


const http = require('http');
const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');

const { onListening, onError } = require('./lib/util');
const createWsSerever = require('./ws-server');
const middleWare = require('./common/middleware');

const serverInfo = require('./api/server-info');
const recycleBin = require('./api/recycle-bin');
const fsApi = require('./api/fs');
const disk = require('./api/disk');
const upload = require('./api/fs/upload-simple');
const terminals = require('./api/terminals/terminals');
const desktop = require('./api/desktop');
const time = require('./api/time');
const ps = require('./api/ps/ps');

//初始化用户文件
execSync('mkdir -m=755 -p -- ' + global.DESKTOP_PATH);
execSync('mkdir -m=755 -p -- ' + global.RECYCLE_BIN_PATH);



var app = express();
app.disable('x-powered-by');

if(!isUnixSocket){
  app.use(middleWare.CORS);
}

if(!IS_PRO) {
  app.use(logger('dev'));
}

app.get('/alive', function(req, res){
  res.end('Y');
})

terminals(app);

app.use('/upload', middleWare.preventUnxhr, upload);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));





app.get('/', function(req, res){
  var msg = 'Hello! this is linux-remote user server!';
  res.send(msg);
});

// app.get('/live', ttl);

app.use('/time', middleWare.preventUnxhr, time);
app.use('/desktop', middleWare.preventUnxhr, desktop);

// sys apps

app.use('/fs', fsApi); // preventUnxhr inner.

app.get('/disk',middleWare.preventUnxhr, disk);
app.use('/serverInfo', middleWare.preventUnxhr, serverInfo);
app.use('/recycleBin', middleWare.preventUnxhr, recycleBin);
app.use('/ps', middleWare.preventUnxhr, ps);


// catch 404 and forward to error handler
app.use(middleWare.notFound);
// http error handler
app.use(middleWare.errHandle);

var server = http.createServer(app);
server.listen(PORT);

server.on('listening', onListening(server, function(){
  if(isUnixSocket){
    execSync('chmod 600 -- ' + PORT);
    // setfacl auto show group with 'll'. 'rwx------' ===> 'rwxrw----+'
    //  g:linux-remote:rw
    execSync('setfacl -m u:linux-remote:rw -- ' + PORT);
  }
  // _console.log('user server pid:', process.pid);
  console.info(FLAG);
}));

server.on('error', function(port) {
  onError(port);
  console.info(ERROR_FLAG);
});

createWsSerever(server);