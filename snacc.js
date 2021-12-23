const status_login = document.getElementById("status_login");
async function login(){
  status_login.innerHTML = "Loading...."
  const session_url = 'https://vietquysv.herokuapp.com/api/login';
  var notice = "";
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  if(email && password) {
    try {
      const response = await fetch(session_url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({email: email, password: password, device_name: "web python"})
      });
      const json = await response.json();
      if(json.status_code == 200){
        save(json.access_token, json.employee_id);
      }else{
        notice = json.message;
      }
    } catch (error) {
      console.log(error);
    }
  }else{
    notice = "Nhập đầy đủ!";
  }
  status_login.innerHTML = notice;
}

async function save(access_token, employee_id){
  await axios.post("/submit_login", {
    access_token: access_token,
    employee_id: employee_id,
  })
  .then(function (res) {
    if(res.data){
      window.location.href = "/face";
      status_login.innerHTML = "Đăng nhập thành công";
    }
    status_login.innerHTML = "Không tìm thấy mã nhân viên!";
  })
  .catch(function (error) {
    console.log(error);
    alert("Đã có lỗi xảy ra!");
    window.location.reload();
  });
}
