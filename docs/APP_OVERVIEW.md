# Jam Desktop - Application Overview

This document explains what the app is, what it is trying to do, and how the major pieces fit together.

## Purpose

Jam Desktop is a desktop jam platform built around one core idea: the jam is the center of the product.

The Electron app handles discovery, social features, account state, room presence, and audience listening. The actual low-latency performance side lives in a separate native C++ jam client that the desktop app launches as a child process. That native client owns live mic capture, real-time audio transport, DSP, timing, and mixing.

## Product Model

- Listeners can tune into live jams through HLS streams inside the Electron app.
- Performers join through the native C++ client for low-latency audio.
- Social features exist to help users find people, rooms, and communities to jam with.
- The app is friends-first rather than a generic public social network.

## Main Product Areas

### Social and discovery

- Feed for posts, clips, updates, and discovery
- Profiles with identity, social graph, and activity
- Friends system with requests, accepted friends, and DMs
- Communities for genre- or interest-based organization

### Jam flows

- Room discovery and room management
- Live audience listening through HLS
- Live room chat and participant presence
- Native performer launch path through Electron -> C++ client

### Musician utility flows

- Bands listing/apply flow for finding collaborators
- My Music track library for storing uploaded personal audio

## Architecture

### Electron app

The Electron layer is the product shell. It handles:

- authentication and app session state
- desktop windowing and OS integration
- navigation and page rendering
- room/session launch orchestration
- native client spawning and monitoring

It does not own the critical real-time audio path.

### React UI

The renderer process is a React app with a desktop-first design system. It is responsible for:

- route-based product surfaces (`/feed`, `/friends`, `/communities`, `/jams`, `/bands`, `/my-music`, `/profile`, `/post`, `/jam/:handle`)
- social interactions and content creation
- HLS playback for passive listeners
- room presence and chat UI
- global shell/navigation patterns

### Convex backend

Convex is the source of truth for app data. It currently backs:

- profiles and profile settings
- friends, requests, and suggestions
- DMs and conversation previews
- posts, comments, likes, and replies
- communities and memberships
- rooms, presence, and room chat
- band listings and applications
- my-tracks metadata

### Native C++ jam client

The native client handles:

- microphone/device access
- low-latency audio capture and playback
- synchronization and transport
- real-time audio processing
- performance-side session participation

## User Flows

### Passive listening

1. User signs in and discovers a room through the Electron UI.
2. User chooses to listen.
3. The Electron app plays the room's HLS stream directly.
4. No native performer client is launched.

### Active performance

1. User discovers or opens a room in the Electron UI.
2. User chooses to join as a performer.
3. Electron launches the native C++ jam client and passes session/auth metadata.
4. The native client handles live audio participation.
5. Electron remains responsible for the surrounding social/session UI.

### Social participation

Users can:

- post updates and clips
- like, comment, and reply
- add friends and DM them
- join communities
- browse or create band listings
- manage personal uploaded tracks in My Music

## Design Direction

The app uses a desktop-native, multi-panel layout language rather than mobile-stretched pages.

Key design principles:

- dark studio / warm studio visual identity
- dense but readable desktop layouts
- strong component reuse
- clear panel/header structure
- interaction patterns suited to a desktop app rather than a responsive web feed clone

## Summary

Jam Desktop is a desktop social jam application where the Electron/React app owns discovery, identity, and social workflows, while the native C++ client owns the actual low-latency performance experience.
