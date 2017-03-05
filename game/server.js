//server libraries
const app = require("express")();
const http = require("http").Server(app); 
const io = require("socket.io")(http);

const eventConstants = require("./server-constants.js");

//server configuration specific to codeanywhere
const serverConfig = {
  serveIp:process.env.IP,
  servePort:process.env.PORT,
  cwd:"/home/cabox/workspace/blueprint2017/game"
};

var clients = [];
var playerMobile = null;
var playerNonMobile = null;
var cameraObject = {a:0, b:0, g:0, x:0, y:0, z:0};

function getIpCombo(socket){
  return socket.client.request.headers['x-forwarded-for'] || socket.client.conn.remoteAddress;
}

function assignPlayers(){
  
  //mobile player
  var i = 0;
  while(playerMobile == null && i < clients.length){
    clients[i].emit(eventConstants.S2C_IS_CLIENT_MOBILE);
    //when client recieves this, they will respond withs client_mobile_state which the server listens to after a connection
    i++;
  }
  
  i = 0;
  while(playerNonMobile == null && i < clients.length){
    clients[i].emit(eventConstants.C2S_CLIENT_MOBILE_STATE);
    //when client recieves this, they will respond withs client_mobile_state which the server listens to after a connection
    i++;
  }
}

app.get('/', function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/index.html");
});

app.get('/client-constants.js', function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/client-constants.js");
});

app.get('/socket.io.min.js', function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/socket.io.min.js");
});

app.get("/three.min.js", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/three.min.js");
});

app.get("/level1.json", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/models/level1.json");
});

app.get("/level2.json", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/models/level2.json");
});

app.get("/level3.json", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/models/level3.json");
});

app.get("/key.json", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/models/key.json");
});

app.get("/door.json", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/models/door.json");
});

app.get("/DeviceOrientationController.js", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/DeviceOrientationController.js");
});

app.get("/win_message.png", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/models/win_message.png");
});

app.get("/welcome_message.png", function(req, res){
  res.sendFile(serverConfig.cwd + "/client-media/models/welcome_message.png");
});

//let's handle each socket connection
io.on(eventConstants.CONNECT, function(socket){
  
  //gets rid of all duplicate sockets from client list, just for safety
  (function(){
    var i = 0;
    while(i < clients.length){
      if(getIpCombo(clients[i]) == getIpCombo(socket)){
        clients.pop(i);
      }else{
        i++;
      }
    }
  })();
  
  //adds new clients
  clients = clients.concat(socket);
  
  //assign players if one player is null
  assignPlayers();
  
  console.log(getIpCombo(socket) + " connected ("  + clients.length + " total)");
  
  socket.on(eventConstants.DISCONNECT, function(){//how to handle the client disconnecting
    
    //make mobile or non-mobile player null if client that disconnected is one of those
    if(playerMobile!=null && socket == playerMobile){
      playerMobile = null;
    }
    
    if(playerNonMobile!=null && socket == playerNonMobile){
      playerNonMobile = null;
    }
    
    //gets rid of all duplicate sockets from client list, just for safety
    (function(){
      var i = 0;
      while(i < clients.length){
        if(getIpCombo(clients[i]) == getIpCombo(socket)){
          clients.pop(i);
        }else{
          i++;
        }
      }
    })();
    
    console.log(getIpCombo(socket) + " disconnected (" + clients.length + " left)" );
  
    //reset players to clients from existing list
    assignPlayers();
    
  });//end of disconnect handler
  
  socket.on(eventConstants.C2S_CLIENT_MOBILE_STATE, function(ans){
    //client will only trigger this if we asked for its mobile state 
    //(see main.js:assignPlayers() and index.html)
    
    if(ans.ismobile && playerMobile == null){
      playerMobile = socket;
      console.log("set new mobile player");
    }
    
    if(!ans.ismobile && playerNonMobile == null){
      playerNonMobile = socket;
      console.log("set new non-mobile player");
    }
  });// end of c2s_client_mobile_state handler
  
  socket.on(eventConstants.C2S, function(cam){
    
    //if mobile player is sending cam data, listen to orientation
    if(playerMobile!=null && getIpCombo(socket) == getIpCombo(playerMobile)){
      cameraObject.a = cam.a;
      cameraObject.b = cam.b;
      cameraObject.g = cam.g;
    }
    
    //if non-mobile player is sending cam data, listen to position
    if(playerNonMobile!=null && getIpCombo(socket) == getIpCombo(playerNonMobile)){
      
      //console.log("useful alert log fjkl;efl;kwejl;kf;kj");
      
      cameraObject.x = cam.x;
      cameraObject.y = cam.y;
      cameraObject.z = cam.z;
    }
    
 
    
    io.sockets.emit(eventConstants.S2C, cameraObject);
  });//end of clientToServer handler
  
});//end of socket creation

http.listen(serverConfig.servePort, serverConfig.serveIp, function(){
  console.log("listening on " + serverConfig.serveIp + ":" + serverConfig.servePort);
});