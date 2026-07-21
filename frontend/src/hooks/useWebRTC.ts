"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type ConnectionStatus = "waiting" | "connecting" | "connected" | "disconnected";

type SignalEnvelope =
  | {
      type: "offer";
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "answer";
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "candidate";
      candidate: RTCIceCandidateInit;
    };

type IncomingSignalPayload = {
  from: string;
  data: SignalEnvelope;
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export const useWebRTC = (
  roomId: string,
  hasJoined: boolean,
  userName: string,
  onRemoteStartRecord?: (sessionId: string) => void,
  onRemoteStopRecord?: () => void
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("waiting");
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [roomFull, setRoomFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string>("Peer");

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteSocketIdRef = useRef<string | null>(null);

  const onRemoteStartRecordRef = useRef(onRemoteStartRecord);
  const onRemoteStopRecordRef = useRef(onRemoteStopRecord);

  useEffect(() => {
    onRemoteStartRecordRef.current = onRemoteStartRecord;
    onRemoteStopRecordRef.current = onRemoteStopRecord;
  });

  useEffect(() => {
    let isDisposed = false;

    if (!hasJoined) {
      const ensureLocalMediaOnly = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

          if (isDisposed) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          localStreamRef.current = stream;
          setLocalStream(stream);
          setIsMicEnabled(stream.getAudioTracks().every((track) => track.enabled));
          setIsCameraEnabled(stream.getVideoTracks().every((track) => track.enabled));
        } catch (mediaError) {
          console.error("Failed to access local media in lobby", mediaError);
          setError("Could not access camera or microphone.");
        }
      };

      void ensureLocalMediaOnly();

      return () => {
        isDisposed = true;
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      };
    }

    const remoteMediaStream = new MediaStream();
    remoteStreamRef.current = remoteMediaStream;
    setRemoteStream(remoteMediaStream);

    // STUN helps peers discover their public-facing network addresses.
    // TURN provides a relay fallback for users behind restrictive NATs or corporate firewalls.
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, // Free Google STUN
        {
          urls: "turn:openrelay.metered.ca:80",   // Metered TURN Relay
          username: "openrelayproject",
          credential: "openrelayprojectsecret"
        }
      ],
    });
    peerConnectionRef.current = peerConnection;

    // ICE candidates are small network hints exchanged after SDP so peers can
    // try multiple routes when forming the direct connection.
    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !remoteSocketIdRef.current || !socketRef.current) {
        return;
      }

      socketRef.current.emit("signal", {
        to: remoteSocketIdRef.current,
        data: {
          type: "candidate",
          candidate: event.candidate.toJSON(),
        } satisfies SignalEnvelope,
      });
    };

    // `ontrack` fires when the remote peer adds audio/video tracks to the
    // connection. We collect them into a MediaStream for the UI.
    peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStreamRef.current) {
          return;
        }

        const alreadyAdded = remoteStreamRef.current
          .getTracks()
          .some((existingTrack) => existingTrack.id === track.id);

        if (!alreadyAdded) {
          remoteStreamRef.current.addTrack(track);
        }
      });

      setRemoteStream(remoteStreamRef.current);
      setConnectionStatus("connected");
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;

      if (state === "connected") {
        setConnectionStatus("connected");
      } else if (state === "connecting") {
        setConnectionStatus("connecting");
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        setConnectionStatus("disconnected");
      }
    };

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const isMediaReadyRef = { current: false };

    const ensureLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (isDisposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsMicEnabled(stream.getAudioTracks().every((track) => track.enabled));
        setIsCameraEnabled(stream.getVideoTracks().every((track) => track.enabled));

        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        isMediaReadyRef.current = true;
        if (socket.connected) {
          console.log("[frontend] emitting join-room (media ready first)");
          socket.emit("join-room", { roomId, username: userName });
        }
      } catch (mediaError) {
        console.error("Failed to access local media", mediaError);
        setError("Could not access camera or microphone.");
      }
    };

    const handleOffer = async (from: string, sdp: RTCSessionDescriptionInit) => {
      setConnectionStatus("connecting");
      remoteSocketIdRef.current = from;

      // SDP describes what media each side wants to send and receive.
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("signal", {
        to: from,
        data: {
          type: "answer",
          sdp: answer,
        } satisfies SignalEnvelope,
      });
    };

    const handleAnswer = async (sdp: RTCSessionDescriptionInit) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    };

    const handleCandidate = async (candidate: RTCIceCandidateInit) => {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (candidateError) {
        console.error("Failed to add ICE candidate", candidateError);
      }
    };

    socket.on("connect", () => {
      console.log("[frontend] socket connected", socket.id);
      setRoomFull(false);
      setConnectionStatus("waiting");
      if (isMediaReadyRef.current) {
        console.log("[frontend] emitting join-room (socket connected second)");
        socket.emit("join-room", { roomId, username: userName });
      }
    });

    socket.on("user-joined", async (payload: { id: string; username: string } | string) => {
      let peerSocketId: string;
      let peerUsername = "Peer";
      if (payload && typeof payload === "object") {
        peerSocketId = payload.id;
        peerUsername = payload.username;
      } else {
        peerSocketId = payload;
      }

      console.log("[frontend] user-joined", peerSocketId, peerUsername);
      remoteSocketIdRef.current = peerSocketId;
      setPeerName(peerUsername);
      setConnectionStatus("connecting");

      // The existing peer creates the initial SDP offer when the second peer arrives.
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("signal", {
        to: peerSocketId,
        data: {
          type: "offer",
          sdp: offer,
        } satisfies SignalEnvelope,
      });
    });

    socket.on("peer-info", ({ id, username }: { id: string; username: string }) => {
      console.log("[frontend] peer-info", id, username);
      remoteSocketIdRef.current = id;
      setPeerName(username);
    });

    socket.on("signal", async ({ from, data }: IncomingSignalPayload) => {
      console.log("[frontend] signal", data.type, "from", from);
      remoteSocketIdRef.current = from;

      if (data.type === "offer") {
        await handleOffer(from, data.sdp);
        return;
      }

      if (data.type === "answer") {
        await handleAnswer(data.sdp);
        return;
      }

      await handleCandidate(data.candidate);
    });

    socket.on("user-left", (peerSocketId: string) => {
      console.log("[frontend] user-left", peerSocketId);
      remoteSocketIdRef.current = null;
      setPeerName("Peer");
      setConnectionStatus("waiting");

      remoteStreamRef.current?.getTracks().forEach((track) => {
        remoteStreamRef.current?.removeTrack(track);
      });
      setRemoteStream(remoteStreamRef.current);
    });

    socket.on("room-full", () => {
      setRoomFull(true);
      setConnectionStatus("disconnected");
      setError("Room is full. Phase 1 only supports two peers per room.");
    });

    socket.on("start-recording-trigger", (payload) => {
      console.log("[frontend] received start-recording-trigger", payload);
      onRemoteStartRecordRef.current?.(payload?.sessionId);
    });

    socket.on("stop-recording-trigger", () => {
      console.log("[frontend] received stop-recording-trigger");
      onRemoteStopRecordRef.current?.();
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    void ensureLocalMedia();

    return () => {
      isDisposed = true;

      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;

      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
      peerConnectionRef.current = null;

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);

      remoteStreamRef.current?.getTracks().forEach((track) => {
        remoteStreamRef.current?.removeTrack(track);
      });
      remoteStreamRef.current = null;
      setRemoteStream(null);
    };
  }, [roomId, hasJoined, userName]);

  const toggleMic = () => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const nextEnabled = !stream.getAudioTracks().every((track) => track.enabled);

    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });

    setIsMicEnabled(nextEnabled);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const nextEnabled = !stream.getVideoTracks().every((track) => track.enabled);

    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });

    setIsCameraEnabled(nextEnabled);
  };

  const hostStartRecording = (userId: string, sessionId: string) => {
    socketRef.current?.emit("host-start-recording", { roomId, userId, sessionId });
  };

  const hostStopRecording = (userId: string) => {
    socketRef.current?.emit("host-stop-recording", { roomId, userId });
  };

  const notifyInvite = (inviteeEmail: string, inviteData: any) => {
    socketRef.current?.emit("notify-invite", { inviteeEmail, inviteData });
  };

  return {
    localStream,
    remoteStream,
    connectionStatus,
    isMicEnabled,
    isCameraEnabled,
    roomFull,
    error,
    peerName,
    toggleMic,
    toggleCamera,
    hostStartRecording,
    hostStopRecording,
    notifyInvite,
  };
};
