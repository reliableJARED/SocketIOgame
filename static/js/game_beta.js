//Tutorials:
/*
http://www.lostdecadegames.com/how-to-make-a-simple-html5-canvas-game/
http://jlongster.com/Making-Sprite-based-Games-with-Canvas
http://davetayls.me/blog/2013/02/11/drawing-sprites-with-canvas
http://www.williammalone.com/articles/create-html5-canvas-javascript-sprite-animation/
*/

//Global socket connection instance
mySocket = io.connect();//create new websocket, 

var ChaChingSound = new Audio();
ChaChingSound.src = ('static/sounds/ChaChing.mp3');//http://soundbible.com/mp3/Cash%20Register%20Cha%20Ching-SoundBible.com-184076484.mp3

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


/*Game Images
*******************************************************/
var PLAYER_IMAGE_HOLDER=[];//container for player images

//COIN Image
var coinImage = new Image();
var coinImgReady =false;
coinImage.onload = function() {   
     coinImgReady = true;
};	
coinImage.src = "static/images/coin.png";	

var playerGreen = new Image();
var pGready=false;
playerGreen.onload = function () {
	pGready = true;	
}
playerGreen.src="static/images/link_sprite65x65.png"; 
PLAYER_IMAGE_HOLDER[0] = playerGreen;

var playerRed = new Image();
var pRready = false;
playerRed.onload = function () {
	pRready = true;	
}
playerRed.src="static/images/link_sprite_red.png";
PLAYER_IMAGE_HOLDER[1] = playerRed;


													

// Coin object builder
function coinObj(x,y) {
  this.x = x;
  this.y = y;
  this.height = 100;
  this.width = 100;
  this.sprite = new Sprite(coinImage,this.height,this.width,
		{"default":{"x":0,"y":0,"frames":9,"layout":"horz","frameRate":2}});								;
  this.direction="default";
  this.cid = false;//server assigned coin id
};
var theCoin = new coinObj(-100,-100);//default loc off screen until server sends loc

/*************end images************************/



/***********SPRITE CLASS***************************
***************************************************/
function Sprite(img,height,width,keyFrames){
  this.img = img;
  this.width = width;
  this.height = height;
  this.frameCount = 1;//used to track what keyFrame you're on.  Multiplier for width or height
  this.rateCount = 0;//used to track speed of animation
  this.keyFrames = keyFrames;
  /*
  {"up":{x,y,frames,layout,frameRate}} 
  key: in this example "up" specifies to use associated sprite rules
  x:upper left x coord of corner on canvas
  y: upper left y coord of corner on canvas
  frames: number of keyframe (individual images) in the sprite
  layout: which direction the frames are layed out horizontal "horz" or vertical "vert"											
  frameRate: how fast should the images be rotated, the higher the number the slower the animation of the sprite
  */
};

Sprite.prototype.draw = function (x,y,direction,sx,sy) {
		var direction = direction || "default";
		var sx = sx || this.width;
		var sy = sy || this.height
		var shiftX=0; 
		var shiftY=0;
		this.rateCount++;
		if(this.keyFrames[direction].layout==="vert"){
			shiftY=this.height*this.frameCount;
		}else{shiftX=this.width*this.frameCount;};
		
	//https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
	ctx.drawImage(//use global: ctx
		this.img,//Specifies the image
		this.keyFrames[direction].x+shiftX,//The x coordinate top left corner of frame on sprite sheet
		this.keyFrames[direction].y+shiftY,//The y coordinate top left corner of frame on sprite sheet
		this.width,//The width of the keyFrame image
		this.height,//The height of the keyFrame image
		x,//x coordinate where to place the image on the canvas
		y,//y coordinate where to place the image on the canvas
		sx,//The width to stretch or reduce the image
		sy//The height to stretch or reduce the image
	);
	if(this.keyFrames[direction].frameRate<this.rateCount){
		this.rateCount=0;//reset
		this.frameCount++;//move to next frame
		if (this.frameCount>this.keyFrames[direction].frames) { 
			this.frameCount = 1;//reset	repeat sprite from beginning
	}}
};
/******************************END SPRITE FUNCTIONS ******************/



// Game objects********************
//local player
//PlayerObjBuilder(UNIQUE_PLAYER_ID,x,y,height,width,index in PLAYER_IMAGE_HOLDER);
var hero = new PlayerObjBuilder(UNIQUE_PLAYER_ID,0,0,60,60,0);

