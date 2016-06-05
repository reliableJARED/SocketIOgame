//Tutorials:
/*
http://www.lostdecadegames.com/how-to-make-a-simple-html5-canvas-game/
http://jlongster.com/Making-Sprite-based-Games-with-Canvas
http://davetayls.me/blog/2013/02/11/drawing-sprites-with-canvas
http://www.williammalone.com/articles/create-html5-canvas-javascript-sprite-animation/
*/

//Global socket connection instance
mySocket = io.connect();//create new websocket, 
var biteSound = new Audio();
biteSound.src = ('http://soundbible.com/mp3/Cash%20Register%20Cha%20Ching-SoundBible.com-184076484.mp3');

var CONNECTED_PLAYER_OBJECTS =[];//container for any connected players
var PlayerLookUp = {};//used to quickly look up player in CONNECTED_PLAYER_OBJECTS
//function for generating a random uniqueID for the player
function randomString(length, chars) {
	//length of result, chars used
    var result = '';
    for (var i = length; i > 0; --i){result += chars[Math.floor(Math.random() * chars.length)];}
    return result;
}
var UNIQUE_PLAYER_ID =  randomString(6, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');


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
bgImage.src = "static/images/background.png";


/*Player Images
*******************************************************/
var PLAYER_IMAGE_HOLDER=[];//container for player images
var playerImgReady = true;//toggle during image load so canvas doesnt try and render img not loaded yet
var heroImage = new Image();
heroImage.src = "static/images/hero.png"
PLAYER_IMAGE_HOLDER[0]=heroImage;

var ponyImage = new Image();
ponyImage.src ="static/images/pony.png";
PLAYER_IMAGE_HOLDER[1]=ponyImage;

var linkPlayer;
var linkReady = false;
var linkImage = new Image();
linkImage.onload = function() {   
     linkReady = true;
};
linkImage.src = "static/images/link_sprite_red.png";

var linkPlayerRed;
var linkReadyRed = false;
var linkImageRed = new Image();
linkImageRed.onload = function() {   
     linkReadyRed = true;
};
linkImageRed.src = "static/images/link_sprite65x65.png";
//USED FOR MAIN PLAYER
linkPlayer = new PlayerSprite(linkImage,60,60,{"default":[[0,2],[0,2],[0,2],[0,2],[0,2],[0,2],[0,2],[0,2],[60,2],[120,2]],
     														"down":[[0,262],[60,262],[120,262],[180,262],[240,262],[300,262],[360,262],[420,262],[480,262],[540,262]],
     														"up":[[0,390],[60,390],[120,390],[180,390],[240,390],[300,390],[360,390],[420,390],[480,390],[540,390]],
     														"left":[[0,330],[60,330],[120,330],[180,330],[240,330],[300,330],[360,330],[420,330],[480,330],[540,330]],
														"right":[[0,462],[60,462],[120,462],[180,462],[240,462],[300,462],[360,462],[420,462],[480,462],[540,462]]},
														2);
														
//COIN sprite
var coinImage = new Image();
var coinImgReady =false;
coinImage.onload = function() {   
     coinImgReady = true;
};	
coinImage.src = "static/images/coin.png";	


// Coin object builder
function coinObj(x, y) {
  this.x = x;
  this.y = y;
  this.height = 50;
  this.width = 50;
  this.sprite = new PlayerSprite(coinImage,100,100,{"default":[[0,0],[100,0],[200,0],[300,0],[400,0],[500,0],[600,0],[700,0],[800,0],[900,0]]},5);								;
  this.direction="default"
};
var theCoin = new coinObj(20,20);//default loc off screen until server sends loc
console.log(theCoin);
/*************end player images************************/



/***********SPRITE CLASS************************
***************************************************/
function PlayerSprite(img, width, height,keyFrames,speed){
  this.img = img;
  this.width = width;
  this.height = height;
  this.keyFrames = keyFrames;//{"up":[[x,y],[x,y]]} locations of keyframe imgs in sprite
  this.frameRate = [0];
  this.frameRate[1]= speed || 5;//speed of animation, similar to fps, #times to show a frame before moving to next keyframe
};

PlayerSprite.prototype.draw = function (x,y,direction,sw,sh) {
		var direction = direction || "default";
		var sw = sw || this.width;
		var sh = sh || this.height;
	//https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
	ctx.drawImage(//use global: ctx
		this.img,//Specifies the image
		this.keyFrames[direction][0][0],//The x coordinate top left corner of frame on sprite sheet
		this.keyFrames[direction][0][1],//The y coordinate top left corner of frame on sprite sheet
		this.width,//The width of the clipped image
		this.height,//The height of the clipped image
		x,//x coordinate where to place the image on the canvas
		y,//y coordinate where to place the image on the canvas
		sw,//The width to stretch or reduce the image to
		sh//The height to stretch or reduce the image to
	);
	this.frameRate[0]++
	if (this.frameRate[0]>this.frameRate[1]) { 
		this.keyFrames[direction].push(this.keyFrames[direction].shift())//move the keyFrame that was just rendered to the end
		this.frameRate[0]=0;		
		};
};
/******************************END SPRITE FUNCTIONS ******************/


// Game objects********************
//local player
var hero = {
	x:0,
	y:0,
	score:0,
	speed: 128, // movement in pixels per second
	height: 45,
	width: 45,
	imgIndex:0,//used to let other players what image you are from PLAYER_IMAGE_HOLDER
	playerImg:PLAYER_IMAGE_HOLDER[0],//default
	sprite:linkPlayer,
	direction:"default"
};

// player object builder for ***NETWORK CONNECTED PLAYERS****
function hero2(id, x, y,imgIdx) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.score = 0;
  this.imgIndex = imgIdx;
  this.playerImg = PLAYER_IMAGE_HOLDER[this.imgIndex];
  this.sprite=new PlayerSprite(linkImageRed,60,60,{"default":[[0,2],[0,2],[0,2],[0,2],[0,2],[0,2],[0,2],[0,2],[60,2],[120,2]],
     														"down":[[0,262],[60,262],[120,262],[180,262],[240,262],[300,262],[360,262],[420,262],[480,262],[540,262]],
     														"up":[[0,390],[60,390],[120,390],[180,390],[240,390],[300,390],[360,390],[420,390],[480,390],[540,390]],
     														"left":[[0,330],[60,330],[120,330],[180,330],[240,330],[300,330],[360,330],[420,330],[480,330],[540,330]],
														"right":[[0,462],[60,462],[120,462],[180,462],[240,462],[300,462],[360,462],[420,462],[480,462],[540,462]]},
														2);
  this.direction="default"
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
    theDpad[i].addEventListener('touchstart', dpad_move, false);
    theDpad[i].addEventListener('touchend', dpad_stop, false);
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

// Update game object positions
var update = function (modifier) {

	if (CollisionCheck(theCoin)){
				biteSound.currentTime=0;
		biteSound.play();
			console.log("point"); 	
			mySocket.send(JSON.stringify({"point":{"id":UNIQUE_PLAYER_ID}}));
	};
	
	var PreviousFramePosition_X = hero.x;
	var PreviousFramePosition_Y = hero.y;
	hero.direction = "default";
	if (38 in keysDown) { // Player holding UP
		if (hero.y >0) {//**first - check for wall collision
			hero.y -= hero.speed * modifier;
		}else {};//hit wall, down' allow further movement in this direction
		hero.direction = "up";
	}
	if (40 in keysDown) { // Player holding DOWN
		if (hero.y < (canvas.height-hero.height) ){//check for wall
			hero.y += hero.speed * modifier;		
		}else {};//hit wall, down' allow further movement in this direction
		hero.direction = "down";
	}
	if (37 in keysDown) { // Player holding LEFT
		if (hero.x > 0){//check for wall
			hero.x -= hero.speed * modifier;	
		}else {};//hit wall, down' allow further movement in this direction
		hero.direction = "left";
	}
	if (39 in keysDown) { // Player holding RIGHT
		if (hero.x < (canvas.width-hero.width)){
			hero.x += hero.speed * modifier;
		}else {};//hit wall, down' allow further movement in this direction
		hero.direction = "right";
	}
	//If player has made a move, tell the server so movement can be broadcast to other connected players
	//hero.imgIndex is broadcast so others know what image to use for you if you are new to the game.
	//should change this to only being broadcast on connection...TODO
	if (PreviousFramePosition_X !== hero.x || PreviousFramePosition_Y !== hero.y) {
		mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':Math.round(hero.x),'y':Math.round(hero.y),'ix':hero.imgIndex,'d':hero.direction}}));
	};
};

/***************** COLLISION CHECK FUNCTION *************/
function CollisionCheck (obj,obj2) {
	
		obj2 = obj2 || hero;// obj2 is set to player as default if no obj2 arg passed
		
		//determine if collision happened.  Check x axis, then y axis
		if ((obj2.x <= obj.x + obj.height) &&
			(obj.x <= obj2.x + obj2.height) &&
			(obj2.y <= obj.y + obj2.width) &&		
			(obj.y <= obj2.y + obj.width)){return true;
			}else{return false;};
};
// Draw everything
var render = function () {

	//background
	ctx.drawImage(bgImage, 0, 0);
	
	/**********SPRITE TEST********/
	if (linkReady) {
		hero.sprite.draw(hero.x, hero.y,hero.direction);
	}
	/****************************/
	//main player
	if (playerImgReady) {
		//ctx.drawImage(hero.playerImg, hero.x, hero.y);
	};
	if (coinImgReady) {
		theCoin.sprite.draw(theCoin.x, theCoin.y,theCoin.direction,50,50);
	};
	//IF Other players are connected draw them
	if (CONNECTED_PLAYER_OBJECTS.length>0) {
		for (var h=0;h<CONNECTED_PLAYER_OBJECTS.length;h++) {
			//ctx.drawImage(CONNECTED_PLAYER_OBJECTS[h].playerImg, CONNECTED_PLAYER_OBJECTS[h].x, CONNECTED_PLAYER_OBJECTS[h].y);	
			CONNECTED_PLAYER_OBJECTS[h].sprite.draw(CONNECTED_PLAYER_OBJECTS[h].x, CONNECTED_PLAYER_OBJECTS[h].y,CONNECTED_PLAYER_OBJECTS[h].direction);
			/*
			NEED SOLUTION: 
			reset because else if the other player doesn't send new move cmd the last frame shown will loop.  Which
			makes them look like they are running in place
			*/			
			//CONNECTED_PLAYER_OBJECTS[h].direction = "default";
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

	// repeat
	requestAnimationFrame(main);
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

//TODO
//add proper onload callbacks for images.  $(document).ready will
//fire when DOM is ready, not all images.
$(document).ready(function(){
	
	/*  TODO: send unique ID to server so it can associate with server generated request.sid */
	mySocket.send(JSON.stringify({"new":UNIQUE_PLAYER_ID}));
	
	//if user selects an avatar image
	$('button').click( function(e) {
		//get selection value
		var index = parseInt($(this).prop("value"));
		console.log(index);
		
		//set what idex in the player images is being used
		hero.imgIndex = index;
		
		//assign the image to the player
   	hero.playerImg = PLAYER_IMAGE_HOLDER[index]; 
   	
	   //update to others that you have changed your image
		mySocket.send(JSON.stringify({"ava":{"id":UNIQUE_PLAYER_ID,'ix':hero.imgIndex}}));//tell server what my moves are
		
	   //call main again to redo render if radio was clicked mid loop		
		//main();
		
	});

	//when you hold Phone in Portrait mode show dpad "gameboy" style
	if (screen.width>screen.height) {
		$(".dpad").css("display","none");
	};
	
	//HEAVY LIFTING COMM WITH SERVER DONE HERE
	mySocket.on('message', function(msg) {
		
			var JSONdata = JSON.parse(msg);
			
			if (Object.keys(JSONdata)[0] === 'point'){
				 theCoin.x = JSONdata["point"].x;
					theCoin.y = JSONdata["point"].y;
			};
			
			if (Object.keys(JSONdata)[0] === 'point'){
				theCoin.x = JSONdata["point"].x;
				theCoin.y = JSONdata["point"].y;
				if (JSONdata["point"].id===UNIQUE_PLAYER_ID){
					hero.score++;
					$('#myScore').html("My Score: "+hero.score);
				}else {
						//add 1 to players score
						CONNECTED_PLAYER_OBJECTS[PlayerLookUp[JSONdata["point"].id]].score++
						//$(#playerID).html("player "+player number+ "score"+ player score)
						$('#'+CONNECTED_PLAYER_OBJECTS[PlayerLookUp[JSONdata["point"].id]].id).html("Player "+(PlayerLookUp[JSONdata["point"].id]+1)+ " Score:"+CONNECTED_PLAYER_OBJECTS[PlayerLookUp[JSONdata["point"].id]].score);//update the displayed score	
					};
			};
			

			if (Object.keys(JSONdata)[0] === 'rem'){
				console.log(CONNECTED_PLAYER_OBJECTS);
				for (var h=0;h<=CONNECTED_PLAYER_OBJECTS.length;h++) {
					if(JSONdata.remove === CONNECTED_PLAYER_OBJECTS[h].id){
						CONNECTED_PLAYER_OBJECTS.splice(h,1);};
					};
			};
			
			
			//special msg header 'avatar' if they changed their avatar image
			if (Object.keys(JSONdata)[0] === 'ava'){
				//Check if the message in was the echo of players avatar change
			  if (JSONdata.avatar.id != UNIQUE_PLAYER_ID) {
			  	
				//get the index for the new image they are using
					var ix = parseInt(JSONdata.avatar.ix);
					
					//loop through the player objects
					for (var h=0;h<=CONNECTED_PLAYER_OBJECTS.length;h++) {
						
						//when you find the right player id, update the player img
						if(CONNECTED_PLAYER_OBJECTS[h].id === JSONdata.avatar.id ){
							CONNECTED_PLAYER_OBJECTS[h].playerImg = PLAYER_IMAGE_HOLDER[ix]//set img again		
						};		
					};
							main();//call again to update with the players new img
				};
			} 
			
			if(JSONdata.id != UNIQUE_PLAYER_ID) {
			//CHeck if the message in was the echo of players move
				var playerExists = false;
				//if not an echo, check if you have the player ID already in your CONNECTED_PLAYER_OBJECTS
				if (PlayerLookUp.hasOwnProperty(JSONdata.id)) {
						//if you DO have this player ID already, make true
						playerExists = true;
						console.log(PlayerLookUp[JSONdata.id]);
						var h = PlayerLookUp[JSONdata.id];
						// update the player object location on screen						
						CONNECTED_PLAYER_OBJECTS[h].x = JSONdata.x;
						CONNECTED_PLAYER_OBJECTS[h].y = JSONdata.y;
						CONNECTED_PLAYER_OBJECTS[h].direction = JSONdata.d;

					}else {
						//if you do not this player ID already, i.e. player newly connected to game
						playerExists=false;};
		 		
		 		
		 		//create a new player obj in CONNECTED_PLAYER_OBJECTS for the NEW player Id that was found
		 		if (!playerExists && JSONdata.id) {
		 			console.log("creatingPlayer");
		 			console.log(JSONdata);
		 			//builder takes (id, x,y,imgIdx), 
		 			//JSONdata.ix is an index number for the array of player images:PLAYER_IMAGE_HOLDER[]
		 			CONNECTED_PLAYER_OBJECTS.push(new hero2(JSONdata.id,JSONdata.x,JSONdata.y,parseInt(JSONdata.ix)));
		 			playerExists=true;//reset
		 			
		 			//create score area for player
		 			var Element = document.createElement("div");
		 			Element.setAttribute('id',JSONdata.id);
		 			Element.setAttribute('class',"score");
		 			Element.innerHTML = "Player "+(CONNECTED_PLAYER_OBJECTS.length)+" Score: 0";
		 			document.getElementById('scoreBoard').appendChild(Element);
		 			
		 			//put new player in the look up object, 
		 			//assign it's index in the CONNECTED_PLAYER_OBJECTS as value
		 			PlayerLookUp[JSONdata.id] = CONNECTED_PLAYER_OBJECTS.length-1;
		 			
		 		};
			 };
		  	
		});

	// Let's play this game!
	then = Date.now();//used for frame rate normalization
	PlacePlayer();
	main();
});

