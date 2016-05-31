//Tutorial:
/*
http://www.lostdecadegames.com/how-to-make-a-simple-html5-canvas-game/
*/

//Global socket connection instance
mySocket = io.connect();//create new websocket, 




var CONNECTED_PLAYER_OBJECTS =[];//container for any connected players

//function for generating a random uniqueID for the player
function randomString(length, chars) {
	//length of result, chars used
    var result = '';
    for (var i = length; i > 0; --i){result += chars[Math.floor(Math.random() * chars.length)];}
    return result;
}
var UNIQUE_PLAYER_ID =  randomString(6, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
console.log(UNIQUE_PLAYER_ID);
// create the canvas element
var canvas = document.createElement("canvas");

var ctx = canvas.getContext("2d");
//assign canvas dimensions
canvas.width = 512;
canvas.height = 480;
$('#canvasHolder').append(canvas);

// Background image
var bgReady = false;
var bgImage = new Image();
bgImage.onload = function () {
	bgReady = true;
};
bgImage.src = "static/images/background.png";


/*Player Images
*******************************************************/
var PLAYER_IMAGE_HOLDER=[];//container for player images
var playerImgRead = true;//toggle during image load so canvas doesnt try and render img not loaded yet
var heroImage = new Image();
heroImage.src = "static/images/hero.png"

PLAYER_IMAGE_HOLDER[0]=heroImage;
var ponyImage = new Image();
ponyImage.src ="static/images/pony.png";
PLAYER_IMAGE_HOLDER[1]=ponyImage;
/*************end player images************************/

// Game objects********************
//local player
var hero = {
	speed: 128, // movement in pixels per second
	height: 45,
	width: 45,
	imgIndex:0,//used to let other players what image you are from PLAYER_IMAGE_HOLDER
	playerImg:PLAYER_IMAGE_HOLDER[0]//default
};

// player object builder for ***NETWORK CONNECTED PLAYERS****
function hero2(id, x, y,imgIdx) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.imgIndex = imgIdx;
  this.playerImg = PLAYER_IMAGE_HOLDER[this.imgIndex];
};
/************end game objects*************************/

/****INPUTS******/
// Handle keyboard
var keysDown = {};

addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;
}, false);

addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
}, false);

//Handle touch controls (played on phone)
/********************************/
var theDpad = document.getElementsByClassName("dpad");

for (var i = 0; i < theDpad.length; i++) {
    theDpad[i].addEventListener('mousedown', dpad_move, false);
    theDpad[i].addEventListener('mouseup', dpad_stop, false);
};
function dpad_move() {
    var d = this.getAttribute("value");
    console.log(d);
    keysDown[parseInt(d)] = true;
};
function dpad_stop () {
    var d = this.getAttribute("value");
    console.log(d);
    delete keysDown[parseInt(d)];
};
/**************End dpad for phone********************/
/*********End inputs*************/

// place player when first starting
var PlacePlayer = function () {
	hero.x = canvas.width / 2;
	hero.y = canvas.height / 2;
};

// Update game object positions !!!MAJOR WORK HORSE FUNCTION!!!
var update = function (modifier) {
	var PreviousFramePosition_X = hero.x;
	var PreviousFramePosition_Y = hero.y;

	
	if (38 in keysDown) { // Player holding up
		if (hero.y >0) {//**first - check for wall collision
			hero.y -= hero.speed * modifier;
		}else {};//hit wall, down' allow further movement in this direction
	}
	if (40 in keysDown) { // Player holding down
		if (hero.y < (canvas.height-hero.height) ){//check for wall
			hero.y += hero.speed * modifier;		
		}else {};//hit wall, down' allow further movement in this direction
	}
	if (37 in keysDown) { // Player holding left
		if (hero.x > 0){//check for wall
			hero.x -= hero.speed * modifier;	
		}else {};//hit wall, down' allow further movement in this direction
	}
	if (39 in keysDown) { // Player holding right
		if (hero.x < (canvas.width-hero.width)){
			hero.x += hero.speed * modifier;
		}else {};//hit wall, down' allow further movement in this direction
	}
	//If player has made a move, tell the server so movement can be broadcast to other connected players
	//also tell server what your current avatar img is encase you change
	if (PreviousFramePosition_X !== hero.x || PreviousFramePosition_Y !== hero.y) {
		mySocket.send(JSON.stringify({"movement":{"player":UNIQUE_PLAYER_ID,'x':Math.round(hero.x),'y':Math.round(hero.y),'ix':hero.imgIndex}}));//tell server what my moves are
	}
};

