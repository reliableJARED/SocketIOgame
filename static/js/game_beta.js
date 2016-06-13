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
var PlayerLookUp = {};//used to quickly look up player index location in CONNECTED_PLAYER_OBJECTS array


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

//IMAGE LOADING FUNCTION, Returns true when all ready
function LoadPlayerImages(imgFiles) {
	//5 colors of PLAYER Sprites
	for (var i = 0;i<5;i++) {
		PLAYER_IMAGE_HOLDER[i] = new Image();
		PLAYER_IMAGE_HOLDER[i].onload = function () {
			console.log("image "+i+" loaded");
		};
		PLAYER_IMAGE_HOLDER[i].src = imgFiles[i];
		if (i===4) {return true;}
	};
};
PlayerImagesReady = LoadPlayerImages(["static/images/link_sprite_green.png",
"static/images/link_sprite_red.png","static/images/link_sprite_blue.png",
"static/images/link_sprite_gray.png","static/images/link_sprite_yellow.png"]);
//COIN Sprite
var coinImage = new Image();
var coinImgReady =false;
coinImage.onload = function() {   
     coinImgReady = true;
};	
coinImage.src = "static/images/coin.png";	

//Fireball Sprite
var fireBallImage = new Image();
var fireBallImgReady =false;
fireBallImage.onload = function() {   
     fireBallImage = true;
};	
fireBallImage.src = "static/images/fireball_red.png";	
							
/*************end images************************/



/***********SPRITE CLASSES***************************
***************************************************/
function Sprite(img,height,width,keyFrames){
  this.img = img;
  this.width = width;
  this.height = height;
  this.frameCount = 1;//used to track what keyFrame you're on.  Multiplier for width or height DON"T USE 0
  this.rateCount = 0;//used to track speed of animation
  this.current = 'default';//used to trach what keyFrame is currently being used
  this.keyFrames = keyFrames;
  /****** keyFrames ***********
  {"up":{x,y,frames,layout,frameRate}} 
  key: in this example "up" specifies to use associated sprite rules
  x:upper left x coord of corner on canvas
  y: upper left y coord of corner on canvas
  frames: number of keyframe (individual images) in the sprite
  layout: which direction the frames are layed out horizontal "horz" or vertical "vert"											
  frameRate: how fast should the images be rotated, the higher the number the slower the animation of the sprite
  */
};

Sprite.prototype.draw = function (x,y,direction,hoverText,sx,sy) {
		var direction = direction || 'default';
		//var sx = sx || this.width; //optional img stretch/shrink args
		//var sy = sy || this.height;//optional img stretch/shrink args
		var hoverText = hoverText || false;//put text above character
		
		//test if still working on the same set of keyFrames, else reset counters
		if (this.current !== direction){
			this.current = direction;
			this.rateCount=0;//reset
			this.frameCount = 1;//reset	repeat sprite from beginning
		};
		
		/***********************************
		Functionality to allow vertical or horizontal traversing of sprite sheet
		commented out for now, only horz is needed for sprites being used
		**************************************/
		/*
		var shiftX=0; //used to move along sprite sheet horizontal
		var shiftY=0;//used to move along sprite sheet vertical
		
		if(this.keyFrames[direction].layout==="vert"){
			shiftY=this.height*this.frameCount;
		}else{shiftX=this.width*this.frameCount;};
		*/
		var shiftX=this.width*this.frameCount;//remove if using vert/horz functionality above
		
	//https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
	ctx.drawImage(//use global: ctx
		this.img,//Specifies the image
		this.keyFrames[direction].x+shiftX,//The x coordinate top left corner of frame on sprite sheet
		this.keyFrames[direction].y,//+shiftY,//The y coordinate top left corner of frame on sprite sheet
		this.width,//The width of the keyFrame image
		this.height,//The height of the keyFrame image
		x,//x coordinate where to place the image on the canvas
		y,//y coordinate where to place the image on the canvas
		this.width, //sx,//The width to stretch or reduce the image
		this.height //sy//The height to stretch or reduce the image
	);
	//put text above player sprite
	if (hoverText && document.getElementById('showName').checked) {
		ctx.fillStyle = 'white';
		ctx.font = "16px Arial";
		ctx.fillText(hoverText,x,y);
	};
	this.rateCount++;
	if(this.keyFrames[direction].frameRate<=this.rateCount){
		this.rateCount = 0;//reset
		this.frameCount++;//move to next frame
		if (this.frameCount>=this.keyFrames[direction].frames) { 
			this.frameCount = 1;//reset	repeat sprite from beginning
	}}
};

