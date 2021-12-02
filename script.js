// 1). grab needed elements' reference
// #video element
const video = document.getElementById('video');
var buttonRecord = document.getElementById("btn_start");
var div = document.getElementById("div_img");
var cdown = document.getElementById("count_down");
var count_img = document.getElementById("counts");
var upload = document.getElementById("btn_upload");
var delall = document.getElementById("btn_delall");
var progress = document.getElementById("progress_line");
var progress_bar = document.getElementById("progress_bar");
var status_upload = document.getElementById("status");
var img_min = 10;
var img_max = 30;
var counts = 0;
var index = 1;
var step = 10;
var count_max = 0;
var countdown = 3;
var jsonObj = {
  user_id: 5,
  list_base: {},
}


reset_all();

function reset_all(){
  delall.disabled = true;
  upload.disabled = true;
  count_img.hidden = true;
  jsonObj.list_base = {};
  index = 1;
  count_max = 0;
  counts = 0;
}

function when_detect(status){
  upload.disabled = status;
  delall.disabled = status;
  buttonRecord.disabled = status;
}

buttonRecord.onclick = function() {
  count_max += step;
  video.hidden = false;
  when_detect(true);
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
  const canvas = document.getElementById('canvas_face');
  // resize the canvas to the #video dimensions
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  count_img.hidden = false;
  /* get "detections" for every 120 milliseconds */
  const intervalId = setInterval(async function() {
    /* this "detections" array has all the things like the "prediction results" as well as the "bounding box" configurations! */
    const detections = await faceapi.detectAllFaces(video);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
      // before start drawing, clear the canvas
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if(countdown <= 0 && (typeof detections[0] !== 'undefined')){
        // use faceapi.draw to draw "detections"
        faceapi.draw.drawDetections(canvas, resizedDetections);
        if(detections[0].score > 0.95 && counts < count_max){
          counts++;
          count_img.innerHTML = "Đã chụp: " + counts;
          displayImage(video);
        }else if(counts >= count_max){
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
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
          when_detect(false);
          // console.log(jsonObj.list_base);
        }
    }
  }, 100);
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

async function displayImage(video){
  const canvas2 = document.createElement("canvas");
  canvas2.width = video.videoWidth;
  canvas2.height = video.videoHeight;
  canvas2.getContext('2d').drawImage(video, 0, 0, canvas2.width, canvas2.height);
  const img = canvas2.toDataURL();
  id = "img" + index
  base64Img = img.replace("data:image/png;base64,", "");
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
      var length_img = Object.keys(jsonObj.list_base).length;
      if(length_img == 0){
        reset_all();
      }
    }
  }
}

delall.onclick = function() {
  if (confirm('Xác nhận xóa tất cả?')) {
    var div = document.getElementById('div_img');
    while(div.firstChild){
        div.removeChild(div.firstChild);
    }
    reset_all();
  }
};

var elStatus = document.getElementById('status');
upload.onclick = function() {
  if (confirm('Upload tất cả hình ảnh?')) {
    var length_img = Object.keys(jsonObj.list_base).length;
    if(length_img >= img_min && length_img <= img_max){
      axios.request({
        method: "post",
        url: "/submit_img",
        data: jsonObj,
        onUploadProgress: function(progressEvent) {
          var percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)+ "%"
          when_upload(length_img);
          progress.innerHTML = percentCompleted;
          progress.style.width= percentCompleted;
        }
      }).then (data => {
        status_upload.innerHTML = "Đã tải lên thành công!";
        console.log(data.status);
      }).catch(e =>{
        upload_error();
      });
    }else{
      alert("Chọn tối thiểu "+ img_min +" ảnh, tối đa "+ img_max +" ảnh!");
    }
  }
};

function when_upload(length_img){
  upload.disabled = true;
  delall.disabled = true;
  buttonRecord.disabled = true;
  progress_bar.hidden = false;
  console.log("Leng: " + length_img);
  status_upload.innerHTML = "Đang tải lên "+ length_img +" ảnh.";
}

function upload_error(){
  upload.disabled = false;
  delall.disabled = false;
  buttonRecord.disabled = false;
  progress_bar.hidden = true;
  status_upload.innerHTML = "Đã có lỗi xảy ra, hãy kiểm tra và thực hiện lại!";
}
