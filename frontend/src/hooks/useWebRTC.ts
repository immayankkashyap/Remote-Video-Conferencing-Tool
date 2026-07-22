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

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Free Google STUN
    {
      urls: "turn:openrelay.metered.ca:80",   // Metered TURN Relay
      username: "openrelayproject",
      credential: "openrelayprojectsecret"
    }
  ]
};

export const useWebRTC = (
  roomId: string,
  hasJoined: boolean,
  userName: string,
  onRemoteStartRecord?: (sessionId: string) => void,
  onRemoteStopRecord?: () => void
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  // Mapping of peer socket ID to their MediaStream
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  // Mapping of peer socket ID to their usernames
  const [peerNames, setPeerNames] = useState<Map<string, string>>(new Map());
  // Mapping of peer socket ID to their connection status
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, ConnectionStatus>>(new Map());

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [roomFull, setRoomFull] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Store all RTCPeerConnections keyed by peer socket ID
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const onRemoteStartRecordRef = useRef(onRemoteStartRecord);
  const onRemoteStopRecordRef = useRef(onRemoteStopRecord);

  useEffect(() => {
    onRemoteStartRecordRef.current = onRemoteStartRecord;
    onRemoteStopRecordRef.current = onRemoteStopRecord;
  });

  // Local-only Media setup when in Lobby
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
  }, [hasJoined]);

  // Main multi-peer WebRTC connection and signaling logic
  useEffect(() => {
    if (!hasJoined) return;

    let isDisposed = false;
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const isMediaReadyRef = { current: false };

    // Set up local media stream and join the room
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

    // Helper to instantiate a new RTCPeerConnection for a specific peer
    const createPeerConnection = (peerSocketId: string, peerUsername: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(configuration);

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("signal", {
            to: peerSocketId,
            data: {
              type: "candidate",
              candidate: event.candidate.toJSON(),
            } satisfies SignalEnvelope,
          });
        }
      };

      const remoteMediaStream = new MediaStream();
      
      pc.ontrack = (event) => {
        console.log(`[webrtc] track received from ${peerUsername} (${peerSocketId})`);
        event.streams[0]?.getTracks().forEach((track) => {
          const alreadyAdded = remoteMediaStream
            .getTracks()
            .some((existingTrack) => existingTrack.id === track.id);
          if (!alreadyAdded) {
            remoteMediaStream.addTrack(track);
          }
        });

        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(peerSocketId, remoteMediaStream);
          return next;
        });

        setConnectionStatuses((prev) => {
          const next = new Map(prev);
          next.set(peerSocketId, "connected");
          return next;
        });
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        let mappedStatus: ConnectionStatus = "waiting";
        if (state === "connected") {
          mappedStatus = "connected";
        } else if (state === "connecting") {
          mappedStatus = "connecting";
        } else if (state === "disconnected" || state === "failed" || state === "closed") {
          mappedStatus = "disconnected";
        }

        setConnectionStatuses((prev) => {
          const next = new Map(prev);
          next.set(peerSocketId, mappedStatus);
          return next;
        });
      };

      // Add local tracks to this new connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      peersRef.current.set(peerSocketId, pc);
      setPeerNames((prev) => {
        const next = new Map(prev);
        next.set(peerSocketId, peerUsername);
        return next;
      });

      setConnectionStatuses((prev) => {
        const next = new Map(prev);
        next.set(peerSocketId, "waiting");
        return next;
      });

      return pc;
    };

    socket.on("connect", () => {
      console.log("[frontend] socket connected", socket.id);
      setRoomFull(false);
      if (isMediaReadyRef.current) {
        console.log("[frontend] emitting join-room (socket connected second)");
        socket.emit("join-room", { roomId, username: userName });
      }
    });

    // Received when we first join the room. Represents all current active participants.
    socket.on("all-peers", async ({ peers }: { peers: { id: string; username: string }[] }) => {
      console.log(`[webrtc] all-peers list received. Connecting to:`, peers);
      
      for (const peer of peers) {
        const pc = createPeerConnection(peer.id, peer.username);
        
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.emit("signal", {
            to: peer.id,
            data: {
              type: "offer",
              sdp: offer,
            } satisfies SignalEnvelope,
          });
        } catch (err) {
          console.error(`Failed to create offer for peer ${peer.username}:`, err);
        }
      }
    });

    // Received when another user enters the room.
    socket.on("user-joined", ({ id, username }: { id: string; username: string }) => {
      console.log(`[webrtc] user-joined: ${username} (${id})`);
      // Just instantiate connection and wait for their offer.
      createPeerConnection(id, username);
    });

    // Signaling relay handler
    socket.on("signal", async ({ from, data }: IncomingSignalPayload) => {
      const pc = peersRef.current.get(from);
      if (!pc) {
        console.warn(`[webrtc] signal received for unknown peer: ${from}`);
        return;
      }

      if (data.type === "offer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("signal", {
            to: from,
            data: {
              type: "answer",
              sdp: answer,
            } satisfies SignalEnvelope,
          });
        } catch (err) {
          console.error(`Error handling offer from peer ${from}:`, err);
        }
        return;
      }

      if (data.type === "answer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (err) {
          console.error(`Error handling answer from peer ${from}:`, err);
        }
        return;
      }

      if (data.type === "candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error(`Error adding ICE candidate from peer ${from}:`, err);
        }
      }
    });

    socket.on("user-left", (peerSocketId: string) => {
      const peerUsername = peerNames.get(peerSocketId) || "Peer";
      console.log(`[webrtc] user-left: ${peerUsername} (${peerSocketId})`);
      
      const pc = peersRef.current.get(peerSocketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(peerSocketId);
      }

      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(peerSocketId);
        return next;
      });

      setPeerNames((prev) => {
        const next = new Map(prev);
        next.delete(peerSocketId);
        return next;
      });

      setConnectionStatuses((prev) => {
        const next = new Map(prev);
        next.delete(peerSocketId);
        return next;
      });
    });

    socket.on("room-full", () => {
      setRoomFull(true);
      setError("Room is full. Phase 2 mesh network supports up to 6 participants.");
    });

    socket.on("start-recording-trigger", (payload) => {
      console.log("[frontend] received start-recording-trigger", payload);
      onRemoteStartRecordRef.current?.(payload?.sessionId);
    });

    socket.on("stop-recording-trigger", () => {
      console.log("[frontend] received stop-recording-trigger");
      onRemoteStopRecordRef.current?.();
    });

    void ensureLocalMedia();

    return () => {
      isDisposed = true;
      
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;

      // Close all active peer connections
      peersRef.current.forEach((pc) => {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
      });
      peersRef.current.clear();

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);

      setRemoteStreams(new Map());
      setPeerNames(new Map());
      setConnectionStatuses(new Map());
    };
  }, [roomId, hasJoined, userName]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextEnabled = !stream.getAudioTracks().every((track) => track.enabled);
    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setIsMicEnabled(nextEnabled);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
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
    remoteStreams,
    peerNames,
    connectionStatuses,
    isMicEnabled,
    isCameraEnabled,
    roomFull,
    error,
    toggleMic,
    toggleCamera,
    hostStartRecording,
    hostStopRecording,
    notifyInvite,
  };
};