// player object builder for ***NETWORK CONNECTED PLAYERS****
function PlayerObjBuilder(id, x, y,height,width,imgIdx) {
  this.id = id;
  this.speed = 128; //pixels per second when moving
  this.x = x;
  this.y = y;
  this.height = height;
  this.width = width;
  this.score = 0;
  this.imgIndex = imgIdx;
  this.playerImg = PLAYER_IMAGE_HOLDER[this.imgIndex];
  this.sprite = new Sprite(this.playerImg,this.height,this.width,
		{"default":{"x":0,"y":2,"frames":1,"layout":"horz","frameRate":5},
		"down":{"x":0,"y":262,"frames":10,"layout":"horz","frameRate":5},
		"up":{"x":0,"y":390,"frames":10,"layout":"horz","frameRate":5},
		 "right":{"x":0,"y":462,"frames":10,"layout":"horz","frameRate":5},
		 "left":{"x":0,"y":330,"frames":10,"layout":"horz","frameRate":5}});
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

/*********End inputs*************/

// place player when first starting
var PlacePlayer = function () {
	hero.x = canvas.width / 2;
	hero.y = canvas.height / 2;
};

// Update game object positions
var update = function (modifier) {

	//Test for collision with the coin, if yes tell server, play sound
	if (CollisionCheck(theCoin)){
			ChaChingSound.currentTime=0;
			ChaChingSound.play();
			console.log("point"); 	
			mySocket.send(JSON.stringify({"point":{"id":UNIQUE_PLAYER_ID,"cid":theCoin.cid}}));
	};
	
	var PreviousFramePosition_X = hero.x;
	var PreviousFramePosition_Y = hero.y;
	
	
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
	if (Object.keys(keysDown).length<1){
		hero.direction = "default";
		mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':Math.round(hero.x),'y':Math.round(hero.y),'ix':hero.imgIndex,'d':hero.direction}}));
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
	//main player
	if (pRready && pGready) {
		hero.sprite.draw(hero.x, hero.y,hero.direction);
		//IF Other players are connected draw them
		if (CONNECTED_PLAYER_OBJECTS.length>0) {
			for (var h=0;h<CONNECTED_PLAYER_OBJECTS.length;h++) {
				CONNECTED_PLAYER_OBJECTS[h].sprite.draw(CONNECTED_PLAYER_OBJECTS[h].x, CONNECTED_PLAYER_OBJECTS[h].y,CONNECTED_PLAYER_OBJECTS[h].direction);

		};
	};
	}
	/****************************/

	if (coinImgReady) {
		theCoin.sprite.draw(theCoin.x, theCoin.y,theCoin.direction,35,35);
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
	
	/* send unique ID to server so it can alert other players*/
	mySocket.send(JSON.stringify({"new":UNIQUE_PLAYER_ID}));
	
	//if user selects an avatar image
	$('button').click( function(e) {
		//get selection value
		var index = parseInt($(this).prop("value"));
		
		//set what idex in the player images is being used
		hero.imgIndex = index;
		
		//assign the image to the player
   	hero.playerImg = PLAYER_IMAGE_HOLDER[index]; 
   	
	   //update to others that you have changed your image
		mySocket.send(JSON.stringify({"ava":{"id":UNIQUE_PLAYER_ID,'ix':hero.imgIndex}}));//tell server what my moves are
		
	});

	//HEAVY LIFTING COMM WITH SERVER DONE HERE
	mySocket.on('message', function(msg) {
		
			var JSONdata = JSON.parse(msg);
			/*
			99% of the time inbound messages are x,y movements from other players
			player movements come in one of the keys = 'id'
			*/
			if(JSONdata.id != UNIQUE_PLAYER_ID) {
			//CHeck if the message in was the echo of players move
				var playerExists = false;
				//if not an echo, check if you have the player ID already in your CONNECTED_PLAYER_OBJECTS
				if (PlayerLookUp.hasOwnProperty(JSONdata.id)) {
						//if you DO have this player ID already, make true
						playerExists = true;
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
		 			//NOTE: HARD CODED WIDTH, HEIGHT of 60px !!!!!!!!
		 			CONNECTED_PLAYER_OBJECTS.push(new PlayerObjBuilder(JSONdata.id,JSONdata.x,JSONdata.y,60,60,parseInt(JSONdata.ix)));
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
			/*
			NON MOVEMENT TYPE INBOUND MESSAGES
			*/			
			if (Object.keys(JSONdata)[0] !== 'id') {
				if (Object.keys(JSONdata)[0] === 'coin'){
					theCoin.x = JSONdata["coin"].x;
					theCoin.y = JSONdata["coin"].y;
					theCoin.id = JSONdata["coin"].cid;};
				
				if (Object.keys(JSONdata)[0] === 'point'){
					theCoin.x = JSONdata["point"].x;
					theCoin.y = JSONdata["point"].y;
					theCoin.id = JSONdata["point"].cid;
					if (JSONdata["point"].id===UNIQUE_PLAYER_ID){
						hero.score++;
						$('#myScore').html("My Score: "+hero.score);
					}else{
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
		}
			
		  	
	});

	// Let's play this game!
	then = Date.now();//used for frame rate normalization
	PlacePlayer();
	main();
});

