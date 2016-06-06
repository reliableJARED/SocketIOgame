#http://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent
#http://flask-socketio.readthedocs.org/en/latest/
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO
from flask.ext.socketio import emit, send
import time
import json
import random
import threading



app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

global coinCount
coinCount = [1,20,20]#count,x,y
global playersPlaying
playersPlaying = 0
def coinGen():
    global coinCount
    coinCount[0] = coinCount[0]+1
    coinCount[1] = random.randint(1, 350)
    coinCount[2] = random.randint(1, 450)
    
@app.route('/')
def index():
    print "new player entering game"
    return render_template('game_beta.html')

@socketio.on('connect', namespace='/')
def test_connect():
    global coinCount
    print request.sid
    print "new player is connected"
    emit('message',json.dumps({"coin":{"cid":coinCount[0],"x":coinCount[1],"y":coinCount[2]}}),broadcast=True)

    
@socketio.on('disconnect', namespace='/')
def test_disconnect():
    print 'player disconnected'

@socketio.on('message')
def handle_message(data):
    global coinCount
    dataIN = json.loads(data)
    specialKey = "mov"
    
    #player is broadcasting move
    if dataIN.iterkeys().next() == "mov":
	emit('message',json.dumps(dataIN[specialKey]),broadcast=True)
	
    #player is broadcasting avatar image update
    if dataIN.iterkeys().next() == "ava":
	emit('message',json.dumps(dataIN),broadcast=True)
    
    #new player connected
    if dataIN.iterkeys().next() == "new":
        pass
    
    #point scored
    if dataIN.iterkeys().next() == "point":
        coinGen()
        emit('message',json.dumps({"point":{"x":coinCount[1],"y":coinCount[2],"id":pid,"cid":coinCount[0]}}),broadcast=True)
        '''
        print "POINT"
        print coinCount
        print dataIN
        pid = dataIN["point"]["id"]
        cid = dataIN["point"]["cid"]
        if int(cid) == coinCount[0] or coinCount[0] ==1: 
            coinGen()
            emit('message',json.dumps({"point":{"x":coinCount[1],"y":coinCount[2],"id":pid,"cid":coinCount[0]}}),broadcast=True)
        '''

if __name__ == '__main__':
    #CHANGE HOST
    ip = raw_input("Enter host ip to use: ")
    socketio.run(app,host=ip,port=8000)
