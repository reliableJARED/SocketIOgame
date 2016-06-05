#http://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent
#http://flask-socketio.readthedocs.org/en/latest/
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO
from flask.ext.socketio import emit, send
import time
import json
import random
import threading


PlayerWhoScored = 'none'
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

    
@app.route('/')
def index():
    print "new player entering game"
    return render_template('game_beta.html')


@socketio.on('connect', namespace='/')
def test_connect():
    print request.sid
    print "new player is connected"

    
@socketio.on('disconnect', namespace='/')
def test_disconnect():
    print 'player disconnected'
    #print "remove:" 
    #emit('message',json.dumps({"rem":players[request.sid]}),broadcast=True)
    #players.pop(request.sid,None)

@socketio.on('message')
def handle_message(data):
    dataIN = json.loads(data)
    specialKey = "mov"
    global PlayerWhoScored

    
    #player is broadcasting move
    if dataIN.iterkeys().next() == "mov":
	emit('message',json.dumps(dataIN[specialKey]),broadcast=True)
	
    #player is broadcasting avatar image update
    if dataIN.iterkeys().next() == "ava":
	emit('message',json.dumps(dataIN),broadcast=True)
    
    #new player connected
    if dataIN.iterkeys().next() == "new":
        pass

    if dataIN.iterkeys().next() == "point":
        pid = dataIN["point"]["id"]
        x = random.randint(1, 350)
        y = random.randint(1, 450)
        emit('message',json.dumps({"point":{"x":x,"y":y,"id":pid}}),broadcast=True)
    

if __name__ == '__main__':
    #CHANGE HOST
    ip = raw_input("Enter host ip to use: ")
    socketio.run(app,host=ip,port=8000)
