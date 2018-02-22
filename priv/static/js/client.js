
console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");

var joystick	= new VirtualJoystick({
  container	: document.getElementById('container'),
  mouseSupport	: true,
});
function getJoystickDirection(joystick) {
  if (joystick.right()) {
    return 'right'
  }
  if (joystick.left()) {
    return 'left'
  }
  if (joystick.up()) {
    return 'up'
  }
  if (joystick.down()) {
    return 'down'
  }
  return 'neutral'
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

var iceServers = {
  "iceServers": [
    { "url": "stun:stun.l.google.com:19302" }
  ]
};

var clientId = uuidv4()
var username = 'Not set yet!'
var phxSocket = new Phoenix.Socket("/socket", {params: {user: clientId}})
phxSocket.connect()

var phxCallChannel = phxSocket.channel('call:' + clientId)
phxCallChannel.join()
  .receive("ok", () => { console.log("Successfully joined call channel")})
  .receive("error", () => {console.log("Unable to join call channel.")})

phxCallChannel.on('call_incoming', payload => {
  let clientId = payload.clientId
  let message = JSON.parse(payload.body)
  console.log(payload)

  if (message.sdp) {
    let offer = message.sdp
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
  } else if (message.candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
  }
})

var peerConnection = new RTCPeerConnection(iceServers)
var dataChannel = peerConnection.createDataChannel('client_server_channel')

dataChannel.onerror = e => console.log('DCE: ', e)
dataChannel.onmessage = e => console.log(e)
dataChannel.onopen = _ => {
  console.log('Data channel open')
  setInterval(_ => {
    dataChannel.send(getJoystickDirection(joystick))
  }, 1000)
}
dataChannel.onclose = _ => console.log('Data channel closed')

peerConnection.onicecandidate = event => {
  if (event.candidate) {
    console.log("Local ICE candidate: \n" + event.candidate.candidate);
    let candidate = event.candidate
    phxCallChannel.push('call:__server__', {
      clientId,
      username,
      body: JSON.stringify({candidate}),
    })
  }
}

peerConnection.createOffer()
  .then(offer => {
    return peerConnection.setLocalDescription(offer)
  })
  .then(_ => {
    phxCallChannel.push('call:__server__', {
      body: JSON.stringify({sdp: peerConnection.localDescription}),
      clientId,
      username
    })
  })
  .catch(error => {
    console.log(error)
  })