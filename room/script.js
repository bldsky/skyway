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
  const volumeSlider = document.getElementById("volume");

  let audioContext = null;
  let sourceAC = null;
  let audioDestination = null;
  let gainNode = null;
  let peerIdArray = [];
  let peerIdTmp = null;
  let peerVolume = [];
  let typeTmp = null;


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
      peerVolume.push(0.5);
      peerIdTmp = peerId;
      //peerIdArray.push(peerId);
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      typeTmp = typeof newVideo;
      console.log("tnnypeof:", typeof newVideo);
      audioContext = new (window.AudioContext || window.webkitAudioContext);
      sourceAC = audioContext.createMediaStreamSource(stream);
      audioDestination = audioContext.createMediaStreamDestination();
      gainNode = audioContext.createGain();
      sourceAC.connect(gainNode);
      gainNode.connect(audioDestination);
      gainNode.gain.setValueAtTime(peerVolume[0], audioContext.currentTime);
      newVideo.srcObject = audioDestination.stream;
      newVideo.playsInline = true;
      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newVideo);
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

    volumeSlider.addEventListener("change", e => {
  const volume = e.target.value;
  //gainNode.gain.setValueAtTime(volume / 100, audioContext.currentTime);
  console.log("peerIDは:", peerIdTmp);
  const remoteVideo = remoteVideos.querySelector(
    `[data-peer-id="${peerIdTmp}"]`
  );
  audioContext = new (window.AudioContext || window.webkitAudioContext);
  console.log("srcObjectは:", remoteVideo.srcObject);
  sourceAC = audioContext.createMediaStreamSource(remoteVideo.srcObject);
  audioDestination = audioContext.createMediaStreamDestination();
  gainNode = audioContext.createGain();
  sourceAC.connect(gainNode);
  gainNode.connect(audioDestination);
  gainNode.gain.setValueAtTime(volume / 100, audioContext.currentTime);
  remoteVideo.srcObject = audioDestination.stream;
  //peerVolume[0] = volume / 100;
  console.log("gain:", gainNode.gain.value);
  console.log("volume:", volume);
  console.log("tttypeof:", typeTmp);
});
  });

  peer.on('error', console.error);
})();
