// Brunch automatically concatenates all files in your
// watched paths. Those paths can be configured at
// config.paths.watched in "brunch-config.js".
//
// However, those files will only be executed if
// explicitly imported. The only exception are files
// in vendor, which are never wrapped in imports and
// therefore are always executed.

// Import dependencies
//
// If you no longer want to use a dependency, remember
// to also remove its path from "config.paths.watched".
import "phoenix_html"

// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

import socket from "./socket"

let channel = socket.channel("call", {})
channel.join()
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
    channel.push("message", {body: JSON.stringify({
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
    channel.push("message", {body: JSON.stringify({
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

channel.on('message', payload => {
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