function CoinSprite(img,height,width,x,y,totalFrames,frameRate,DeltaWidth){
  this.img = img;//the coin image
  this.x = x;//starting x position on sprite sheet, typically it's 0
  this.y = y;//starting y position on sprite sheet, typically it's 0
  this.width = width;//width of coin img in sprite in pixels used in collision detection
  this.height = height;//height of coin img in sprite in pixels used in collision detection
  this.w = this.width;//original width property holder, used when rendered size of coin changes and collision needs to change
  this.h = this.height;//original height property holder, used when rendered size of coin changes and collision needs to change
  this.totalFrames = totalFrames;//total number of frames in the sprite sheet
  this.frameCount = 0;//used to track what frame you're on
  this.frameRate = frameRate;
  this.frameRateCount = 0;//used to track animation speed
  this.DeltaWidth = DeltaWidth;//[100,80,60,40]array used to adjust the width used in collision detection as coin spins, units pixels.
};
CoinSprite.prototype.draw = function(x,y,sx,sy){
	var sx = sx || this.w;//apparent width of coin when rendered, in pixels
	var sy = sy || this.h;//apparent height of coin when rendered, in pixels
	
	//if the rendered size of the coin is different than the height/width of coin need to adjust
	//so that collision detection is correct.  collision detection relies on this.width and this.height
	if (sx !== this.width || sy !== this.height){
		this.width = sx*((this.DeltaWidth[this.frameCount])/this.w);
		this.height = sy;
	}else{this.width = this.width*((this.DeltaWidth[this.frameCount])/this.width);}
	//https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
	ctx.drawImage(//use global: ctx
		this.img,//Specifies the image
		(this.w*this.frameCount),//The x coordinate top left corner of frame on sprite sheet
		this.y,//The y coordinate top left corner of frame on sprite sheet
		this.w,//The width of the keyFrame image
		this.h,//The height of the keyFrame image
		x,//x coordinate where to place the image on the canvas
		y,//y coordinate where to place the image on the canvas
		sx,//The width to stretch or reduce the image
		sy//The height to stretch or reduce the image
	);
	this.frameRateCount++;
	if (this.frameRateCount>=this.frameRate) {
		this.frameRateCount =  0;//reset
		this.frameCount++;//move to next frame
			if (this.frameCount>=this.totalFrames){
				this.frameCount = 0;//reset
			};
	};
	
}

function FireBallSprite(img,height,width,x,y,totalFrames,frameRate,DeltaWidth){
  this.img = img;//the fb image
  this.x = x;//starting x position on sprite sheet, typically it's 0
  this.y = y;//starting y position on sprite sheet, typically it's 0
  this.width = width;//width of fb img in sprite in pixels used in collision detection
  this.height = height;//height of fb img in sprite in pixels used in collision detection
  this.totalFrames = totalFrames;//total number of frames in the sprite sheet
  this.frameCount = 0;//used to track what frame you're on
  this.frameRate = frameRate;
  this.frameRateCount = 0;//used to track animation speed
  this.DeltaWidth = DeltaWidth;//[100,80,60,40]array used to adjust the width used in collision detection as coin spins, units pixels.
};
FireBallSprite.prototype.draw = function(x,y){
	//https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
	ctx.drawImage(//use global: ctx
		this.img,//Specifies the image
		(this.width*this.frameCount),//The x coordinate top left corner of frame on sprite sheet
		this.y,//The y coordinate top left corner of frame on sprite sheet
		this.width,//The width of the keyFrame image
		this.height,//The height of the keyFrame image
		x,//x coordinate where to place the image on the canvas
		y,//y coordinate where to place the image on the canvas
		this.width,//The width to stretch or reduce the image
		this.height//The height to stretch or reduce the image
	);
	this.frameRateCount++;
	if (this.frameRateCount>=this.frameRate) {
		this.frameRateCount =  0;//reset
		this.frameCount++;//move to next frame
			if (this.frameCount>=this.totalFrames){
				this.frameCount = 0;//reset
			};
	};
	
}
/******************************END SPRITE CLASSES ******************/

