import pydevd_pycharm
from flask import Flask, request, render_template, Response, jsonify, redirect, url_for
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
# python3.7 -m pip install package
# source venv/bin/activate
# okteto stack deploy --build

sess = tf.Session()
graph = tf.get_default_graph()

with sess.as_default():
  with graph.as_default():
    face_recognition = Recognition('models', 'models/your_model.pkl')

app = Flask(__name__, static_folder='', static_url_path='')

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

#=========================================================

@app.route('/detect', methods=['POST'])
@cross_origin(origin='*')
def index_detect():
	data = request.json
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
@cross_origin(origin='*')
def face():
	return render_template('face.html')

@app.route('/submit_img', methods=['POST'])
@cross_origin(origin='*')
def submit_img():
	data = request.json
	schema = {
			"type" : "object",
			"properties": {"user_id": {"type" : "number"}},
			"required": ["list_base", "user_id"]
	}

	try:
			validate(data, schema)
	except jsonschema.ValidationError as e:
			return {"data": False, "message": "Validate errors"}
	except jsonschema.SchemaError as e:
			return {"data": False, "message": "Validate errors"}
	except:
		return {"data": False, "message": "Validate errors"}
	time.sleep(5)
	print(True)
	print("Printed immediately.")
	return {"data": True, "message": "ok"}


@app.route('/login')
def hello():
	# msg = 'Hello World!'
	# return msg
	return render_template('index.html')

@app.route('/submit_login', methods=['POST'])
@cross_origin(origin='*')
def submit_login():
	data = request.json
	print(data['access_token'])
	return {"data": True, "message": "Saved token!"}

# def attach():
#   if os.environ.get('WERKZEUG_RUN_MAIN'):
#     print('Connecting to debugger...')
#     pydevd_pycharm.settrace('0.0.0.0', port=9000, stdoutToServer=True, stderrToServer=True)

if __name__ == '__main__':
	print('Starting hello-world server...')
	# comment out to use Pycharm's remote debugger
	# attach()

	app.run(debug=True, host='0.0.0.0', port=5000)
