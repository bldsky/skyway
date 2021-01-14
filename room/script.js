fetch('https://unpkg.com/mqtt/dist/mqtt.min.js').then(r=>{return r.text()}).then(t=>{
  // "t"にimport.jsのファイル内容が格納されているので
  eval(t); //その内容を実行する
});

const Peer = window.Peer;

 (async function main() {
   const localVideo = document.getElementById('js-local-stream');
   const joinTrigger = document.getElementById('js-join-trigger');
   const leaveTrigger = document.getElementById('js-leave-trigger');
   const setID = document.getElementById('js-set-id');
   const remoteVideos = document.getElementById('js-remote-streams');
   const roomId = document.getElementById('js-room-id');
   const userId = document.getElementById('js-user-id');
   const roomMode = document.getElementById('js-room-mode');
   const localText = document.getElementById('js-local-text');
   const sendTrigger = document.getElementById('js-send-trigger');
   const messages = document.getElementById('js-messages');
   const meta = document.getElementById('js-meta');
   const sdkSrc = document.querySelector('script[src*=skyway]');

   let peerIdArray = {};

  //要素の取得
  var elements = document.getElementsByClassName("myIcon");

  //要素内のクリックされた位置を取得するグローバル（のような）変数
  var x;
  var y;

   meta.innerText = `
     UA: ${navigator.userAgent}
     SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
   `.trim();

   const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');

   roomMode.textContent = getRoomModeByHash();
   window.addEventListener(
     'hashchange',
     () => (roomMode.textContent = getRoomModeByHash())
   );

   const localStream = await navigator.mediaDevices
     .getUserMedia({
       audio: true,
       video: true,
     })
     .catch(console.error);

   // Render local stream
   localVideo.muted = true;
   localVideo.srcObject = localStream;
   localVideo.playsInline = true;
   await localVideo.play().catch(console.error);

   // eslint-disable-next-line require-atomic-updates
   const peer = (window.peer = new Peer({
     key: window.__SKYWAY_KEY__,
     debug: 3,
   }));

   // Register join handler
   joinTrigger.addEventListener('click', () => {
     // Note that you need to ensure the peer has connected to signaling server
     // before using methods of peer instance.
     if (!peer.open) {
       return;
     }

     elements[0].setAttribute('id', userId.value);
     console.log(elements[0]);

     const room = peer.joinRoom(roomId.value, {
       mode: getRoomModeByHash(),
       stream: localStream,
     });

     room.once('open', () => {
       //messages.textContent += '=== You joined ===\n';
       room.send(userId.value);
     });
     room.on('peerJoin', peerId => {
       //messages.textContent += `=== ${peerId} joined ===\n`;
       room.send(userId.value);
     });

     // Render remote stream for new peer join in the room
     room.on('stream', async stream => {
       const newVideo = document.createElement('video');
       newVideo.srcObject = stream;
       newVideo.playsInline = true;
       // mark peerId to find it later at peerLeave event
       newVideo.setAttribute('class', 'class_'+stream.peerId);
       newVideo.setAttribute('id', 'remoteId');
       newVideo.setAttribute('data-peer-id', stream.peerId);
       newVideo.setAttribute('style', 'width: 100px; height: 100px; top: 100px; left: 100px;');
       remoteVideos.append(newVideo);
       await newVideo.play().catch(console.error);
     });

     room.on('data', ({ data, src }) => {
       // Show a message sent to the room and who sent
       console.log(typeof data)
       if(typeof data == 'String') {
        messages.textContent += `${src}: ${data}\n`;
       } else if(typeof data == 'string') {
         console.log("connect");
         peerIdArray[src] = data;
        //  setTimeout(function () {
        //   var tmp = document.getElementsByClassName('class_'+src)[0];
        //   console.log(tmp);
        //   tmp.id = data;
        //   peerIdArray[src] = data;
        //  }, 1500);
         console.log(src);
       } else {
         console.log(data[0]);
         var tmp = document.getElementsByClassName('class_'+src)[0];
         console.log(tmp);
         tmp.style.top = data[1];
         tmp.style.left = data[0];
       }
     });

     // for closing room members
     room.on('peerLeave', peerId => {
       const remoteVideo = remoteVideos.querySelector(
         `[data-peer-id="${peerId}"]`
       );
       remoteVideo.srcObject.getTracks().forEach(track => track.stop());
       remoteVideo.srcObject = null;
       remoteVideo.remove();

       messages.textContent += `=== ${peerId} left ===\n`;
     });

     // for closing myself
     room.once('close', () => {
       sendTrigger.removeEventListener('click', onClickSend);
       messages.textContent += '== You left ===\n';
       Array.from(remoteVideos.children).forEach(remoteVideo => {
         remoteVideo.srcObject.getTracks().forEach(track => track.stop());
         remoteVideo.srcObject = null;
         remoteVideo.remove();
       });
     });

     //IDを手動で一括セット
     setID.addEventListener('click', () => {
      for (let key in peerIdArray) {
        var tmp = document.getElementsByClassName('class_'+key)[0];
        console.log(tmp);
        tmp.id = peerIdArray[key];
      }
     })
     //sendTrigger.addEventListener('click', onClickSend);
     leaveTrigger.addEventListener('click', () => room.close(), { once: true });

      function onClickSend() {
       // Send message to all of the peers in the room via websocket
       room.send(localText.value);

       messages.textContent += `${peer.id}: ${localText.value}\n`;
       localText.value = '';
      }

      //ここからmosquitto(mqtt)のじっそう
      // let client = mqtt.connect('wss://test.mosquitto.org:8081');
      // let topic = "floor1/room1"
      
      // client.subscribe(topic);
      // client.on('message', function(topic, message){
      //   console.log('subscriber.on.message', 'topic:', topic, 'message:', message.toString());
      //   var icon = document.getElementsByClassName("myIcon")[0];
      //   var messages = message.toString().split(',');
      //   var Hx = messages[1].split(':')[1];
      //   var Hy = messages[2].split(':')[1];
      //   console.log(((Hx + 250) * 5 / 3));
      //   console.log(((Hy + 300) * 5 / 3));
      //   icon.style.top = ((Hx + 250) * 5 / 3) + "px";
      //   icon.style.left = ((Hy + 300) * 10 / 6) + "px";

      //   room.send([drag.style.left, drag.style.top]);
      // })
    //let client = mqtt.connect('wss://fancy-electrician.cloudmqtt.com:8883');
    var mqttOpt = {
      clientId: 'testClientId',
      username: 'gnqpnibj',
      password: 'hLSdTBex5Y0d',
      keepalive: 300
    };
    //let client = mqtt.connect('wss://fancy-electrician.cloudmqtt.com:8883', mqttOpt);
    let client = mqtt.connect('wss://kiuchi-mqtt-server.herokuapp.com:8883', mqttOpt);
    let topic = "floor1/room1"
    
    client.subscribe(topic);
    
    client.on('message', function(topic, message){
      console.log('subscriber.on.message', 'topic:', topic, 'message:', message.toString());
      //var icon = document.getElementsByClassName("myIcon")[0];
      var messages = message.toString().split(',');
      var id = messages[0].split(':')[1].trim();
      console.log(typeof id);
      console.log(id);
      var moveIcon = document.getElementById(id);
      console.log(moveIcon);
      var Hx = messages[1].split(':')[1];
      var Hy = messages[2].split(':')[1];
      console.log(((parseFloat(Hx) + 250) * 1.7) + "px");
      console.log((parseFloat(Hy + 300) * 1.7));
      console.log(moveIcon.style.top);

      var postTop = ((parseFloat(Hx) + 250) * 1.7) + "px";
      var postLeft = ((parseFloat(Hy) + 100) * 5) + "px";

      var distancePreToPost = Math.sqrt(Math.pow(parseFloat(postTop) - parseFloat(moveIcon.style.top), 2) + Math.pow(parseFloat(postLeft) - parseFloat(moveIcon.style.left), 2));

      if (distancePreToPost >= 200) {
      if (((parseFloat(Hx) + 250) * 1.7) >= 850) {
        moveIcon.style.top = "850px";
      } else if (((parseFloat(Hx) + 250) * 1.7) <= 0) {
        moveIcon.style.top = "0px";
      } else {
        moveIcon.style.top = (((parseFloat(Hx) + 250) * 1.7) +"px" );
      }
      if (((parseFloat(Hy) + 100) * 5) >= 1800) {
        moveIcon.style.left = "1800px";
      } else if (((parseFloat(Hy) + 100) * 5) <= 0) {
        moveIcon.style.left = "0px";
      } else {
        moveIcon.style.left = (((parseFloat(Hy) + 100) * 5) + "px");
      }}
      console.log(moveIcon.className);
      if (moveIcon.className != "myIcon") {
        var mI = document.getElementsByClassName("myIcon")[0];
        var distanceMyIconToOther = Math.sqrt(Math.pow((parseFloat(mI.style.top) - parseFloat(moveIcon.style.top)), 2) + Math.pow((parseFloat(mI.style.left) - parseFloat(moveIcon.style.left)), 2));
        console.log(distanceMyIconToOther);
        console.log(moveIcon);
        var remoteVideo = remoteVideos.querySelector(
          `[id="${id}"]`
        )
        if (distanceMyIconToOther <= 100) {
          remoteVideo.volume = 1.0;
          console.log("100以下(VolumeMax)");
        } else if (distanceMyIconToOther >= 500){
          remoteVolume = 0.0;
          console.log("500以上(Volume0)");
        } else {
          remoteVideo.volume = 100/distanceMyIconToOther;   //double型で0~1
          console.log(remoteVideo.volume);
        }
      }
    })
      //ここまで

      //マウスが要素内で押されたとき、又はタッチされたとき発火
      for(var i = 0; i < elements.length; i++) {
        elements[i].addEventListener("mousedown", mdown, false);
        elements[i].addEventListener("touchstart", mdown, false);
      }

    //マウスが押された際の関数
    function mdown(e) {
    //クラス名に .drag を追加
    this.classList.add("drag");

    //タッチデイベントとマウスのイベントの差異を吸収
    if(e.type === "mousedown") {
        var event = e;
    } else {
        var event = e.changedTouches[0];
    }

    //要素内の相対座標を取得
    x = event.pageX - this.offsetLeft;
    y = event.pageY - this.offsetTop;

    //ムーブイベントにコールバック
    document.body.addEventListener("mousemove", mmove, false);
    document.body.addEventListener("touchmove", mmove, false);
    }

//マウスカーソルが動いたときに発火
function mmove(e) {

    //ドラッグしている要素を取得
    var drag = document.getElementsByClassName("drag")[0];

    //同様にマウスとタッチの差異を吸収
    if(e.type === "mousemove") {
        var event = e;
    } else {
        var event = e.changedTouches[0];
    }

    //フリックしたときに画面を動かさないようにデフォルト動作を抑制
    e.preventDefault();

    //マウスが動いた場所に要素を動かす
    drag.style.top = event.pageY - y + "px";
    drag.style.left = event.pageX - x + "px";

    //座標をsendでroomの参加者に送信。（room.on('data')で受け取り）
    room.send([drag.style.left, drag.style.top]);

    //マウスボタンが離されたとき、またはカーソルが外れたとき発火
    drag.addEventListener("mouseup", mup, false);
    document.body.addEventListener("mouseleave", mup, false);
    drag.addEventListener("touchend", mup, false);
    document.body.addEventListener("touchleave", mup, false);

}

//マウスボタンが上がったら発火
function mup(e) {
    var drag = document.getElementsByClassName("drag")[0];

    //ムーブベントハンドラの消去
    document.body.removeEventListener("mousemove", mmove, false);
    drag.removeEventListener("mouseup", mup, false);
    document.body.removeEventListener("touchmove", mmove, false);
    drag.removeEventListener("touchend", mup, false);

    //クラス名 .drag も消す
    drag.classList.remove("drag");
}
   });

   peer.on('error', console.error);

})()