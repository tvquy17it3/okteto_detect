import pydevd_pycharm
from flask import Flask, request, render_template, Response, jsonify, redirect, url_for, session
from flask_cors import CORS, cross_origin
import os, logging
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
logging.getLogger("tensorflow").setLevel(logging.CRITICAL)
from facenet.face_contrib import *
import numpy as np
import sys
import time
import datetime
import cv2
import base64
from jsonschema import validate, ValidationError, SchemaError
import imutils
import shutil
# python3.7 -m pip install package
# source venv/bin/activate
# okteto stack deploy --build

sess = tf.Session()
graph = tf.get_default_graph()

with sess.as_default():
  with graph.as_default():
    face_recognition = Recognition('models', 'models/your_model.pkl')

app = Flask(__name__, static_folder='', static_url_path='')
app.secret_key = 'facedetect'
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

#=========================================================

def base64_image(base64_img):
    try:
        base64_img = np.frombuffer(base64.b64decode(base64_img), dtype=np.uint8)
        base64_img = cv2.imdecode(base64_img, cv2.IMREAD_ANYCOLOR)
    except:
        return None
    return base64_img

def add_overlays(faces, user_id, confidence=0.5):
    if faces is not None:
        for idx, face in enumerate(faces):
            face_bb = face.bounding_box.astype(int)
            if face.name and face.prob:
                if face.prob > confidence:
                    if user_id == face.name:
                        conf = '{:.02f}'.format(face.prob * 100)
                        return True, conf
    return False, 0

def errorRemoveReadonly(func, path, exc):
    excvalue = exc[1]
    if func in (os.rmdir, os.remove) and excvalue.errno == errno.EACCES:
        # change the file to be readable,writable,executable: 0777
        os.chmod(path, stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO)
        # retry
        func(path)
#=========================================================

@app.route('/detect', methods=['POST'])
@cross_origin(origin='*')
def index_detect():
    data = request.json
    if 'image' not in data:
        return {"data": False, "message": "Validate errors!"}

    image = base64_image(data['image'])
    if image is None:
        return {"data": False, "message": "Cannot load image"}
    else:
        with sess.as_default():
            with graph.as_default():
                faces = face_recognition.identify(image)
                user_id = str(data['user_id'])
                check_confidence, conf = add_overlays(faces, user_id)
                if check_confidence:
                    time_now = time.time()
                    date_time = datetime.datetime.fromtimestamp(time_now).strftime('%d-%m-%Y %H:%M:%S')
                    return {
                            "data": True,
                            "conf": conf,
                            "date_time": str(date_time),
                            "user_id": user_id,
                            }
    return {"data": False, "message": "Cannot detect"}
#==========================================================
@app.route('/face')
def face():
    if 'access_token' not in session:
        return redirect(url_for('login'))
    return render_template('face.html')

@app.route('/submit_img', methods=['POST'])
def submit_img():
    if 'access_token' not in session:
        return redirect(url_for('login'))

    data = request.json
    if 'list_img64' not in data:
        return {"data": False, "message": "Validate errors!"}

    Id = 'ms5'
    path = 'your_face/'+ Id
    shutil.rmtree(path, ignore_errors=False, onerror=errorRemoveReadonly)
    if not os.path.exists(path):
        os.makedirs(path)

    for key in data['list_img64']:
        b64 = data['list_img64'][key].replace('data:image/png;base64,','')
        image = base64_image(b64)
        cv2.imwrite(path+"/"+Id +'_'+ key + ".jpg", image)

    # print(os.listdir(path))
    return {"data": True, "message": os.listdir(path)}

@app.route('/login')
def login():
    if 'access_token' in session:
        return redirect(url_for('face'))
    return render_template('login.html')

@app.route('/submit_login', methods=['POST'])
def submit_login():
    data = request.json
    if 'access_token' not in data:
        return {"data": False, "message": "Not token!"}
    session['access_token'] = data['access_token']
    return {"data": True, "message": "Saved token!"}

@app.route('/logout')
def logout():
    if 'access_token' in session:
        session.pop('access_token', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    print('Starting server...')
    app.run(debug=True, host='0.0.0.0', port=5000)
