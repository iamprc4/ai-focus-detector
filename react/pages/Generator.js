import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Generator.css';
import {
  DEFAULT_EMOTIONS,
  normalizeEmotionScores,
  pickDisplayDominant,
  requestEmotionPrediction,
  storeAnalysisResult,
} from '../utils/emotionDetection';

const EMOTION_META = {
  happy: { emoji: '\u{1F60A}', label: 'Happy', accent: '#f59e0b' },
  neutral: { emoji: '\u{1F610}', label: 'Neutral', accent: '#94a3b8' },
  surprise: { emoji: '\u{1F632}', label: 'Surprised', accent: '#f97316' },
  fear: { emoji: '\u{1F628}', label: 'Fearful', accent: '#8b5cf6' },
  disgust: { emoji: '\u{1F922}', label: 'Disgusted', accent: '#22c55e' },
  angry: { emoji: '\u{1F620}', label: 'Angry', accent: '#ef4444' },
  sad: { emoji: '\u{1F622}', label: 'Sad', accent: '#3b82f6' },
};

const PLAYLISTS = {
  english: {
    label: 'English',
    moods: {
      happy: [
        {
        name: 'Mood Booster',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLiZFy?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLiZFy',
        description: 'Bright pop to keep the smile going.',
        },
        {
        name: 'Happy Hits',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX9XIFQuFvzM4?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX9XIFQuFvzM4',
        description: 'More upbeat tracks when the vibe is already good.',
        },
      ],
      sad: [
        {
        name: 'Life Sucks',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX3YSRoSdA634?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX3YSRoSdA634',
        description: 'Soft songs when you want to sit with the feeling.',
        },
        {
        name: 'Sad Hour',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX7qK8E7ievfD?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX7qK8E7ievfD',
        description: 'A second mellow option for reflective moods.',
        },
      ],
      angry: [
        {
        name: 'Rock Hard',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWY3PJWG3ogmJ?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWY3PJWG3ogmJ',
        description: 'High-energy tracks to burn off tension.',
        },
        {
        name: 'Beast Mode',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX76Wlfdnj7AP?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP',
        description: 'Aggressive workout energy if you want to reset fast.',
        },
      ],
      fear: [
        {
        name: 'Confidence Boost',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWX83CujKHHOn?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWX83CujKHHOn',
        description: 'Steady, reassuring tracks to settle your nerves.',
        },
        {
        name: 'Calm Before Storm',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX3rxVfibe1L0?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0',
        description: 'Gentler tracks when you want comfort rather than intensity.',
        },
      ],
      neutral: [
        {
        name: 'Deep Focus',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ',
        description: 'Calm, minimal sound for a centered mood.',
        },
        {
        name: 'Chill Tracks',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX889U0CL85jj?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX889U0CL85jj',
        description: 'A more melodic option when neutral feels closer to chill.',
        },
      ],
      disgust: [
        {
        name: 'Clean Vibes',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4WYpdgoIcn6?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6',
        description: 'Fresh, smooth tracks to reset the room.',
        },
        {
        name: 'Fresh Finds',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4JAvHpjipBk?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk',
        description: 'Fresh picks for when you want something new quickly.',
        },
      ],
      surprise: [
        {
        name: 'Pop Party',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5va2w0nq9jw?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX5va2w0nq9jw',
        description: 'Fast, vivid songs for a playful spike of energy.',
        },
        {
        name: 'Feel Good Friday',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdxcBWuJkbcy?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DXdxcBWuJkbcy',
        description: 'Another bright and celebratory surprise-friendly mix.',
        },
      ],
    },
  },
  hindi: {
    label: 'Hindi',
    moods: {
      happy: [
        {
        name: 'Hindi Dance Hits',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWXtlo6ENS92N?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWXtlo6ENS92N',
        description: 'Feel-good Bollywood energy for happy moments.',
        },
        {
        name: 'Bollywood Butter',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWTAtTdFMiJYK?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWTAtTdFMiJYK',
        description: 'Warm Bollywood pop with a lighter feel.',
        },
      ],
      sad: [
        {
        name: 'Heartbreak Hindi',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWVdVUj7jY8J4?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWVdVUj7jY8J4',
        description: 'Bollywood ballads for quieter moods.',
        },
        {
        name: 'Hindi Love Songs',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX0i61tT0OnnK?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX0i61tT0OnnK',
        description: 'A softer second option when sad leans romantic.',
        },
      ],
      angry: [
        {
        name: 'Hindi Hustle',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX0XUfTFmNBRM?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM',
        description: 'Sharp beats to channel intensity into motion.',
        },
        {
        name: 'Desi Hip Hop',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5q67ZpWyRrZ?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX5q67ZpWyRrZ',
        description: 'A sharper rap-heavy set for high-energy moods.',
        },
      ],
      fear: [
        {
        name: 'Peaceful Hindi',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX6VdMW310YC7?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX6VdMW310YC7',
        description: 'Gentle Hindi tracks to help you settle down.',
        },
        {
        name: 'Soft Hindi',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5J7FIl4q56G?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX5J7FIl4q56G',
        description: 'A second gentle option with a steadier tone.',
        },
      ],
      neutral: [
        {
        name: 'Soft Hindi',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5J7FIl4q56G?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX5J7FIl4q56G',
        description: 'A mellow backdrop for steady, balanced moods.',
        },
        {
        name: 'Peaceful Hindi',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX6VdMW310YC7?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX6VdMW310YC7',
        description: 'More restorative if neutral is closer to calmness.',
        },
      ],
      disgust: [
        {
        name: 'Fresh Finds Hindi',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWYztMONFqfvX?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWYztMONFqfvX',
        description: 'Something new to snap you out of the off feeling.',
        },
        {
        name: 'Indie India',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWyXxk11K2FU?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWWyXxk11K2FU',
        description: 'Newer Indian tracks for a fresher reset.',
        },
      ],
      surprise: [
        {
        name: 'Bollywood Butter',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWTAtTdFMiJYK?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWTAtTdFMiJYK',
        description: 'Unexpected, upbeat Bollywood color and rhythm.',
        },
        {
        name: 'Hindi Indie Mix',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXd8cOUiye1o2?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DXd8cOUiye1o2',
        description: 'Another colorful recommendation with a bit more variety.',
        },
      ],
    },
  },
  korean: {
    label: 'K-Pop',
    moods: {
      happy: [
        {
          name: 'K-Pop ON!',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX9tPFwDMOaN1?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
          description: 'Official Spotify K-pop picks with current hits and familiar names like BLACKPINK and BTS.',
        },
        {
        name: 'Best of K-Pop ON! 2025',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWYlzvIAycznp?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWYlzvIAycznp',
        description: 'A year-best K-pop playlist with recognizable trending tracks.',
        },
      ],
      sad: [
        {
        name: 'This Is BTS',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX08mhnhv6g9b?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX08mhnhv6g9b',
        description: 'Well-known BTS songs like Dynamite, Butter and Spring Day for a familiar emotional mix.',
        },
        {
        name: 'K-Pop ON!',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX9tPFwDMOaN1?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
        description: 'A broader Korean pick when you want newer but still recognizable songs.',
        },
      ],
      angry: [
        {
        name: 'Best of K-Pop ON! 2025',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWYlzvIAycznp?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWYlzvIAycznp',
        description: 'Trending high-energy Korean tracks for intense moods.',
        },
        {
        name: 'This Is BTS',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX08mhnhv6g9b?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX08mhnhv6g9b',
        description: 'Popular BTS staples when you want familiar, powerful songs.',
        },
      ],
      fear: [
        {
        name: 'This Is BTS',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX08mhnhv6g9b?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX08mhnhv6g9b',
        description: 'A comforting familiar-listen option with softer BTS songs included.',
        },
        {
        name: 'K-Pop ON!',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX9tPFwDMOaN1?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
        description: 'A current Korean mix if you want mood-lifting modern songs.',
        },
      ],
      neutral: [
        {
        name: 'K-Pop ON!',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX9tPFwDMOaN1?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
        description: 'A balanced official K-pop recommendation with current recognizable hits.',
        },
        {
        name: 'This Is BTS',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX08mhnhv6g9b?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX08mhnhv6g9b',
        description: 'Known songs from BTS when you want something very familiar.',
        },
      ],
      disgust: [
        {
        name: 'Best of K-Pop ON! 2025',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWYlzvIAycznp?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWYlzvIAycznp',
        description: 'Fresh, trendy K-pop picks when you want a quick change of mood.',
        },
        {
        name: 'K-Pop ON!',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX9tPFwDMOaN1?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
        description: 'A more mainstream Korean mix with plenty of current names.',
        },
      ],
      surprise: [
        {
        name: 'K-Pop ON!',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX9tPFwDMOaN1?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
        description: 'Upbeat official K-pop picks for energetic and surprising moods.',
        },
        {
        name: 'Best of K-Pop ON! 2025',
        artist: 'Spotify',
        cover: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80',
        embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWYlzvIAycznp?utm_source=generator',
        link: 'https://open.spotify.com/playlist/37i9dQZF1DWYlzvIAycznp',
        description: 'A year-best list full of trendy recent K-pop songs.',
        },
      ],
    },
  },
  telugu: {
    label: 'Telugu',
    moods: {
      happy: [
        {
          name: 'Tollywood Pearls',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5VOFoIqmrOV?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX5VOFoIqmrOV',
          description: 'Popular Telugu songs with many familiar Tollywood favorites like Inkem Inkem and Srivalli.',
        },
        {
          name: 'This Is Sid Sriram',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO4ovoG0?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO4ovoG0',
          description: 'Well-known Telugu melodies centered around one of the most recognizable voices.',
        },
      ],
      sad: [
        {
          name: 'This Is Sid Sriram',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO4ovoG0?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO4ovoG0',
          description: 'Great for emotional Telugu songs that judges will likely recognize.',
        },
        {
          name: 'Rahman Telugu Hits',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX695EFn59me7?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX695EFn59me7',
          description: 'Classic A.R. Rahman Telugu picks for a more timeless recommendation.',
        },
      ],
      angry: [
        {
          name: 'Tollywood Pearls',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5VOFoIqmrOV?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX5VOFoIqmrOV',
          description: 'Includes energetic known Tollywood songs when you want a mass-appeal choice.',
        },
        {
          name: 'Rahman Telugu Hits',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX695EFn59me7?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX695EFn59me7',
          description: 'A second Telugu recommendation with known soundtrack names.',
        },
      ],
      fear: [
        {
          name: 'This Is Sid Sriram',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO4ovoG0?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO4ovoG0',
          description: 'Comforting Telugu tracks led by a highly familiar artist.',
        },
        {
          name: 'Tollywood Pearls',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5VOFoIqmrOV?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX5VOFoIqmrOV',
          description: 'A safer mainstream Telugu fallback with many known songs.',
        },
      ],
      neutral: [
        {
          name: 'Tollywood Pearls',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5VOFoIqmrOV?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX5VOFoIqmrOV',
          description: 'A broad Telugu recommendation with mainstream Tollywood songs.',
        },
        {
          name: 'Rahman Telugu Hits',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX695EFn59me7?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX695EFn59me7',
          description: 'A more classic soundtrack-based Telugu option.',
        },
      ],
      disgust: [
        {
          name: 'Tollywood Pearls',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5VOFoIqmrOV?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX5VOFoIqmrOV',
          description: 'A mainstream Telugu reset with popular known songs.',
        },
        {
          name: 'This Is Sid Sriram',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO4ovoG0?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO4ovoG0',
          description: 'A more melody-heavy Telugu option with recognizable vocals.',
        },
      ],
      surprise: [
        {
          name: 'Tollywood Pearls',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX5VOFoIqmrOV?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DX5VOFoIqmrOV',
          description: 'A lively Telugu list with popular Tollywood songs judges may know.',
        },
        {
          name: 'This Is Sid Sriram',
          artist: 'Spotify',
          cover: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80',
          embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO4ovoG0?utm_source=generator',
          link: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO4ovoG0',
          description: 'A popular vocal-led Telugu recommendation with many known songs.',
        },
      ],
    },
  },
};

