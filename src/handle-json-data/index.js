
const os = require('os');
const termMap = require('./terminal/store.js');
const SocketRequest = require('@hezedu/socket-request');

const quickLaunch = require('./quick-launch.js');
const desktop = require('./desktop.js');
const fsMethods = require('./fs/index.js');
const termMethods = require('./terminal/term.js');
const recycleBin = require('./recycle-bin.js');
const methodsMap = Object.create(null);
Object.assign(methodsMap, quickLaunch);
Object.assign(methodsMap, desktop);
Object.assign(methodsMap, fsMethods);
Object.assign(methodsMap, termMethods);
Object.assign(methodsMap, recycleBin);
const termWriteKey = 2;
// const exitKey = global.CONF.arrSrExitKey;
const wsOpenKey = 3;
const wsOnCloseKey = 4;

function handleJsonData(socket){
  socket.setEncoding('utf-8');
  

  // global.__isWsConnect = true;
  const sr = new SocketRequest(socket);
  global.__SOCKET_REQUEST__ = sr;



  sr.onRequest = function(data, reply){
    // console.log('onRequest', data);
    if(Array.isArray(data)){
      const type = data[0];
      if(type === termWriteKey){
        methodsMap.termWrite(data[1], data[2]);
      } else if(type === wsOpenKey){
        global.__isWsConnect = true;
      } else if(type === wsOnCloseKey){
        global.__isWsConnect = false;
        // const isNormalClose = data[1];
        // if(isNormalClose){
        //   process.exit();
        // }
      }
      return;
    }
    const method = data.method;
    if(method === 'getDesktopBundle'){
      const userInfo = os.userInfo();
      // uid, gid, username, homedir, shells
      reply({
        status: 200,
        data: {
          ...userInfo,
          hostname: os.hostname(),
          createdTerm: Object.keys(termMap)
        }
      });
    } else if(method === 'getTime') {
      const d = new Date();
      reply({
        status: 200,
        data: {
          timeZoneOffset: d.getTimezoneOffset(),
          time: d.getTime()
        }
      });
    // } else if(method === 'lo!gout') {
    //   // reply({
    //   //   status: 200,
    //   //   data: 'ok'
    //   // });
    //   sr.request([exitKey]);
    //   socket.end(function(){
    //     process.exit();
    //   });
    } else if(methodsMap[method]) {

      methodsMap[method](data.data, function(err, data){
        if(err){
          reply({
            status: err.status || 400,
            message: err.name + ': ' + err.message
          });
          return;
        } else {
          reply({
            status: 200,
            data
          });
        }
      });

    } else {
      reply({
        status: 404,
        message: 'not found'
      });
    }
  }
}

module.exports = handleJsonData;
