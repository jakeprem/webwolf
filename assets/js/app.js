import "phoenix_html"
import {Socket, Presence} from "phoenix"

let user = document.getElementById("User").innerText;
let socket = new Socket("/socket", {params: {token: window.userToken, user: user}});
socket.connect();

let presences = {};
let formatTimeStamp = (timestamp) => {
  let date = new Date(timestamp)
  return date.toLocaleTimeString();
}
let listBy = (user, {metas: metas}) => {
  return {
    user: user,
    onlineAt: formatTimeStamp(metas[0].online_at)
  }
}

let userList = document.getElementById("UserList");
let render = (presences) => {
  userList.innerHTML = Presence.list(presences, listBy)
    .map(presence => `
      <li>
        ${presence.user}
        <br>
        <small>online since ${presence.onlineAt}</small>
      </li>
    `)
    .join("");
}
let room = socket.channel("room:lobby")
room.on("presence_state", state => {
  presences = Presence.syncState(presences, state);
  render(presences);
});
room.join();

let messageInput = document.getElementById("NewMessage")
messageInput.addEventListener("keypress", (e) => {
  if (e.keyCode == 13 && messageInput.value != "") {
    room.push("message:new", messageInput.value);
    messageInput.value = "";
  }
})

let messageList = document.getElementById("MessageList");
let renderMessage = (message) => {
  let messageElement = document.createElement("li");
  messageElement.innerHTML = `
    <b>${message.user}</b>
    <i>${formatTimeStamp(message.timestamp)}</i>
    <p>${message.body}</p>
  `;
  messageList.appendChild(messageElement);
  messageList.scrollTop = messageList.scrollHeight;
}

room.on("message:new", message => renderMessage(message));

// ##########################################################################
// ## WEBRTC STUFF BELOW HERE ###############################################
// ##########################################################################

let callChannel = socket.channel("call", {})
callChannel.join()
  .receive("ok", () => { console.log("Successfully joined call channel!") })
  .receive("error", () => { console.log("Unable to join.") })

let dataChannel, peerConnection, receieveChannel;
let connectButton = document.getElementById('connect');
let callButton = document.getElementById('call');
let hangupButton = document.getElementById('hangup');

hangupButton.disabled = true;
callButton.disabled = true;
connectButton.onclick = connect;
callButton.onclick = call;
hangupButton.onclick = hangup;

var peerChannel;

function connect () {
  setupPeerConnection()
}

function setupPeerConnection () {
  connectButton.disabled = true;
  callButton.disabled = false;
  hangupButton.disabled = false;
  console.log('Waiting for call');

  let servers = {
    "iceServers": [
      {
        "url": "stun:stun.example.org"
      }
    ]
  };

  peerConnection = new RTCPeerConnection(servers);
  Window.peerConnection = peerConnection;
  console.log('Created local peer connection');
  peerConnection.onicecandidate = gotLocalIceCandidate;
  peerConnection.ondatachannel = gotRemoteChannel;
  dataChannel = peerConnection.createDataChannel('peerChannel');
  
  dataChannel.onerror = e => console.log('DCE:', e);
  dataChannel.onmessage = e => console.log('DCM:', e.data);
  dataChannel.onopen = _ => console.log('DCO');
  dataChannel.onclose = _ => console.log('DCC');
  Window.peerChannel = dataChannel;

  console.log('Added localChannel to localPeerConnection');

}

function call () {
  callButton.disabled = true;
  console.log('Starting call');
  peerConnection.createOffer(gotLocalDescription, handleError);
}

function gotLocalDescription (description) {
  peerConnection.setLocalDescription(description, () => {
    callChannel.push("message", {body: JSON.stringify({
      "sdp": peerConnection.localDescription
    })});
  }, handleError)
  console.log('Offer from localPeerConnection: \n' + description.sdp);
}

function gotRemoteDescription (description) {
  console.log('Answer from remotePeerConnection: \n' + description.sdp);
  peerConnection.setRemoteDescription(new RTCSessionDescription(description.sdp));
  peerConnection.createAnswer(gotLocalDescription, handleError);
}

function gotRemoteChannel (event) {
  console.log('Received remote channel');
  receieveChannel = event.channel;
  Window.receieveChannel = receieveChannel;
  event.channel.onopen = function() {
    console.log('Remote channel is open!');
  }
  receieveChannel.onmessage = e => console.log(e.data)
}

function gotLocalIceCandidate (event) {
  if (event.candidate) {
    console.log("Local ICE candidate: \n" + event.candidate.candidate);
    callChannel.push("message", {body: JSON.stringify({
      "candidate": event.candidate
    })});
  }
}

function gotRemoteIceCandidate (event) {
  callButton.disabled = true;
  if (event.candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
  }
}

callChannel.on('message', payload => {
  let message = JSON.parse(payload.body);
  if (message.sdp) {
    gotRemoteDescription(message);
  } else {
    gotRemoteIceCandidate(message);
  }
});

function hangup() {
  console.log('Ending call');
  peerConnection.close();
  localVideo.src = null;
  peerConnection = null;
  hangupButton.disabled = true;
  connectButton.disabled = false;
  callButton.disabled = true;
}

function handleError(error) {
  // console.log(error.name + ": " + error.message);
  console.log(error);
}