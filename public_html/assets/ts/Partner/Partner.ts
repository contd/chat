import { IPartner } from "./IPartner.js";
import { WebRTC } from "../Communication/WebRTC.js";
import { IExchange } from "../Exchange/IExchange.js";
import { JQueryUtils } from "../Utils/JQuery.js";
import { Devices } from "../Elements/Devices.js";

export class Partner implements IPartner{

    id: number;
    videoElement: HTMLElement;
    connection: RTCPeerConnection;
    devices: Devices;
    exchange: IExchange
    connected: boolean = false;
    offerLoop: any;

    constructor(id: number, exchange: IExchange, devices: Devices){
        this.id = id;
        this.exchange = exchange;
        this.devices = devices;
        var communication = new WebRTC(this);
        communication.addOnaddtrackEvent(this.onAddTrack);
        communication.addOnicecandidateEvent(this.onIceCandidate); 
        communication.addConnectionLosedEvent(this.onConnectionLosed);
        communication.addConnectionEvent(this.onConnected);
        this.connection = communication.getPeerConnection();
    }

    createOffer(): void {
        this.createOfferInner();
        var loop = 12;
        var cla = this;
        this.offerLoop = setInterval(function(){
            if(!cla.connected){
                if(loop == 0){
                    clearInterval(cla.offerLoop);
                    cla.closeConnection();
                }else{
                    cla.createOfferInner();
                    loop--;
                }
            }
        }, 5000);
    }

    createOfferInner(): void{
        if(!this.connected){
            let cla = this;
            this.connection.createOffer({iceRestart: true})
            .then(function(offer){
                return cla.connection.setLocalDescription(offer);
            })
            .then(function(){
                cla.exchange.sendMessage(JSON.stringify({'sdp': cla.connection.localDescription}), cla.id);
            });
        }
    }

    onIceCandidate(candidate: any, partner: IPartner) {
        partner.exchange.sendMessage(JSON.stringify({'ice': candidate}), this.id);
    };
    
    onAddTrack(stream: any, partner: IPartner) { 
        partner.addVideoElement();
        // @ts-ignore
        partner.videoElement.srcObject = stream;
    };

    addVideoElement(){
        if(this.videoElement == undefined){
            $("#video-area").append('<div class="video-item video-item-partner" id="video-item-'+this.id+'"><div class="video-wrap"><div class="video-inner-wrap"><video id="video-'+this.id+'" autoplay playsinline></video></div></div></div>');
            this.videoElement = document.getElementById('video-'+this.id);
            JQueryUtils.addToBigfunction("video-item-"+this.id);
            this.setSinkId(this.devices.devicesVueObject.sound);
        }
    }

    onConnected(partner: IPartner){
        partner.connected = true;
        clearInterval(partner.offerLoop);
        $('#video-item-'+partner.id).show();
    }

    onConnectionLosed(partner: IPartner){
        partner.connected = false;
        partner.createOffer(); 
        $('#video-item-'+partner.id).hide();
    }

    closeConnection(){
        this.connection.close();
        console.log("Connection closed to: "+this.id);
        $('#video-item-'+this.id).remove();
    }

    setSinkId(sinkId: any): void{
        if(this.videoElement != undefined){
            // @ts-ignore
            this.videoElement.setSinkId(sinkId);
        }
    }
}