// Draw everything
var render = function () {
	//GOOD EXAMPLE OF USING ctx.drawImage()
	//http://www.williammalone.com/articles/create-html5-canvas-javascript-sprite-animation/
	
	//background
	ctx.drawImage(bgImage, 0, 0);
	
	//main player
	if (playerImgRead) {
	ctx.drawImage(hero.playerImg, hero.x, hero.y);
	};
	
	//IF Other players are connected draw them
	if (CONNECTED_PLAYER_OBJECTS.length>0) {
		for (var h=0;h<CONNECTED_PLAYER_OBJECTS.length;h++) {
			ctx.drawImage(CONNECTED_PLAYER_OBJECTS[h].playerImg, CONNECTED_PLAYER_OBJECTS[h].x, CONNECTED_PLAYER_OBJECTS[h].y);	
		};
	};
};

// The main game loop
var main = function () {
	var now = Date.now();
	var delta = now - then;

	update(delta / 1000);//update is used to smooth out player connection speed effecting game play
	render();

	then = now;

	// Request to do this again ASAP
	requestAnimationFrame(main);
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;



$(document).ready(function(){
	//USER selects their avatar image
	$('#avatarSelect input').on('change', function() {
		//get selection value
		var index = parseInt($('input[name=avatarImg]:checked', '#avatarSelect').val());
		//set what idex in the player images is being used
		hero.imgIndex = index;
		//assign the image to the player
   	hero.playerImg = PLAYER_IMAGE_HOLDER[index]; 
	   //update to others that you have changed your image
		mySocket.send(JSON.stringify({"avatar":{"player":UNIQUE_PLAYER_ID,'ix':hero.imgIndex}}));//tell server what my moves are
	   //call main again to redo render if radio was clicked mid loop		
		main();
	});

	//when you hold Phone in Portrait mode show dpad "gameboy" style
	if (screen.width>screen.height) {
		$(".dpad").css("display","none");
	};
	
	//HEAVY LIFTING DONE HERE
	mySocket.on('message', function(msg) {
			var JSONdata = JSON.parse(msg);
			
			//special msg header 'avatar' if they changed their avatar image
			if (Object.keys(JSONdata)[0] === 'avatar'){
				//Check if the message in was the echo of players avatar change
			  if (JSONdata.avatar.player != UNIQUE_PLAYER_ID) {
				//get the index for the new image they are using
					var ix = parseInt(JSONdata.avatar.ix);
					//loop through the player objects
					for (var h=0;h<CONNECTED_PLAYER_OBJECTS.length;h++) {
						//when you find the right player id, update the player img
						if(CONNECTED_PLAYER_OBJECTS[h].id === JSONdata.avatar.player ){
							CONNECTED_PLAYER_OBJECTS[h].playerImg = PLAYER_IMAGE_HOLDER[ix]//set img again		
						};		
					};
							main();//call again to update with the players new img
				};
			} 
			if(JSONdata.player != UNIQUE_PLAYER_ID) {
			//CHeck if the message in was the echo of players move
				var playerExists;

				//if not an echo, check if you have the player ID already in your CONNECTED_PLAYER_OBJECTS
			   for (var h=0;h<CONNECTED_PLAYER_OBJECTS.length;h++) {
					if (CONNECTED_PLAYER_OBJECTS[h].id===JSONdata.player){
						//if you DO have this player ID already, make true
						playerExists = true;
						// update the player object location on screen						
						CONNECTED_PLAYER_OBJECTS[h].x = JSONdata.x;
						CONNECTED_PLAYER_OBJECTS[h].y = JSONdata.y;
						//CONNECTED_PLAYER_OBJECTS[h] = JSONdata //REASSIGN ENTIRE PLAYER OBJECT, IMG AND ALL
					}else {
						//if you do not this player ID already, i.e. player newly connected to game
						playerExists=false;};
		 		};//END for loop	
		 		//create a new player obj in CONNECTED_PLAYER_OBJECTS for the new player Id that was found
		 		if (!playerExists && JSONdata.player) {
		 			//builder takes (id, x,y,imgIdx), 
		 			//JSONdata.ix is an index number for the array of player images:PLAYER_IMAGE_HOLDER[]
		 			CONNECTED_PLAYER_OBJECTS.push(new hero2(JSONdata.player,JSONdata.x,JSONdata.y,parseInt(JSONdata.ix)));
		 			playerExists=true;
		 		};
		 	 
			}	
		});

	// Let's play this game!
	then = Date.now();//used for frame rate normalization
	PlacePlayer();
	main();
});
