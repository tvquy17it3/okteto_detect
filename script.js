// 1). grab needed elements' reference
// #video element
const video = document.getElementById('video');
var buttonRecord = document.getElementById("btn_start");
var div = document.getElementById("div_img");
var cdown = document.getElementById("count_down");
var count_img = document.getElementById("counts");
var upload = document.getElementById("btn_upload");
var delall = document.getElementById("btn_delall");
var counts = 0;
var index = 1;
var count_max = 0;
var countdown = 3;
var jsonObj = {
  user_id: 5,
  list_base: {},
}
delall.hidden = true;

buttonRecord.onclick = function() {
  count_max += 5;
  video.hidden = false;
  buttonRecord.disabled = true;
  anim();
};

// 2). load the models
async function loadModels() {
  /* ssdMobilenetv1 - for face detection */
  await faceapi.nets.ssdMobilenetv1.loadFromUri('./models');
  // startVideoStream();
}

// 3). startVideoStream() function definition
function startVideoStream() {
  // check if getUserMedia API is supported
  if (navigator.mediaDevices.getUserMedia) {
    // get the webcam's video stream
    navigator.mediaDevices.getUserMedia({ video: true })
    .then(function(stream) {
      // set the video.srcObject to stream
      video.srcObject = stream;
    })
    .then(makePredictions)
    .catch(function(error) {
      console.log(error);
    });
  }
}


// 4). makePredictions() function definition
function makePredictions() {
  const canvas = document.getElementById('canvas');
  // resize the canvas to the #video dimensions
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  /* get "detections" for every 120 milliseconds */
  const intervalId = setInterval(async function() {
    /* this "detections" array has all the things like the "prediction results" as well as the "bounding box" configurations! */
    const detections = await faceapi.detectAllFaces(video);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
      // before start drawing, clear the canvas
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if(countdown <= 0){
      if (typeof detections[0] !== 'undefined'){
        // use faceapi.draw to draw "detections"
        faceapi.draw.drawDetections(canvas, resizedDetections);
        if(detections[0].score > 0.95 && counts < count_max){
          counts++;
          count_img.innerHTML = "Đã chụp: " + counts;

          const canvas2 = document.createElement("canvas");
          canvas2.width = video.videoWidth;
          canvas2.height = video.videoHeight;
          canvas2.getContext('2d').drawImage(video, 0, 0, canvas2.width, canvas2.height);
          const result = canvas2.toDataURL();
          displayImage(result);
        }else if(counts >= count_max){
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          buttonRecord.disabled = false;
          countdown = 3;

          //stop camera
          stream = video.srcObject;
          tracks = stream.getTracks();
          tracks.forEach(function(track) {
            track.stop();
          });
          video.srcObject = null;
          clearInterval(intervalId);
          video.hidden = true;
          delall.hidden = false;
          // console.log(jsonObj.list_base);
        }
      }
    }
  }, 120);
}

// activate the loadModels() function
loadModels()

function anim() {
  if (countdown > 0) {
    cdown.innerHTML = "Bắt đầu sau: " + countdown;
    countdown--;
    setTimeout(anim, 700);
  }
  else {
    cdown.innerHTML = "";
    startVideoStream();
  }
}

const displayImage = (img) => {
  base64Img = img.replace("data:image/png;base64,", "");
  id = "img"+index
  jsonObj.list_base[id] = base64Img;
  let html = `<div class="card img_clear" style="width: 10rem;" id="${id}">
                <img class="card-img-top" src="${img}">
                <div class="card-body">
                  <button onclick="del_img('${id}')" class="btn btn-danger btn-sm">Xóa ${id}</button>
                </div>
              </div>`;
  div.innerHTML += html;
  index++;
}

function del_img(id){
  if(jsonObj.list_base[id] != null){
    if (confirm('Xác nhận xóa')) {
      delete jsonObj.list_base[id];
      document.getElementById(id).remove();
      // console.log(jsonObj.list_base);
    }
  }
}

delall.onclick = function() {
  if (confirm('Xác nhận xóa tất cả?')) {
    var div = document.getElementById('div_img');
    while(div.firstChild){
        div.removeChild(div.firstChild);
    }
    jsonObj.list_base = {};
    index = 1;
    count_max = 0;
    counts = 0;
    count_img.hidden = true;
    delall.hidden = true;
  }
};

var elStatus = document.getElementById('status');
upload.onclick = function() {
  if (confirm('Upload tất cả hình ảnh?')) {
    var lenth = Object.keys(jsonObj.list_base).length;
    if(lenth >=5){
      console.log("Leng: " + lenth);

      axios.request({
        method: "post",
        url: "/submit_img",
        data: jsonObj,
        uploadProgress: (evt) => {
          console.log(evt.loaded / evt.total)
        }
      }).then (data => {
        console.log(data.status);
      }).catch(e =>{
        console.error("error")
      });
    }else{
      alert("Tối thiểu 20 ảnh, chọn quét khuôn mặt để  bổ sung thêm!");
    }
  }
};
