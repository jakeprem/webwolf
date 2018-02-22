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
      data = JSON.parse(data)
      if (data.message != 'neutral') {
        Vue.set(this.clientMessages, clientId, data)
      }
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


var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update });

function preload() {
    let baseURL = 'http://www.pngmart.com/files/3/'
    let imageName = "Sports-Ball-PNG-Clipart-279x279.png"
    game.load.baseURL = baseURL
    game.load.crossOrigin = 'anonymous';
    game.load.image('phaser', imageName);

}

var sprite;


function create() {

    var graphics = game.add.graphics(100, 100);

    // graphics.lineStyle(2, 0xffd900, 1);

    graphics.beginFill(0xFF0000, 1);
    graphics.drawCircle(0, 0, 100);
    graphics.endFill();
    
    game.stage.backgroundColor = '#000000';

    // sprite = game.add.sprite(350, 250, 'phaser');
    // sprite.scale.setTo(0.1, 0.1)
    sprite = graphics

}

function update() {

    Object.keys(vueApp.clientMessages).forEach(
      (x) => {
        let value = vueApp.clientMessages[x].message;
        console.log('X:'+sprite.x + ' Y:'+sprite.y)
        if (value == 'up' && sprite.y >= -300) {
          sprite.y--
        }
        else if (value == 'down' && sprite.y <= 300) {
          sprite.y++
        }
        else if (value == 'left' && sprite.x >= 0) {
          sprite.x--
        }
        else if (value == 'right' && sprite.x <= 800) {
          sprite.x++
        }
      }
    )
}
