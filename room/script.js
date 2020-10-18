
const Peer = window.Peer;

 (async function main() {
   const localVideo = document.getElementById('js-local-stream');
   const joinTrigger = document.getElementById('js-join-trigger');
   const leaveTrigger = document.getElementById('js-leave-trigger');
   const remoteVideos = document.getElementById('js-remote-streams');
   const roomId = document.getElementById('js-room-id');
   const roomMode = document.getElementById('js-room-mode');
   const localText = document.getElementById('js-local-text');
   const sendTrigger = document.getElementById('js-send-trigger');
   const messages = document.getElementById('js-messages');
   const meta = document.getElementById('js-meta');
   const sdkSrc = document.querySelector('script[src*=skyway]');

   let peerIdArray = [];

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

     const room = peer.joinRoom(roomId.value, {
       mode: getRoomModeByHash(),
       stream: localStream,
     });

     room.once('open', () => {
       messages.textContent += '=== You joined ===\n';
     });
     room.on('peerJoin', peerId => {
       messages.textContent += `=== ${peerId} joined ===\n`;
     });

     // Render remote stream for new peer join in the room
     room.on('stream', async stream => {
       const newVideo = document.createElement('video');
       newVideo.srcObject = stream;
       newVideo.playsInline = true;
       // mark peerId to find it later at peerLeave event
       newVideo.setAttribute('data-peer-id', stream.peerId);
       newVideo.setAttribute('class', "myIcon");
       remoteVideos.append(newVideo);
       peerIdArray.push(stream.peerId);
       await newVideo.play().catch(console.error);
     });

     room.on('data', ({ data, src }) => {
       // Show a message sent to the room and who sent
       messages.textContent += `${src}: ${data}\n`;
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

     sendTrigger.addEventListener('click', onClickSend);
     leaveTrigger.addEventListener('click', () => room.close(), { once: true });

     function onClickSend() {
       // Send message to all of the peers in the room via websocket
       room.send(localText.value);

       messages.textContent += `${peer.id}: ${localText.value}\n`;
       localText.value = '';
     }
   });

   peer.on('error', console.error);

   //要素の取得
  var elements = document.getElementsByClassName("myIcon");

  //要素内のクリックされた位置を取得するグローバル（のような）変数
  var x;
  var y;

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

//  (function(){

//   //要素の取得
//   var elements = document.getElementsByClassName("myIcon");

//   //要素内のクリックされた位置を取得するグローバル（のような）変数
//   var x;
//   var y;

//   //マウスが要素内で押されたとき、又はタッチされたとき発火
//   for(var i = 0; i < elements.length; i++) {
//       elements[i].addEventListener("mousedown", mdown, false);
//       elements[i].addEventListener("touchstart", mdown, false);
//   }

//   //マウスが押された際の関数
//   function mdown(e) {

//       //クラス名に .drag を追加
//       this.classList.add("drag");

//       //タッチデイベントとマウスのイベントの差異を吸収
//       if(e.type === "mousedown") {
//           var event = e;
//       } else {
//           var event = e.changedTouches[0];
//       }

//       //要素内の相対座標を取得
//       x = event.pageX - this.offsetLeft;
//       y = event.pageY - this.offsetTop;

//       //ムーブイベントにコールバック
//       document.body.addEventListener("mousemove", mmove, false);
//       document.body.addEventListener("touchmove", mmove, false);
//   }

//   //マウスカーソルが動いたときに発火
//   function mmove(e) {

//       //ドラッグしている要素を取得
//       var drag = document.getElementsByClassName("drag")[0];

//       //同様にマウスとタッチの差異を吸収
//       if(e.type === "mousemove") {
//           var event = e;
//       } else {
//           var event = e.changedTouches[0];
//       }

//       //フリックしたときに画面を動かさないようにデフォルト動作を抑制
//       e.preventDefault();

//       //マウスが動いた場所に要素を動かす
//       drag.style.top = event.pageY - y + "px";
//       drag.style.left = event.pageX - x + "px";

//       //マウスボタンが離されたとき、またはカーソルが外れたとき発火
//       drag.addEventListener("mouseup", mup, false);
//       document.body.addEventListener("mouseleave", mup, false);
//       drag.addEventListener("touchend", mup, false);
//       document.body.addEventListener("touchleave", mup, false);

//   }

//   //マウスボタンが上がったら発火
//   function mup(e) {
//       var drag = document.getElementsByClassName("drag")[0];

//       //ムーブベントハンドラの消去
//       document.body.removeEventListener("mousemove", mmove, false);
//       drag.removeEventListener("mouseup", mup, false);
//       document.body.removeEventListener("touchmove", mmove, false);
//       drag.removeEventListener("touchend", mup, false);

//       //クラス名 .drag も消す
//       drag.classList.remove("drag");
//   }

})()