// **************GAME OBJECTS********************
// coinObj(img,x-canvas,y-canvas,h-sprite,w-sprite,numFrames in sprite,animation speed-lower is faster)
var theCoin = new coinObj(coinImage,-100,-100,100,100,9,4);//default loc off screen until server sends loc
console.log(theCoin);
//fireballObj(img,x-canvas,y-canvas,h-sprite,w-sprite,numFrames in sprite,animation speed-lower is faster)
var fireBall = new fireballObj(fireBallImage,200,200,16,16,4,2);
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
		{"default":{"x":0,"y":2,"frames":1,"layout":"horz","frameRate":20},
		"down":{"x":0,"y":262,"frames":10,"layout":"horz","frameRate":5},
		"up":{"x":0,"y":390,"frames":10,"layout":"horz","frameRate":5},
		 "right":{"x":0,"y":462,"frames":10,"layout":"horz","frameRate":5},
		 "left":{"x":0,"y":330,"frames":10,"layout":"horz","frameRate":5}});
  this.direction="default";
  this.fireBall = false;//shoots a fire ball starting at this xy
  this.fireBallsActive =[];//array of active fireballs on screen
};

// Coin object builder
function coinObj(img,x,y,h,w,numFrames,speed) {
  this.img = img;
  this.numFrames = numFrames;
  this.speed = speed;
  this.x = x;
  this.y = y;
  this.height = h;
  this.width = w;
  //                CoinSprite(img,height,width,x,y,totalFrames,frameRate,DeltaWidth)
  this.sprite = new CoinSprite(this.img,this.height,this.width,0,0,this.numFrames,this.speed,[90,70,50,20,10,20,50,70,90,100]);
  this.direction="default";
  this.cid = 0;//server assigned coin id
};
//fireball object builder
function fireballObj(img,x,y,h,w,numFrames,AnimationSpeed,td) {
  this.img = img;
  this.numFrames = numFrames;
  this.AnimationSpeed = AnimationSpeed;
  this.MoveSpeed = 250;//movement speed in pixels per frame
  this.x = x;
  this.y = y;
  this.height = h;
  this.width = w;
  //                FireBallSprite(img,height,width,x,y,totalFrames,frameRate,DeltaWidth)
  this.sprite = new FireBallSprite(this.img,this.height,this.width,0,0,this.numFrames,this.AnimationSpeed,[90,70,50,20,10,20,50,70,90,100]);
  this.travelDirection = td || [0,0];//x,y multipliers 0 means not travelling that direction
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
	//update coin size based on what is being shown
	//theCoin.width = theCoin.sprite.DeltaWidth[theCoin.sprite.frameCount];
	
	if (CollisionCheck(theCoin)){
			ChaChingSound.currentTime=0;
			ChaChingSound.play();
			console.log("point"); 
			console.log(theCoin.cid);
			mySocket.send(JSON.stringify({"point":{"id":UNIQUE_PLAYER_ID,"cid":theCoin.cid}}));
	};
	
	var PreviousFramePosition_X = hero.x;
	var PreviousFramePosition_Y = hero.y;
	
	/**************MOVEMENT ******************/
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
	/***********SHOOT FIREBALL*************/
	if (32 in keysDown) {
		if (hero.fireBallsActive.length <5) {
			//fireballObj(img,x-canvas,y-canvas,h-sprite,w-sprite,numFrames in sprite,animation speed-lower is faster,travelDirection)
			hero.fireBallsActive.push(new fireballObj(fireBallImage,hero.x,hero.y,16,16,4,2,fireBallDirection()));//add to a fireball obj array
			hero.fireBall = true;//shoot fireball
		};
		
	}	
	/************FIREBALL LOCATION*************/
	if (hero.fireBall) {	
	console.log(hero.fireBallsActive);
	console.log(hero.fireBallsActive[0]);
		for (var fb =0; fb <hero.fireBallsActive.length; fb++) {
			hero.fireBallsActive[fb].x = hero.fireBallsActive[fb].x * hero.fireBallsActive[fb].travelDirection[0] + hero.fireBallsActive[fb].MoveSpeed;
			hero.fireBallsActive[fb].y = hero.fireBallsActive[fb].y * hero.fireBallsActive[fb].travelDirection[1] + hero.fireBallsActive[fb].MoveSpeed;
			/*if (hero.fireBallsActive[fb].y > canvas.height || hero.fireBallsActive[fb].y < canvas.height ) {
				hero.fireBallsActive.splice(fb,1);//remove the fireball
			}
			if (hero.fireBallsActive[fb].x > canvas.width || hero.fireBallsActive[fb].x < canvas.width ) {
				hero.fireBallsActive.splice(fb,1);//remove the fireball
			}*/
			
		}
	};
	
	if (Object.keys(keysDown).length<1 && hero.direction !== "default"){
		hero.direction = "default";
		/* THIS SHOULDN"T TRIGGER EVERY FRAME */
		mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':Math.round(hero.x),'y':Math.round(hero.y),'ix':hero.imgIndex,'d':hero.direction}}));
	}
	//If player has made a move, tell the server so movement can be broadcast to other connected players
	//hero.imgIndex is broadcast so others know what image to use for you if you are new to the game.
	//should change this to only being broadcast on connection...TODO
	if (PreviousFramePosition_X !== hero.x || PreviousFramePosition_Y !== hero.y) {
		mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':Math.round(hero.x),'y':Math.round(hero.y),'ix':hero.imgIndex,'d':hero.direction}}));
	};
};
/*************FireBall Travel Direction *****/
function fireBallDirection() {
	var _direction =[0,0];//x,y of fire ball will be multiplied by these and it's speed
			/*
		Key Codes:
		w = 87, a = 65, s = 83, d = 68
		*/
	if ( 87 in keysDown) {_direction[1] = 1;};
	if ( 65 in keysDown) {_direction[0] = 1;};
	if ( 83 in keysDown) { _direction[0] = 1;};
	if ( 68 in keysDown) {_direction[1] = 1;};
	
	return _direction;
}


