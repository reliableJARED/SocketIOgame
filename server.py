#http://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent
#http://flask-socketio.readthedocs.org/en/latest/
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO
from flask.ext.socketio import emit, send
import time
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)
           		
#player ID holder dictionary
players = {}

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
    print "remove:" 
    print players[request.sid]
    emit('message',json.dumps({"remove":players[request.sid]}),broadcast=True)

@socketio.on('message')
def handle_message(data):
    dataIN = json.loads(data)
    specialKey = "movement"

    #player is broadcasting move
    if dataIN.iterkeys().next() == "movement":
        emit('message',json.dumps(dataIN[specialKey]),broadcast=True)
        print dataIN[specialKey]

    #player is broadcasting avatar image update
    if dataIN.iterkeys().next() == "avatar":
        emit('message',json.dumps(dataIN),broadcast=True)
        print dataIN
    
        #player is broadcasting avatar image update
    if dataIN.iterkeys().next() == "new":
        print dataIN
        #link the socketIO generated session ID, with users locally generated player ID
        players[request.sid] = dataIN["new"]
        print players

    

if __name__ == '__main__':
    #CHANGE HOST
    socketio.run(app,host='10.10.10.62',port=8000)
