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

var ALL_PLAYER_OBJECTS =[];//container for any connected players, local player always index 0
var PLAYER_INDEX = {};//used to quickly look up player index location in ALL_PLAYER_OBJECTS array


//function for generating a random uniqueID for the player
function randomString(length, chars) {
	//length of result, chars used
    var result = '';
    for (var i = length; i > 0; --i){result += chars[Math.floor(Math.random() * chars.length)];}
    return result;
}
var UNIQUE_PLAYER_ID =  randomString(6, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

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
var PLAYER_IMAGE_HOLDER=[];//global container for player images
var FIREBALL_IMAGE_HOLDER =[];//global container for fireball images

//IMAGE LOADING FUNCTION, Returns true when all ready
function LoadImages(imgFiles,A_global_img_container) {
	//FIX THIS ********* @!
	/* use JS promises to wait until all loaded then return true */
	for (var i = 0;i<imgFiles.length;i++) {
		A_global_img_container[i] = new Image();
		A_global_img_container[i].onload = function () {
			//doesn't show right i because for loop is faster than load time.
			//for example ends up showing 'image 5 loaded' five times
			console.log("image "+i+" loaded");
		};
		A_global_img_container[i].src = imgFiles[i];
		//if (i===imgFiles.length){return true;};
	};
	return true;
};
//Load player images
PlayerImagesReady = LoadImages(["static/images/link_sprite_green.png",
"static/images/link_sprite_red.png","static/images/link_sprite_blue.png",
"static/images/link_sprite_gray.png","static/images/link_sprite_yellow.png"],PLAYER_IMAGE_HOLDER);

//Load fireball images
FireballImagesReady = LoadImages(["static/images/fireball_red.png"],FIREBALL_IMAGE_HOLDER);

//load COIN Sprite image
var coinImage = new Image();
var coinImgReady =false;
coinImage.onload = function() {   
     coinImgReady = true;
};	
coinImage.src = "static/images/coin.png";						
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
  this.testMe = true;//DELETE when done, temp testing use
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

// player object builder for ***NETWORK CONNECTED PLAYERS****
function PlayerObjBuilder(id, x, y,height,width,imgIdx) {
  this.id = id;
  this.speed = 128; //pixels per second when moving
  this.x = x;//x coordinate of top left corner on canvas
  this.y = y;//y coordinate of top left corner on canvas
  this.height = height;//height size in pixels
  this.width = width;//width size in pixels
  this.score = 0;
  this.imgIndex = imgIdx;
  this.playerImg = PLAYER_IMAGE_HOLDER[this.imgIndex];
  this.fireballImg = FIREBALL_IMAGE_HOLDER[this.imgIndex];
  this.sprite = new Sprite(this.playerImg,this.height,this.width,
		{"default":{"x":0,"y":2,"frames":1,"layout":"horz","frameRate":20},
		"down":{"x":0,"y":262,"frames":10,"layout":"horz","frameRate":5},
		"up":{"x":0,"y":390,"frames":10,"layout":"horz","frameRate":5},
		 "right":{"x":0,"y":462,"frames":10,"layout":"horz","frameRate":5},
		 "left":{"x":0,"y":330,"frames":10,"layout":"horz","frameRate":5}});
  this.direction="default";
  //this.fireBall = false;//indicate there are fireballs active on screen
  this.fireBallsActive =[];//array of active fireballs on screen
  this.fireBallDelay = 0;//rate of fire delay
  this.fireBallDelay_count = 15;//frames that need to pass before next shot can happen
  this.maxFireBalls = 3;//max number of onscreen fireballs
  this.ShootFireBall = function (kd) {
  		var _direction ={x:0,y:0};//x,y of fireball will be multiplied by these x,y and it's MoveSpeed
		/*Key Codes:
		w = 87, a = 65, s = 83, d = 68*/
		if ( 87 in kd) {_direction.y = -1;};
		if ( 65 in kd) {_direction.x = -1;};
		if ( 83 in kd) {_direction.y = 1;};
		if ( 68 in kd) {_direction.x = 1;};
     this.fireBallsActive.push(new fireballObj(this.fireballImg,this.x+this.width/2,this.y+this.height/2,_direction));
     this.fireBall = true;//active fireball
	  this.fireBallDelay = 0;//reset delay
  };
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
  this.pointAmount = 100;  //point award for getting the coin
};
//fireball object builder
function fireballObj(img,x,y,td) {
  this.img = img;
  this.numFrames = 4;
  this.AnimationSpeed = 4;//lower is faster
  this.MoveSpeed = 170;//movement speed in pixels per frame
  this.x = x;
  this.y = y;
  this.height = 16;
  this.width = 16;
  //                FireBallSprite(img,height,width,x,y,totalFrames,frameRate,DeltaWidth)
  this.sprite = new FireBallSprite(this.img,this.height,this.width,0,0,this.numFrames,this.AnimationSpeed,[90,70,50,20,10,20,50,70,90,100]);
  this.travelDirection = td || {x:0,y:0};//x,y multipliers 0 means not travelling that direction
  this.damage = 10;
};
/************end game objects*************************/


// place player when first starting
var PlacePlayer = function () {
	ALL_PLAYER_OBJECTS[0].x = canvas.width / 2;
	ALL_PLAYER_OBJECTS[0].y = canvas.height / 2;
};

// Update game object positions
var update = function (modifier) {
	
	//Test for collision with the coin, if yes tell server, play sound
	if (CollisionCheck(theCoin)){
			ChaChingSound.currentTime=0;
			ChaChingSound.play();
			console.log("point"); 
			console.log(theCoin.cid);
			mySocket.send(JSON.stringify({"point":{"id":UNIQUE_PLAYER_ID,"cid":theCoin.cid}}));
	};
	
	var PreviousFramePosition_X = ALL_PLAYER_OBJECTS[0].x;
	var PreviousFramePosition_Y = ALL_PLAYER_OBJECTS[0].y;
	var ShotFired = false;//check if user shot fireball, tell server if you did
	
	if (ALL_PLAYER_OBJECTS[0].fireBallDelay <= ALL_PLAYER_OBJECTS[0].fireBallDelay_count) {
		ALL_PLAYER_OBJECTS[0].fireBallDelay ++;//this is being used as a timer to restrict rate of fire
	};
	/**************MOVEMENT ******************/
	if (38 in keysDown) { // Player holding UP
		if (ALL_PLAYER_OBJECTS[0].y >0) {//**first - check for wall collision
			ALL_PLAYER_OBJECTS[0].y -= ALL_PLAYER_OBJECTS[0].speed * modifier;
		}else {};//hit wall, down' allow further movement in this direction
		ALL_PLAYER_OBJECTS[0].direction = "up";		}
	if (40 in keysDown) { // Player holding DOWN
		if (ALL_PLAYER_OBJECTS[0].y < (canvas.height-ALL_PLAYER_OBJECTS[0].height) ){//check for wall
			ALL_PLAYER_OBJECTS[0].y += ALL_PLAYER_OBJECTS[0].speed * modifier;		
		}else {};//hit wall, down' allow further movement in this direction
		ALL_PLAYER_OBJECTS[0].direction = "down";		}
	if (37 in keysDown) { // Player holding LEFT
		if (ALL_PLAYER_OBJECTS[0].x > 0){//check for wall
			ALL_PLAYER_OBJECTS[0].x -= ALL_PLAYER_OBJECTS[0].speed * modifier;	
		}else {};//hit wall, down' allow further movement in this direction
		ALL_PLAYER_OBJECTS[0].direction = "left";		}
	if (39 in keysDown) { // Player holding RIGHT
		if (ALL_PLAYER_OBJECTS[0].x < (canvas.width-ALL_PLAYER_OBJECTS[0].width)){
			ALL_PLAYER_OBJECTS[0].x += ALL_PLAYER_OBJECTS[0].speed * modifier;
		}else {};//hit wall, down' allow further movement in this direction
		ALL_PLAYER_OBJECTS[0].direction = "right";		}
	/***********SHOOT FIREBALL*************/
	//Key Codes:
	//w = 87, a = 65, s = 83, d = 68
	if (87 in keysDown || 65 in keysDown ||83 in keysDown ||68 in keysDown ) {
		if (ALL_PLAYER_OBJECTS[0].fireBallDelay > ALL_PLAYER_OBJECTS[0].fireBallDelay_count) {
			if (ALL_PLAYER_OBJECTS[0].fireBallsActive.length < ALL_PLAYER_OBJECTS[0].maxFireBalls) {
				ALL_PLAYER_OBJECTS[0].ShootFireBall(keysDown);
				ShotFired = true;}}	}
	
	/************  FIREBALL LOCATION/COLLISION UPDATES  *************/
	/* Local player = ALL_PLAYER_OBJECTS[0] */
	/******************************************************************/
	for (var h=0;h<ALL_PLAYER_OBJECTS.length;h++) {
		
		for (var fb =0; fb <ALL_PLAYER_OBJECTS[h].fireBallsActive.length; fb++) {
		    
			//USED TO MAKE EASY FOR HUMAN TO READ
			var fireball = ALL_PLAYER_OBJECTS[h].fireBallsActive[fb];
			
			//if the fireball is off screen, remove
			if (fireball.y > canvas.height || fireball.y < 0 || fireball.x > canvas.width || fireball.x < 0) {
					ALL_PLAYER_OBJECTS[h].fireBallsActive.splice(fb,1);//remove the fireball
			}
			//fireball is onscreen, update movement
			else {
				fireball.x = fireball.x +(fireball.travelDirection.x *fireball.MoveSpeed*modifier);
				fireball.y = fireball.y +(fireball.travelDirection.y*fireball.MoveSpeed*modifier);
				
				//check if the localplayers fireball hit another player remove it if it did
				if(h === 0){
					for (var z=1;z<ALL_PLAYER_OBJECTS.length;z++) {
						if(CollisionCheck(fireball,ALL_PLAYER_OBJECTS[z])){
							ALL_PLAYER_OBJECTS[h].fireBallsActive.splice(fb,1);//remove the fireball
							};
						};
					};
				};
				
			//check if another player hit local player with their fireball
			if(h !== 0){
				if(CollisionCheck(ALL_PLAYER_OBJECTS[h].fireBallsActive[fb])){
					ALL_PLAYER_OBJECTS[h].fireBallsActive.splice(fb,1);//remove the fireball
					ALL_PLAYER_OBJECTS[0].score -= fireball.damage};
			};
		};
	};
    /*****************************/
	//*******update other players fireballs
	/*for (var h=0;h<ALL_PLAYER_OBJECTS.length;h++) {
			for (var fb =0; fb <ALL_PLAYER_OBJECTS[h].fireBallsActive.length; fb++)  {
					if (ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].y > canvas.height || ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].y < 0 || ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].x > canvas.width || ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].x < 0) {
					ALL_PLAYER_OBJECTS[h].fireBallsActive.splice(fb,1);//remove the fireball
					}else	{
						ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].x = ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].x +(ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].travelDirection.x *ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].MoveSpeed*modifier);
						ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].y = ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].y +(ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].travelDirection.y*ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].MoveSpeed*modifier);					
						//Check if other players fireball hit you					
						if(CollisionCheck(ALL_PLAYER_OBJECTS[h].fireBallsActive[fb])){
								ALL_PLAYER_OBJECTS[h].fireBallsActive.splice(fb,1);//remove the fireball
								ALL_PLAYER_OBJECTS[0].score -= fireball.damage};
						};								
			};			
		};

	*/	
	
	if (Object.keys(keysDown).length<1 && ALL_PLAYER_OBJECTS[0].direction !== "default"){
		ALL_PLAYER_OBJECTS[0].direction = "default"; /* USED SO THIS WON'T TRIGGER EVERY FRAME */
		mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':ALL_PLAYER_OBJECTS[0].x,'y':ALL_PLAYER_OBJECTS[0].y,'ix':ALL_PLAYER_OBJECTS[0].imgIndex,'d':ALL_PLAYER_OBJECTS[0].direction}}));
	}
	//If player has made a move, tell the server so movement can be broadcast to other connected players
	//ALL_PLAYER_OBJECTS[0].imgIndex is broadcast so others know what image to use for you if you are new to the game.
	//should change this to only being broadcast on connection...TODO
	if (PreviousFramePosition_X !== ALL_PLAYER_OBJECTS[0].x || PreviousFramePosition_Y !== ALL_PLAYER_OBJECTS[0].y || ShotFired) {
		if (ShotFired) {
			mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':Math.round(ALL_PLAYER_OBJECTS[0].x),'y':Math.round(ALL_PLAYER_OBJECTS[0].y),'ix':ALL_PLAYER_OBJECTS[0].imgIndex,'d':ALL_PLAYER_OBJECTS[0].direction,'f':keysDown}}));
		}else {
			mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':Math.round(ALL_PLAYER_OBJECTS[0].x),'y':Math.round(ALL_PLAYER_OBJECTS[0].y),'ix':ALL_PLAYER_OBJECTS[0].imgIndex,'d':ALL_PLAYER_OBJECTS[0].direction,'f':false}}));
		}	
	};
};


/***************** COLLISION CHECK FUNCTION *************/
function CollisionCheck (obj,obj2) {
//https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
		//Collision check for SPRITE based objects!
		obj2 = obj2 || ALL_PLAYER_OBJECTS[0];// obj2 is set to player as default if no obj2 arg passed
		//determine if collision happened.  Check x axis, then y axis
		if ((obj2.x < obj.x + obj.sprite.width) &&
			(obj.x < obj2.x + obj2.sprite.width) &&
			(obj2.y < obj.y + obj.sprite.height) &&		
			(obj.y < obj2.y + obj2.sprite.height)){return true;
			}else{return false;};
};

/************** DRAW EVERYTHING *********************/
var render = function () {

	//background
	ctx.drawImage(bgImage, 0, 0);
	//ctx.drawImage(ALL_PLAYER_OBJECTS[0].playerImg, 0, 0);
	
	/**********PLAYER SPRITES********/
	//main player
	//if (pRready && pGready) {
	if (PlayerImagesReady && FireballImagesReady) {
		//BOUNDING RECT FOR COLLISION DETECT TESTING	
		//ctx.strokeRect(ALL_PLAYER_OBJECTS[0].x,ALL_PLAYER_OBJECTS[0].y,ALL_PLAYER_OBJECTS[0].sprite.width,ALL_PLAYER_OBJECTS[0].sprite.height); 
		for (var h=0;h<ALL_PLAYER_OBJECTS.length;h++) {
			//render the local player
			ALL_PLAYER_OBJECTS[h].sprite.draw(ALL_PLAYER_OBJECTS[h].x, ALL_PLAYER_OBJECTS[h].y,ALL_PLAYER_OBJECTS[h].direction, ALL_PLAYER_OBJECTS[h].id);
		
			//render any projectiles
			for (var fb =0; fb <ALL_PLAYER_OBJECTS[h].fireBallsActive.length; fb++) {
				ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].sprite.draw(ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].x, ALL_PLAYER_OBJECTS[h].fireBallsActive[fb].y);//shoots a fire ball starting at this xy
			};
		}

	}
	/**************End player sprite render**************/
	if (coinImgReady) {
		//BOUNDING RECT FOR COLLISION DETECT TESTING
		//ctx.strokeRect(theCoin.x,theCoin.y,theCoin.sprite.width,theCoin.sprite.height); 
		theCoin.sprite.draw(theCoin.x, theCoin.y,50,50);
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

//create a new player obj in ALL_PLAYER_OBJECTS for the NEW player Id that was found
function createAplayer(JSONdata) {
		 			console.log("creatingPlayer");
		 			console.log(JSONdata);
		 			//builder takes (id, x,y,imgIdx), 
		 			//JSONdata.ix is an index number for the array of player images:PLAYER_IMAGE_HOLDER[]
		 			//NOTE: HARD CODED WIDTH, HEIGHT of 60px x 60px!!!!!!!!
		 			ALL_PLAYER_OBJECTS.push(new PlayerObjBuilder(JSONdata.id,JSONdata.x,JSONdata.y,60,60,parseInt(JSONdata.ix)));//parseInt(JSONdata.ix)));
		 			
		 			
		 			//create score area for player
		 			var Element = document.createElement("div");
		 			Element.setAttribute('id',JSONdata.id);
		 			Element.setAttribute('class',"score");
		 			Element.innerHTML = "Player "+(ALL_PLAYER_OBJECTS.length)+" Score: 0";
		 			document.getElementById('scoreBoard').appendChild(Element);
		 			
		 			//put new player in the look up object, 
		 			//assign it's index in the ALL_PLAYER_OBJECTS as value
		 			PLAYER_INDEX[JSONdata.id] = ALL_PLAYER_OBJECTS.length-1;
		 			
		 };

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

//TODO
//add proper onload callbacks for images.  $(document).ready will
//fire when DOM is ready, not all images.
$(document).ready(function(){
	
//build local player
//PlayerObjBuilder(UNIQUE_PLAYER_ID,x,y,height,width,index in PLAYER_IMAGE_HOLDER);
ALL_PLAYER_OBJECTS[0] = new PlayerObjBuilder(UNIQUE_PLAYER_ID,0,0,60,60,0);
console.log(ALL_PLAYER_OBJECTS[0]);
	/* send startup position to server so it can alert other players*/
	/* round x and y to reduce network traffic*/
	mySocket.send(JSON.stringify({'mov':{'id':UNIQUE_PLAYER_ID,'x':Math.round(ALL_PLAYER_OBJECTS[0].x),'y':Math.round(ALL_PLAYER_OBJECTS[0].y),'ix':ALL_PLAYER_OBJECTS[0].imgIndex,'d':ALL_PLAYER_OBJECTS[0].direction}}));
	
	//if user selects an avatar image
	$('button').click( function(e) {

		//set what index in the player images is being used
		var index = parseInt($(this).prop("value"));
	 
		//remake player object with new image color
   	ALL_PLAYER_OBJECTS[0] = new PlayerObjBuilder(UNIQUE_PLAYER_ID,ALL_PLAYER_OBJECTS[0].x,ALL_PLAYER_OBJECTS[0].y,60,60,index);
	   
	   //update to others that you have changed your image
		mySocket.send(JSON.stringify({"ava":{'id':UNIQUE_PLAYER_ID,'x':Math.round(ALL_PLAYER_OBJECTS[0].x),'y':Math.round(ALL_PLAYER_OBJECTS[0].y),'ix':index,'d':ALL_PLAYER_OBJECTS[0].direction}}));//tell server changed avatar color
		
	});

	//HEAVY LIFTING COMMUNICATIONS WITH SERVER DONE HERE
	mySocket.on('message', function(msg) {
		
			var JSONdata = JSON.parse(msg);
			/*
			99% of the time inbound messages are x,y movements or projectiles from other players
			player movements come in with one of the keys = 'id'
			check that the msg has an ID and that the id isn't the local players ID
			*/
			if(JSONdata.id != UNIQUE_PLAYER_ID && JSONdata.id) {
				var playerExists = false;
				//check if you have the player ID already in your ALL_PLAYER_OBJECTS
				if (PLAYER_INDEX.hasOwnProperty(JSONdata.id)) {
						//if you DO have this player ID already, make true
						playerExists = true;
						var h = PLAYER_INDEX[JSONdata.id];
						// update the player object location on screen						
						ALL_PLAYER_OBJECTS[h].x = JSONdata.x;
						ALL_PLAYER_OBJECTS[h].y = JSONdata.y;
						ALL_PLAYER_OBJECTS[h].direction = JSONdata.d;
						//check if they shot a fireball
						if (JSONdata.f) {
							ALL_PLAYER_OBJECTS[h].ShootFireBall(JSONdata.f);
						};
					}
				else if(!playerExists){
						//if you do not have this player ID already
						
						//match players ID with the index they will have in ALL_PLAYER_OBJECTS
						//because ALL_PLAYER_OBJECTS.length =1 when only a single player
						//obj exists but index of that player is actually 0 they are offset
						//that means for new players their index will be the same as current ALL_PLAYER_OBJECTS.length
						PLAYER_INDEX[JSONdata.id] = ALL_PLAYER_OBJECTS.length;
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
							ALL_PLAYER_OBJECTS[0].score+=theCoin.pointAmount;
							$('#myScore').html("My Score: "+ALL_PLAYER_OBJECTS[0].score);
						}else{
							//add 1 to players score
							var player = ALL_PLAYER_OBJECTS[PLAYER_INDEX[JSONdata["point"].id]]
							ALL_PLAYER_OBJECTS[PLAYER_INDEX[JSONdata["point"].id]].score+=theCoin.pointAmount
							//$(#playerID).html("player "+player number+ "score"+ player score)
							$('#'+player.id).html("Player "+(player.id)+ " Score:"+player.score);//update the displayed score	
						};
					};
          	//NOT ACTIVE!
            //eventually something like this needed to remove inactive or disconnected players
				if (msgkey === 'rem'){
					console.log(ALL_PLAYER_OBJECTS);
					for (var h=0;h<=ALL_PLAYER_OBJECTS.length;h++) {
						if(JSONdata.remove === ALL_PLAYER_OBJECTS[h].id){
							ALL_PLAYER_OBJECTS.splice(h,1);};
					};
			};
			
			//special msg header 'ava' if they changed their avatar image
			if (Object.keys(JSONdata)[0] === 'ava'){
				//Check if the message in was the echo of players avatar change
			  if (JSONdata[Object.keys(JSONdata)[0]].id != UNIQUE_PLAYER_ID) {
			  	var playerData = JSONdata[Object.keys(JSONdata)[0]];
			  	//look up the players index
			  	var playerIndex = PLAYER_INDEX[playerData.id];
			  	//get the player object for this ID
			  	var player = ALL_PLAYER_OBJECTS[playerIndex];
			   //replace with the updated player
			  	ALL_PLAYER_OBJECTS[playerIndex] = new PlayerObjBuilder(playerData.id,playerData.x,playerData.y,60,60,parseInt(playerData.ix));

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

