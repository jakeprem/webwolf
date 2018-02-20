import "phoenix_html"
import {Socket, Presence} from "phoenix"

var presences = {}

Window.vueApp = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue',
    username: '',
    socket: null,
    room: null,
    presences: {},
    messages: [],
    messageInput: '',

    callChannel: null,
    listenChannel: null,
    peerConnection: null,
    sendDataChannel: null,
    receieveDataChannel: null,
    callingUser: ''
  },
  computed: {
    presenceList() {
      return Presence.list(this.cleanObject(this.presences), this.listBy)
    }
  },
  methods: {
    joinChat() {
      this.setupSocket();
      this.setupChatRoom();

      this.setupPeerConnection();
      this.setupListeningChannels();
    },
    sendMessage() {
      if (this.messageInput != '') {
        this.room.push("message:new", this.messageInput)
        this.messageInput = ''
      }
    },
    setupSocket() {
      this.socket = new Socket
      (
        "/socket", {params: {user: this.username}}
      );
      this.socket.connect();
    },
    setupChatRoom() {
      let room = this.socket.channel("room:lobby")
      room.on("presence_state", state => {
        this.presences = Presence.syncState(this.cleanObject(this.presences), state)
      })
      room.on("presence_diff", diff => {
        this.presences = Presence.syncDiff(this.cleanObject(this.presences), diff)
      })
      room.on("message:new", message => {
        this.messages.push(message)
      })
      this.room = room
      room.join()
    },
    formatTimeStamp(timestamp) {
      let date = new Date(timestamp)
      return date.toLocaleDateString();
    },
    listBy(user, {metas: metas}) {
      return {
        user: user,
        onlineAt: this.formatTimeStamp(metas[0].online_at)
      }
    },
    cleanObject(obj) {
      return JSON.parse(JSON.stringify(obj));
    },


    callUser(callUsername) {
      // this.setupCallingChannel();
      this.setupDataChannel();
      this.initiateCall();

      this.callingUser = callUsername
    },
    setupListeningChannels(callUsername) {
      this.listenChannel = this.socket.channel("call:" + this.username)
      this.listenChannel.join()
        .receive("ok", () => { console.log("Successfully joined listen channel!") })
        .receive("error", () => { console.log("Unable to join.") })

      this.listenChannel.on('call_incoming', payload => {
        let message = JSON.parse(payload.body);
        if (message.sdp) {
          this.gotRemoteDescription(message);
          this.callingUser = payload.user
        } else {
          this.gotRemoteIceCandidate(message);
        }
      });
    },
    // setupCallingChannels(callUsername) {
    //   this.callChannel = this.socket.channel("call:" + callUsername, {})
    //   this.callChannel.join()
    //     .receive("ok", () => { console.log("Successfully joined call channel!") })
    //     .receive("error", () => { console.log("Unable to join.") })
    // },
    setupPeerConnection() {
      let servers = {
        "iceServers": [
          { "url": "stun:stun.example.org" }
        ]
      };

      this.peerConnection = new RTCPeerConnection(servers);
      this.peerConnection.onicecandidate = this.gotLocalIceCandidate
      this.peerConnection.ondatachannel = this.gotRemoteChannel
    },
    setupDataChannel() {
      this.sendDataChannel = this.peerConnection.createDataChannel('sendDataChannel')

      this.sendDataChannel.onerror = e => console.log('DCE:', e);
      this.sendDataChannel.onmessage = e => console.log('DCM:', e.data);
      this.sendDataChannel.onopen = _ => console.log('DCO');
      this.sendDataChannel.onclose = _ => console.log('DCC');
    },
    initiateCall() {
      this.peerConnection.createOffer(this.gotLocalDescription, this.handleError)
    },



    gotLocalDescription(description) {
      this.peerConnection.setLocalDescription(description, () => {
        this.listenChannel.push("call:" + this.callingUser, {
          body: JSON.stringify({"sdp": this.peerConnection.localDescription}),
          user: this.username
        });
      }, this.handleError)
    },
    gotRemoteDescription(description) {
      this.peerConnection.setRemoteDescription(new RTCSessionDescription(description.sdp))
      this.peerConnection.createAnswer(this.gotLocalDescription, this.handleError)
    },
    gotRemoteChannel(event) {
      this.receieveDataChannel = event.channel
      event.channel.onopen = _ => console.log('Remote channel is open')
      this.receieveDataChannel.onmessage = e => console.log(e.data)
    },
    gotLocalIceCandidate (event) {
      if (event.candidate) {
        console.log("Local ICE candidate: \n" + event.candidate.candidate);
        this.listenChannel.push("call:" + this.callingUser, {body: JSON.stringify({
          "candidate": event.candidate
        })});
      }
    },
    gotRemoteIceCandidate (event) {
      if (event.candidate) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
      }
    },
    handleError(error) {
      console.log(error)
    }
  },
  created() {
  }
})

