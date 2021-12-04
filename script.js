// 1). grab needed elements' reference
// #video element
const video = document.getElementById('video');
const buttonRecord = document.getElementById("btn_start");
const div = document.getElementById("div_img");
const cdown = document.getElementById("count_down");
const count_img = document.getElementById("counts");
const upload = document.getElementById("btn_upload");
const delall = document.getElementById("btn_delall");
const progress = document.getElementById("progress_line");
const progress_bar = document.getElementById("progress_bar");
const status_upload = document.getElementById("status");
const img_min = 10;
const img_max = 30;
var counts = 0;
var index = 1;
const step = 10;
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
  countdown = 3;
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

// 3). startVideoStream
function startVideoStream() {
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
    .then(function(stream) {
      // set the video.srcObject to stream
      video.srcObject = stream;
    })
    .then(makePredictions)
    .catch(function(error) {
      alert("Hãy nhấn cho phép sử dụng camera rồi thử  lại!");
      console.log(error);
    });
  }
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

const canvas = document.getElementById('canvas_face');
const canvas2 = document.createElement("canvas");
// 4). makePredictions() function definition
function makePredictions() {

  // resize the canvas to the #video dimensions
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  count_img.hidden = false;

  /* get "detections" for every 120 milliseconds */
  const intervalId = setInterval(async function() {
    try {
      /* this "detections" array has all the things like the "prediction results" as well as the "bounding box" configurations! */
      const detections = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options());
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // before start drawing, clear the canvas
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      // use faceapi.draw to draw "detections"
      faceapi.draw.drawDetections(canvas, resizedDetections);
      if(detections._score > 0.95 && counts < count_max){
        counts++;
        count_img.innerHTML = "Đã chụp: " + counts;
        add_listImg()
      }else if(counts >= count_max){
        video.hidden = true;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        //stop camera
        stream = video.srcObject;
        tracks = stream.getTracks();
        tracks.forEach(function(track) {
          track.stop();
        });
        video.srcObject = null;
        when_detect(false);
        // console.log(jsonObj.list_base);
        clearInterval(intervalId);
        await displayImage();
      }
    } catch (error) {
      // console.log(error);
    }
  }, 100);
}

function add_listImg(){
  canvas2.width = video.videoWidth;
  canvas2.height = video.videoHeight;
  canvas2.getContext('2d').drawImage(video, 0, 0, canvas2.width, canvas2.height);
  const img = canvas2.toDataURL();
  id = "img" + index
  jsonObj.list_base[id] = img;
  index++;
}

function displayImage(){
  for (let key in jsonObj.list_base) {
    load_id = document.getElementById(""+key);
    if(!load_id){
      let value = jsonObj.list_base[key];
      let html = `<div class="card img_clear" style="width: 10rem;" id="${key}">
                  <img class="card-img-top" src="${value}">
                  <div class="card-body">
                    <button onclick="del_img('${key}')" class="btn btn-danger btn-sm">Xóa ${key}</button>
                  </div>
                </div>`;
      div.innerHTML += html;
    }
  }
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
          when_upload(length_img, progressEvent.loaded, progressEvent.total);
          progress.innerHTML = percentCompleted;
          progress.style.width= percentCompleted;
        }
      }).then (data => {
        status_upload.innerHTML = "Đã tải lên thành công!";
        status_upload.style.color = "#155724";
        status_upload.style.fontSize = "30px";
        progress.hidden= true;
        // console.log(data.status);
      }).catch(e =>{
        upload_error();
      });
    }else{
      alert("Chọn tối thiểu "+ img_min +" ảnh, tối đa "+ img_max +" ảnh!");
    }
  }
};


function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return 'n/a'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
  if (i === 0) return `${bytes} ${sizes[i]})`
  return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
}

function when_upload(length_img, loading, finished){
  upload.disabled = true;
  delall.disabled = true;
  buttonRecord.disabled = true;
  progress_bar.hidden = false;
  status_upload.innerHTML = "Đang tải lên "+ length_img +" ảnh, "+ bytesToSize(loading)+"/"+ bytesToSize(finished);
}

function upload_error(){
  upload.disabled = false;
  delall.disabled = false;
  buttonRecord.disabled = false;
  progress_bar.hidden = true;
  status_upload.innerHTML = "Đã có lỗi xảy ra, hãy kiểm tra và thực hiện lại!";
}