function Generator() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const liveIntervalRef = useRef(null);
  const liveRequestInFlightRef = useRef(false);
  const abortControllerRef = useRef(null);
  const lastStoredResultRef = useRef({ emotion: null, timestamp: 0, confidence: 0 });

  const [mode, setMode] = useState('live');
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(EMOTION_META.happy.emoji);
  const [dominantEmotion, setDominantEmotion] = useState('happy');
  const [confidence, setConfidence] = useState(0);
  const [noFaceDetected, setNoFaceDetected] = useState(false);
  const [emotions, setEmotions] = useState(DEFAULT_EMOTIONS);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready when you are.');
  const [inferenceMs, setInferenceMs] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [facePatch, setFacePatch] = useState(null);

  const openPlaylistExternally = useCallback((playlist) => {
    if (!playlist?.link) return;
    window.open(playlist.link, '_blank', 'noopener,noreferrer');
  }, []);

  const stopCamera = useCallback(() => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const waitForVideoReady = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      return true;
    }

    await new Promise((resolve, reject) => {
      const handleReady = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error('Video stream did not become ready'));
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleReady);
        video.removeEventListener('canplay', handleReady);
        video.removeEventListener('error', handleError);
      };

      video.addEventListener('loadedmetadata', handleReady);
      video.addEventListener('canplay', handleReady);
      video.addEventListener('error', handleError);
    });

    return Boolean(video.videoWidth && video.videoHeight);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await waitForVideoReady();
      setStatusMessage('Camera is ready.');
      return true;
    } catch (err) {
      setStatusMessage('Unable to access camera. Please allow camera permission.');
      alert('Unable to access camera. Please check browser permission and make sure no other app is using the camera.');
      return false;
    }
  }, [stopCamera, waitForVideoReady]);

  const resetEmotionState = useCallback(() => {
    setNoFaceDetected(false);
    setCurrentEmotion(EMOTION_META.happy.emoji);
    setDominantEmotion('happy');
    setConfidence(0);
    setEmotions(DEFAULT_EMOTIONS);
    setInferenceMs(null);
    setFacePatch(null);
    setPlaylistIndex(0);
    setIsPlayerOpen(false);
  }, []);

  const getPlaylistsForEmotion = useCallback(
    (emotion) => {
      const languageBlock = PLAYLISTS[selectedLanguage];
      return languageBlock?.moods?.[emotion] || [];
    },
    [selectedLanguage]
  );

  const analyzeEmotion = useCallback(
    async (imageData, options = {}) => {
      if (!imageData) return null;

      const { silent = false } = options;

      if (abortControllerRef.current && !silent) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);

      if (!silent) {
        setLoading(true);
        setStatusMessage('Analyzing expression...');
      }

      try {
        const data = await requestEmotionPrediction(imageData, controller.signal);
        const normalized = normalizeEmotionScores(data.emotions || []);

        setEmotions(normalized);
        setInferenceMs(data.inference_ms ?? null);
        setFacePatch(data.face_patch ?? null);

        if (data.dominant) {
          const displayDominant = pickDisplayDominant(data.emotions, data.dominant, EMOTION_META);
          const dominant = displayDominant.label;
          setDominantEmotion(dominant);
          setCurrentEmotion(displayDominant.emoji || EMOTION_META[dominant]?.emoji || '?');
          setConfidence(displayDominant.percentage || 0);
          setNoFaceDetected(Boolean(data.no_face));
          setStatusMessage(
            data.no_face
              ? 'A mood guess was generated from the full image. For best accuracy, keep your face centered and well lit.'
              : `Detected ${displayDominant.display_label || dominant} with ${displayDominant.percentage}% confidence.`
          );
          setPlaylistIndex(0);
          storeAnalysisResult({
            emotion: dominant,
            score: displayDominant.percentage || 0,
            sourceMode: mode,
            emotionMeta: EMOTION_META,
            lastStoredRef: lastStoredResultRef,
          });
        } else {
          setEmotions({ ...DEFAULT_EMOTIONS });
          setDominantEmotion(null);
          setCurrentEmotion('!');
          setConfidence(0);
          setNoFaceDetected(true);
          setStatusMessage('No face detected. Please upload an image with a clear face.');
          setPlaylistIndex(0);
        }

        return data;
      } catch (err) {
        if (err.name === 'AbortError') {
          if (!silent) {
            setStatusMessage('The request took too long. Please try a clearer frame.');
          }
          return null;
        }

        setNoFaceDetected(true);
        setPlaylistIndex(0);
        setStatusMessage('Could not reach the backend. Make sure the Flask server is running on port 5000.');
        alert(`Error: ${err.message || 'Could not reach backend. Make sure it is running on port 5000.'}`);
        return null;
      } finally {
        window.clearTimeout(timeoutId);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [mode]
  );

  const captureCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [stopCamera]);

  useEffect(() => {
    setPlaylistIndex(0);
    setIsPlayerOpen(false);
  }, [selectedLanguage, dominantEmotion]);

  useEffect(() => {
    const enableCameraModes = async () => {
      if (mode === 'upload') {
        stopCamera();
        setIsDetecting(false);
        return;
      }
      await startCamera();
    };

    enableCameraModes();
  }, [mode, startCamera, stopCamera]);

  useEffect(() => {
    if (mode !== 'live' || !isDetecting) {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      return undefined;
    }

    const runLiveAnalysis = async () => {
      if (liveRequestInFlightRef.current) return;
      const frame = captureCurrentFrame();
      if (!frame) {
        setStatusMessage('Waiting for camera frame...');
        return;
      }

      liveRequestInFlightRef.current = true;
      try {
        await analyzeEmotion(frame, { silent: true });
      } finally {
        liveRequestInFlightRef.current = false;
      }
    };

    setStatusMessage('Live detection started.');
    runLiveAnalysis();
    liveIntervalRef.current = window.setInterval(runLiveAnalysis, 1400);

    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    };
  }, [mode, isDetecting, captureCurrentFrame, analyzeEmotion]);

  const capturePhoto = useCallback(async () => {
    const isReady = await waitForVideoReady();
    if (!isReady) {
      alert('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    const frame = captureCurrentFrame();
    if (!frame) {
      alert('Could not capture the photo. Please try again.');
      return;
    }

    setCapturedImage(frame);
    setStatusMessage('Photo captured.');
    await analyzeEmotion(frame);
  }, [analyzeEmotion, captureCurrentFrame, waitForVideoReady]);

  const handleFileUpload = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        const imageData = loadEvent.target?.result;
        if (!imageData) return;
        setUploadedImage(imageData);
        setStatusMessage(`Loaded ${file.name}`);
        await analyzeEmotion(imageData);
      };
      reader.readAsDataURL(file);
    },
    [analyzeEmotion]
  );

  const handleModeChange = useCallback(
    (nextMode) => {
      setMode(nextMode);
      setIsDetecting(false);
      setCapturedImage(null);
      setUploadedImage(null);
      resetEmotionState();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [resetEmotionState]
  );

  const dominantMeta = EMOTION_META[dominantEmotion] || { emoji: currentEmotion, label: dominantEmotion, accent: '#1db954' };

  const rankedEmotions = useMemo(
    () => Object.entries(emotions).sort((a, b) => b[1] - a[1]),
    [emotions]
  );

  const languageOptions = Object.entries(PLAYLISTS);
  const recommendedPlaylists = getPlaylistsForEmotion(dominantEmotion);
  const activePlaylist = recommendedPlaylists[playlistIndex] || null;

  return (
    <main className="generator">
      <div className="container">
        <section className="generator-hero">
          <div>
            <p className="eyebrow">Emotion to Music</p>
            <h1>Read the mood, tighten the camera flow, and play the right playlist instantly.</h1>
            <p className="hero-copy">
              Capture a live frame, upload an image, or take a photo. The app now waits for a real camera frame,
              avoids overlapping requests, and lets you switch playlist language before opening the Spotify player.
            </p>
          </div>
          <div className="hero-chip-row">
            <span className="hero-chip">Better capture stability</span>
            <span className="hero-chip">Face-aware preprocessing</span>
            <span className="hero-chip">Spotify-style player</span>
          </div>
        </section>

        <div className="mode-selector">
          <button className={`mode-btn ${mode === 'live' ? 'active' : ''}`} onClick={() => handleModeChange('live')}>
            Live Detection
          </button>
          <button className={`mode-btn ${mode === 'capture' ? 'active' : ''}`} onClick={() => handleModeChange('capture')}>
            Capture Photo
          </button>
          <button className={`mode-btn ${mode === 'upload' ? 'active' : ''}`} onClick={() => handleModeChange('upload')}>
            Upload File
          </button>
        </div>

        <div className="generator-wrapper">
          <section className="video-section panel-surface">
            <div className="panel-header-row">
              <div>
                <p className="section-kicker">Camera</p>
                <h2>{mode === 'upload' ? 'Image Input' : 'Frame Preview'}</h2>
              </div>
              <div className="signal-pill">{loading ? 'Analyzing' : 'Ready'}</div>
            </div>

            <div className="video-container">
              {mode === 'upload' ? (
                !uploadedImage ? (
                  <label className="upload-stage">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="file-input"
                    />
                    <span className="upload-icon">+</span>
                    <span className="upload-title">Drop or choose a photo</span>
                    <span className="upload-subtitle">Use a clear image with one face centered in frame.</span>
                  </label>
                ) : (
                  <img src={uploadedImage} alt="Uploaded preview" className="captured-image" />
                )
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`video-feed ${mode !== 'upload' ? 'active' : ''}`}
                  />
                  <div className="camera-hud">
                    <span className="hud-label">Align your face inside the frame</span>
                    <span className="hud-status">{mode === 'live' && isDetecting ? 'LIVE' : 'STANDBY'}</span>
                  </div>
                  {mode === 'capture' && capturedImage && (
                    <img src={capturedImage} alt="Captured preview" className="captured-image capture-overlay" />
                  )}
                </>
              )}
            </div>

            <div className="video-controls">
              {mode === 'live' && (
                <button className={`btn-control ${isDetecting ? 'stop' : 'start'}`} onClick={() => setIsDetecting((prev) => !prev)}>
                  {isDetecting ? 'Stop Live Scan' : 'Start Live Scan'}
                </button>
              )}

              {mode === 'capture' && (
                <>
                  <button className="btn-control start" onClick={capturePhoto} disabled={loading}>
                    {loading ? 'Analyzing...' : 'Capture Photo'}
                  </button>
                  <button
                    className="btn-control ghost"
                    onClick={async () => {
                      setCapturedImage(null);
                      resetEmotionState();
                      await startCamera();
                    }}
                  >
                    Retake
                  </button>
                </>
              )}

              {mode === 'upload' && uploadedImage && (
                <button
                  className="btn-control ghost"
                  onClick={() => {
                    setUploadedImage(null);
                    resetEmotionState();
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Upload Another
                </button>
              )}
            </div>

            <div className="status-strip">
              <span>{statusMessage}</span>
              <span>{inferenceMs ? `Inference ${Math.round(inferenceMs)} ms` : 'Inference --'}</span>
            </div>
          </section>

          <section className="results-section">
            <div className="current-emotion-card panel-surface">
              <div className="panel-header-row">
                <div>
                  <p className="section-kicker">Detected Mood</p>
                  <h2>Result</h2>
                </div>
                <div className="score-pill" style={{ '--accent': dominantMeta.accent }}>
                  {confidence.toFixed(1)}%
                </div>
              </div>

              {loading ? (
                <div className="loading-spinner">Analyzing your frame...</div>
              ) : noFaceDetected && confidence === 0 ? (
                <div className="emotion-display no-face">
                  <span className="emotion-emoji">!</span>
                  <div className="emotion-info">
                    <p className="emotion-name">No clear face found</p>
                    <p className="emotion-confidence">Try brighter light and keep your face centered.</p>
                  </div>
                </div>
              ) : (
                <div className="emotion-display">
                  <div className="emotion-display-content">
                    <span className="emotion-emoji">{currentEmotion}</span>
                    <div className="emotion-info">
                      <p className="emotion-name">{dominantMeta.label}</p>
                      <p className="emotion-confidence">
                        {noFaceDetected
                          ? 'Prediction made without a confident face crop.'
                          : `${confidence.toFixed(1)}% confidence`}
                      </p>
                    </div>
                  </div>
                  {facePatch && (
                    <div className="face-patch-container">
                      <img 
                        src={`data:image/png;base64,${facePatch}`} 
                        alt="Detected face" 
                        className="face-patch"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="emotions-live panel-surface">
              <div className="panel-header-row">
                <div>
                  <p className="section-kicker">Confidence Spread</p>
                  <h3>Emotion Scores</h3>
                </div>
              </div>
              <div className="live-bars">
                {rankedEmotions.map(([emotion, value]) => (
                  <div key={emotion} className="live-bar">
                    <span className="bar-name">{EMOTION_META[emotion]?.label || emotion}</span>
                    <div className="bar-track">
                      <div
                        className="bar-value"
                        style={{
                          width: `${value}%`,
                          background: `linear-gradient(90deg, ${EMOTION_META[emotion]?.accent || '#6366f1'}, #1db954)`,
                        }}
                      />
                    </div>
                    <span className="bar-number">{value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="music-section panel-surface">
          <div className="music-topbar">
            <div>
              <p className="section-kicker">Spotify Match</p>
              <h2>Playlist by mood and language</h2>
            </div>
            <div className="language-picker">
              {languageOptions.map(([key, value]) => (
                <button
                  key={key}
                  className={`language-btn ${selectedLanguage === key ? 'active' : ''}`}
                  onClick={() => setSelectedLanguage(key)}
                >
                  {value.label}
                </button>
              ))}
            </div>
          </div>

          {activePlaylist ? (
            <div className="spotify-shell">
              <div className="spotify-cover-column">
                <img src={activePlaylist.cover} alt={activePlaylist.name} className="playlist-cover" />
                <div className="playlist-glow" style={{ '--accent': dominantMeta.accent }} />
              </div>

              <div className="spotify-main">
                <p className="spotify-overline">Recommended for {dominantMeta.label.toLowerCase()} mood</p>
                <h3>{activePlaylist.name}</h3>
                <p className="spotify-artist">{activePlaylist.artist}</p>
                <p className="playlist-description">{activePlaylist.description}</p>

                <div className="spotify-actions">
                  <button
                    className="play-button"
                    onClick={() => {
                      setIsPlayerOpen(true);
                      openPlaylistExternally(activePlaylist);
                    }}
                  >
                    Play in Spotify
                  </button>
                  <button className="secondary-button" onClick={() => setIsPlayerOpen(true)}>
                    Preview here
                  </button>
                </div>

                <p className="player-hint">
                  The main play button opens the playlist directly, which is more reliable for Spotify playback.
                  The embedded player below is for quick in-page preview.
                </p>

                <div className="mini-track-row">
                  <span className="mini-track-label">Language</span>
                  <span className="mini-track-value">{PLAYLISTS[selectedLanguage].label}</span>
                  <span className="mini-track-label">Mood</span>
                  <span className="mini-track-value">{dominantMeta.label}</span>
                  <span className="mini-track-label">Pick</span>
                  <span className="mini-track-value">{playlistIndex + 1} of {recommendedPlaylists.length}</span>
                </div>

                {recommendedPlaylists.length > 1 && (
                  <div className="playlist-switcher">
                    {recommendedPlaylists.map((playlist, index) => (
                      <button
                        key={`${playlist.name}-${index}`}
                        className={`playlist-option ${playlistIndex === index ? 'active' : ''}`}
                        onClick={() => {
                          setPlaylistIndex(index);
                          setIsPlayerOpen(false);
                        }}
                      >
                        <span className="playlist-option-title">{playlist.name}</span>
                        <span className="playlist-option-sub">{playlist.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="music-empty">
              Run a detection first to unlock the playlist recommendation.
            </div>
          )}

          {activePlaylist && isPlayerOpen && (
            <div className="player-frame">
              <iframe
                src={activePlaylist.embed}
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title={`Spotify playlist: ${activePlaylist.name}`}
              />
            </div>
          )}
        </section>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </main>
  );
}

export default Generator;