// ##########################################################################
// ## WEBRTC STUFF BELOW HERE ###############################################
// ##########################################################################

// let callChannel = socket.channel("call", {})
// callChannel.join()
//   .receive("ok", () => { console.log("Successfully joined call channel!") })
//   .receive("error", () => { console.log("Unable to join.") })

// let dataChannel, peerConnection, receieveChannel;
// let connectButton = document.getElementById('connect');
// let callButton = document.getElementById('call');
// let hangupButton = document.getElementById('hangup');

// hangupButton.disabled = true;
// callButton.disabled = true;
// connectButton.onclick = connect;
// callButton.onclick = call;
// hangupButton.onclick = hangup;

// var peerChannel;

// function connect () {
//   setupPeerConnection()
// }

// function setupPeerConnection () {
//   connectButton.disabled = true;
//   callButton.disabled = false;
//   hangupButton.disabled = false;
//   console.log('Waiting for call');

//   let servers = {
//     "iceServers": [
//       {
//         "url": "stun:stun.example.org"
//       }
//     ]
//   };

//   peerConnection = new RTCPeerConnection(servers);
//   Window.peerConnection = peerConnection;
//   console.log('Created local peer connection');
//   peerConnection.onicecandidate = gotLocalIceCandidate;
//   peerConnection.ondatachannel = gotRemoteChannel;
//   dataChannel = peerConnection.createDataChannel('peerChannel');

//   dataChannel.onerror = e => console.log('DCE:', e);
//   dataChannel.onmessage = e => console.log('DCM:', e.data);
//   dataChannel.onopen = _ => console.log('DCO');
//   dataChannel.onclose = _ => console.log('DCC');
//   Window.peerChannel = dataChannel;

//   console.log('Added localChannel to localPeerConnection');

// }

// function call () {
//   callButton.disabled = true;
//   console.log('Starting call');
//   peerConnection.createOffer(gotLocalDescription, handleError);
// }

// function gotLocalDescription (description) {
//   peerConnection.setLocalDescription(description, () => {
//     callChannel.push("message", {body: JSON.stringify({
//       "sdp": peerConnection.localDescription
//     })});
//   }, handleError)
//   console.log('Offer from localPeerConnection: \n' + description.sdp);
// }

// function gotRemoteDescription (description) {
//   console.log('Answer from remotePeerConnection: \n' + description.sdp);
//   peerConnection.setRemoteDescription(new RTCSessionDescription(description.sdp));
//   peerConnection.createAnswer(gotLocalDescription, handleError);
// }

// function gotRemoteChannel (event) {
//   console.log('Received remote channel');
//   receieveChannel = event.channel;
//   Window.receieveChannel = receieveChannel;
//   event.channel.onopen = function() {
//     console.log('Remote channel is open!');
//   }
//   receieveChannel.onmessage = e => console.log(e.data)
// }

// function gotLocalIceCandidate (event) {
//   if (event.candidate) {
//     console.log("Local ICE candidate: \n" + event.candidate.candidate);
//     callChannel.push("message", {body: JSON.stringify({
//       "candidate": event.candidate
//     })});
//   }
// }

// function gotRemoteIceCandidate (event) {
//   callButton.disabled = true;
//   if (event.candidate) {
//     peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
//   }
// }

// callChannel.on('message', payload => {
//   let message = JSON.parse(payload.body);
//   if (message.sdp) {
//     gotRemoteDescription(message);
//   } else {
//     gotRemoteIceCandidate(message);
//   }
// });

// function hangup() {
//   console.log('Ending call');
//   peerConnection.close();
//   localVideo.src = null;
//   peerConnection = null;
//   hangupButton.disabled = true;
//   connectButton.disabled = false;
//   callButton.disabled = true;
// }

// function handleError(error) {
//   // console.log(error.name + ": " + error.message);
//   console.log(error);
// }