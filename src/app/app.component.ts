import { Component, OnInit, ViewChild, ElementRef, Injectable } from '@angular/core';
import { HubConnection } from '@aspnet/signalr';
import { UUID } from 'angular2-uuid';
import { connectionManager } from './connectionManager';
declare let alertify: any;



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
@Injectable()
export class AppComponent implements OnInit {

  hubConnection: HubConnection;
  nick = '';
  message = '';
  messages: string[] = [];


  _connectionManager;

  /**
   *
   */
  constructor(connectionManager: connectionManager) {

    this._connectionManager= connectionManager;
  }

  @ViewChild('startButton') startButton: ElementRef;
  @ViewChild('callButton') callButton: ElementRef;
  @ViewChild('hangupButton') hangupButton: ElementRef;
  @ViewChild('localVideo') localVideo: ElementRef;
  @ViewChild('remoteVideo') remoteVideo: ElementRef;

  startButtonDisabled = false;
  callButtonDisabled = true;
  hangupButtonDisabled = true;
  Users=[];
  userName:string;
  myConnectionId:string;


  _mediaStream;


  _connect(onSuccess) {
    // Set Up SignalR Signaler
    this.hubConnection = new HubConnection('https://192.168.1.100:45457/chat');

    this.hubConnection
      .start()
      .then((data) => {

        console.log('Connection started!')
      

        this.hubConnection
        .invoke('join')
        .catch(err => console.error(err));

        if (onSuccess) {
          onSuccess(this.hubConnection,this);
        }

      })
      .catch(err => console.log('Error while establishing connection :('));

    // Setup client SignalR operations
    this._setupHubCallbacks(this.hubConnection);
  }

  _setupHubCallbacks(hub) {
    this.hubConnection.on('incomingCall', (callingUser) => {

      hub
        .invoke('answerCall', true, callingUser.connectionId)
        .catch(err => console.error(err));

    });

    this.hubConnection.on('callAccepted', (acceptingUser) => {

      console.log('call accepted from: ' + JSON.stringify(acceptingUser) + '.  Initiating WebRTC call and offering my stream up...');
      this._connectionManager._initiateOffer(acceptingUser.connectionId, this._mediaStream);

    });


    this.hubConnection.on('callDeclined', (decliningConnectionId, reason) => {

      console.log('call declined from: ' + decliningConnectionId);
    });

    this.hubConnection.on('callEnded', (connectionId, reason) => {

      this._connectionManager._closeConnection(connectionId);
    });

    this.hubConnection.on('updateUserList', (userList) => {

      this.Users=userList;
      console.log(userList);
    });
    this.hubConnection.on('receiveSignal', (callingUser, data) => {

      this._connectionManager._newSignal(callingUser.connectionId, data);
    });

  }

  start() {
    // Show warning if WebRTC support is not detected
    // Then proceed to the next step, gathering username
    this._startSession();
  }

  change(){


      this.hubConnection
        .invoke('changeStreamer')
        .catch(err => console.error(err));
  
    
  }

  _getUsername() {

    // proceed to next step, get media access and start up our connection
    this._startSession();
  }

  _startSession() {

    console.log()
    // Ask the user for permissions to access the webcam and mic
    var constraints = {
      video: {
        width:200,
        height:200
      },
      audio: true,
    };

    navigator.mediaDevices.getUserMedia(constraints).then((data) => {




      this._connect((hub)=> {
        // tell the viewmodel our conn id, so we can be treated like the special person we are.

        alert("denme");
        // Initialize our client signal manager, giving it a signaler (the SignalR hub) and some callbacks
        console.log('initializing connection manager');
        this._connectionManager._initialize(hub, this._callbacks.onReadyForStream, this._callbacks.onStreamAdded, this._callbacks.onStreamRemoved);

        // Store off the stream reference so we can share it later
        this._mediaStream = data;

        // Load the stream into a video element so it starts playing in the UI
        console.log('playing my local video feed');
        this.localVideo.nativeElement.srcObject = this._mediaStream;


        // Hook up the UI


      });


    });
  }



  _callbacks = {
    onReadyForStream: (connection)=> {
      // The connection manager needs our stream
      // todo: not sure I like this
      connection.addStream(this._mediaStream);
    },
    onStreamAdded: (connection, event)=>{
      console.log('binding remote stream to the partner window');

      // Bind the remote stream to the partner window

      this.remoteVideo.nativeElement.srcObject = event.stream;
    },
    onStreamRemoved: function (connection, streamId) {
      // todo: proper stream removal.  right now we are only set up for one-on-one which is why this works.
      console.log('removing remote stream from partner window');

      // Clear out the partner window
      this.remoteVideo.nativeElement.srcObject = '';
    }
  };





  ngOnInit() {



  }


  birineBaglan(targetConnectionId){
    this.hubConnection
      .invoke('callUser', targetConnectionId)
      .catch(err => console.error(err));

  }


  public sendMessage(): void {
    this.hubConnection
      .invoke('sendToAll', this.nick, this.message)
      .catch(err => console.error(err));

  }
} 