/***************** COLLISION CHECK FUNCTION *************/
function CollisionCheck (obj,obj2) {
//Collision check for SPRITE based objects!
		obj2 = obj2 || hero;// obj2 is set to player as default if no obj2 arg passed
		//console.log("coin:"+obj.sprite.width);
		//determine if collision happened.  Check x axis, then y axis
		if ((obj2.x <= obj.x + obj.sprite.height) &&
			(obj.x <= obj2.x + obj2.sprite.height) &&
			(obj2.y <= obj.y + obj2.sprite.width) &&		
			(obj.y <= obj2.y + obj.sprite.width)){return true;
			}else{return false;};
};
// Draw everything
var render = function () {

	//background
	ctx.drawImage(bgImage, 0, 0);
	
	/**********SPRITE TEST********/
	//main player
	//if (pRready && pGready) {
	if (PlayerImagesReady) {
		//BOUNDING RECT FOR COLLISION DETECT TESTING
		ctx.strokeRect(hero.x,hero.y,hero.sprite.width,hero.sprite.height); 
		
		hero.sprite.draw(hero.x, hero.y,hero.direction, hero.id);
		//IF Other players are connected draw them
		if (CONNECTED_PLAYER_OBJECTS.length>0) {
			for (var h=0;h<CONNECTED_PLAYER_OBJECTS.length;h++) {
				CONNECTED_PLAYER_OBJECTS[h].sprite.draw(CONNECTED_PLAYER_OBJECTS[h].x, CONNECTED_PLAYER_OBJECTS[h].y,CONNECTED_PLAYER_OBJECTS[h].direction,CONNECTED_PLAYER_OBJECTS[h].id);

				};
		};
	}
	/****************************/

	if (coinImgReady) {
		ctx.strokeRect(theCoin.x,theCoin.y,theCoin.sprite.width,theCoin.sprite.height); 
		theCoin.sprite.draw(theCoin.x, theCoin.y,50,50);
		};
	if (hero.fireBall) {
		//console.log("fireball");
		fireBall.sprite.draw(hero.x, hero.y);//shoots a fire ball starting at this xy
		//console.log(hero.fireBallsActive[0].sprite);
		//hero.fireBallsActive[0].sprite.draw(hero.x, hero.y);//shoots a fire ball starting at this xy
		/*
		for (var fb =0; fb <hero.fireBallsActive.length; fb++) {
			console.log(hero.fireBallsActive[fb].x);
			console.log(hero.fireBallsActive[fb].y);
			console.log(hero.fireBallsActive[fb].sprite);
			hero.fireBallsActive[fb].sprite.draw(200, 200);//shoots a fire ball starting at this xy
		};*/
	};
		/*
	if (fireBallImage) {
		fireBall.sprite.draw(fireBall.x, fireBall.y);
		};*/
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

//create a new player obj in CONNECTED_PLAYER_OBJECTS for the NEW player Id that was found
function createAplayer(JSONdata) {
		 			console.log("creatingPlayer");
		 			console.log(JSONdata);
		 			//builder takes (id, x,y,imgIdx), 
		 			//JSONdata.ix is an index number for the array of player images:PLAYER_IMAGE_HOLDER[]
		 			//NOTE: HARD CODED WIDTH, HEIGHT of 60px x 60px!!!!!!!!
		 			CONNECTED_PLAYER_OBJECTS.push(new PlayerObjBuilder(JSONdata.id,JSONdata.x,JSONdata.y,60,60,parseInt(JSONdata.ix)));//parseInt(JSONdata.ix)));
		 			
		 			
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

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

//TODO
//add proper onload callbacks for images.  $(document).ready will
//fire when DOM is ready, not all images.
$(document).ready(function(){
	
	/* send startup position to server so it can alert other players*/
	mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':Math.round(hero.x),'y':Math.round(hero.y),'ix':hero.imgIndex,'d':hero.direction}}));
	
	//if user selects an avatar image
	$('button').click( function(e) {
		//get selection value
		var index = parseInt($(this).prop("value"));
		
		//set what index in the player images is being used
	//	hero.imgIndex = index;
		
		//assign the image to the player
//		hero.playerImg = PLAYER_IMAGE_HOLDER[index];
		 
		//remake player object with new image color
   	hero = new PlayerObjBuilder(UNIQUE_PLAYER_ID,hero.x,hero.y,60,60,index);
	   
	   //update to others that you have changed your image
		mySocket.send(JSON.stringify({"ava":{'id':UNIQUE_PLAYER_ID,'x':Math.round(hero.x),'y':Math.round(hero.y),'ix':index,'d':hero.direction}}));//tell server changed avatar color
		
	});

	//HEAVY LIFTING COMMUNICATIONS WITH SERVER DONE HERE
	mySocket.on('message', function(msg) {
		
			var JSONdata = JSON.parse(msg);
			/*
			99% of the time inbound messages are x,y movements from other players
			player movements come in with one of the keys = 'id'
			check that the msg has an ID and that the id isn't the local players ID
			*/
			if(JSONdata.id != UNIQUE_PLAYER_ID && JSONdata.id) {
				var playerExists = false;
				//check if you have the player ID already in your CONNECTED_PLAYER_OBJECTS
				if (PlayerLookUp.hasOwnProperty(JSONdata.id)) {
						//if you DO have this player ID already, make true
						playerExists = true;
						var h = PlayerLookUp[JSONdata.id];
						// update the player object location on screen						
						CONNECTED_PLAYER_OBJECTS[h].x = JSONdata.x;
						CONNECTED_PLAYER_OBJECTS[h].y = JSONdata.y;
						CONNECTED_PLAYER_OBJECTS[h].direction = JSONdata.d;

					}
				else if(!playerExists){
						//if you do not have this player ID already
						
						//match players ID with the index they will have in CONNECTED_PLAYER_OBJECTS
						//because CONNECTED_PLAYER_OBJECTS.length =1 when only a single player
						//obj exists but index of that player is actually 0 they are offset
						//that means for new players their index will be the same as current CONNECTED_PLAYER_OBJECTS.length
						PlayerLookUp[JSONdata.id] = CONNECTED_PLAYER_OBJECTS.length;
						//create a player object for this ID
						createAplayer(JSONdata);
						playerExists = true;//reset
					};
			 };
			/*
			NON MOVEMENT TYPE INBOUND MESSAGES
			THEY WILL NOT HAVE 'ID' as one of the keys
			*/			
			//if (Object.keys(JSONdata)[0] !== 'id') {
			if (!JSONdata.id){	
			//get the top json key.  messages come in format {msgKey:{the message json}}
			var msgkey = Object.keys(JSONdata)[0];
				if (msgkey === 'coin'){
						theCoin.x = JSONdata[msgkey].x;
						theCoin.y = JSONdata[msgkey].y;
						theCoin.cid = JSONdata[msgkey].cid;}
				
				if (msgkey === 'point'){
						theCoin.x = JSONdata[msgkey].x;
						theCoin.y = JSONdata[msgkey].y;
						theCoin.cid = JSONdata[msgkey].cid;
					
						if (JSONdata[msgkey].id===UNIQUE_PLAYER_ID){
							hero.score++;
							$('#myScore').html("My Score: "+hero.score);
						}else{
							//add 1 to players score
							var player = CONNECTED_PLAYER_OBJECTS[PlayerLookUp[JSONdata["point"].id]]
							CONNECTED_PLAYER_OBJECTS[PlayerLookUp[JSONdata["point"].id]].score++
							//$(#playerID).html("player "+player number+ "score"+ player score)
							$('#'+player.id).html("Player "+(player.id)+ " Score:"+player.score);//update the displayed score	
						};
					};
          //NOT ACTIVE!
          //eventually something like this needed to remove inactive or disconnected players
				if (msgkey === 'rem'){
					console.log(CONNECTED_PLAYER_OBJECTS);
					for (var h=0;h<=CONNECTED_PLAYER_OBJECTS.length;h++) {
						if(JSONdata.remove === CONNECTED_PLAYER_OBJECTS[h].id){
							CONNECTED_PLAYER_OBJECTS.splice(h,1);};
					};
			};
			
			//special msg header 'ava' if they changed their avatar image
			if (Object.keys(JSONdata)[0] === 'ava'){
				//Check if the message in was the echo of players avatar change
			  if (JSONdata[Object.keys(JSONdata)[0]].id != UNIQUE_PLAYER_ID) {
			  	var playerData = JSONdata[Object.keys(JSONdata)[0]];
			  	//look up the players index
			  	var playerIndex = PlayerLookUp[playerData.id];
			  	//get the player object for this ID
			  	var player = CONNECTED_PLAYER_OBJECTS[playerIndex];
			   //replace with the updated player
			  	CONNECTED_PLAYER_OBJECTS[playerIndex] = new PlayerObjBuilder(playerData.id,playerData.x,playerData.y,60,60,parseInt(playerData.ix));

				//main();//call again to update with the players new img
				};
			 } 
		}
			
		  	
	});

	// Let's play this game!
	then = Date.now();//used for frame rate normalization
	PlacePlayer();
	main();
});

