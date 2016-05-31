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
    print request.sid

@socketio.on('message')
def handle_message(data):
    dataIN = json.loads(data)

    #player is broadcasting move
    if dataIN.iterkeys().next() == "movement":
        specialKey = "movement"
	for key in dataIN[specialKey]:
            #if there is actual data emit it
            if bool(dataIN[specialKey]):
                emit('message',json.dumps(dataIN[specialKey]),broadcast=True)
                print dataIN[specialKey]

    #player is updating avatar image
    if dataIN.iterkeys().next() == "avatar":
        emit('message',json.dumps(dataIN),broadcast=True)
        print dataIN

    

if __name__ == '__main__':
    #CHANGE HOST
    socketio.run(app,host='192.168.1.103',port=8000)
