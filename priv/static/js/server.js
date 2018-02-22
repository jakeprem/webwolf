var iceServers = {
  "iceServers": [
    { "url": "stun:stun.l.google.com:19302" }
  ]
};

var vueApp = new Vue({
  el: '#serverApp',
  data: {
    phxSocket: null,
    phxCallChannel: null,
    username: '__server__',
    connections: {
    },
    clientMessages: {

    }
  },
  methods: {
    openNewClientConnection(clientId, offer) {
      this.connections[clientId] = {
        pc: new RTCPeerConnection(iceServers)
      }
      let peerConnection = this.connections[clientId].pc
      peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(_ => {
          return peerConnection.createAnswer()
        })
        .then(answer => {
          return peerConnection.setLocalDescription(answer)
        })
        .then(_ => {
          this.phxCallChannel.push('call:' + clientId, {
            body: JSON.stringify({sdp: peerConnection.localDescription}),
            clientId,
            username: this.username
          })
        })
        .catch(error => {
          console.log(error)
        })
      
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          console.log("Local ICE candidate: \n" + event.candidate.candidate);
          let candidate = event.candidate
          this.phxCallChannel.push('call:' + clientId, {
            body: JSON.stringify({candidate}),
            clientId,
            username: this.username
          })
        }
      }
      peerConnection.ondatachannel = event => {
        this.connections[clientId].dataChannel = event.channel
        event.channel.onopen = _ => console.log('Remote channel is open')
        event.channel.onmessage = e => {
          console.log(e.data)
          // this.connections[clientId].lastMessage = e.data
          this.setClientMessage(clientId, e.data)
        }
      }
    },
    setClientMessage(clientId, data) {
      Vue.set(this.clientMessages, clientId, JSON.parse(data))
    }
  },
  created() {
    this.username = '__server__'
    this.phxSocket = new Phoenix.Socket("/socket", {params: {user: this.username}})
    this.phxSocket.connect();

    this.phxCallChannel = this.phxSocket.channel('call:' + this.username)
    this.phxCallChannel.join()
      .receive("ok", () => { console.log("Successfully joined call channel")})
      .receive("error", () => {console.log("Unable to join call channel.")})

    this.phxCallChannel.on('call_incoming', payload => {
      let clientId = payload.clientId
      let username = payload.username
      let message = JSON.parse(payload.body)
      // console.log(payload)

      if (message.sdp) {
        let offer = message.sdp
        this.openNewClientConnection(clientId, offer)
      } else if (message.candidate) {
        this.connections[clientId].pc.addIceCandidate(new RTCIceCandidate(message.candidate))
      }
    })
  }
})