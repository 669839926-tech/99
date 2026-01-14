
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, Position, Team, PlayerStats, AttributeConfig, AttributeCategory, TrainingSession, PlayerReview, User, ApprovalStatus, PlayerPhoto, AttendanceRecord } from '../types';
import { Search, Plus, Shield, ChevronRight, X, Save, Trash2, Edit2, Activity, Brain, Dumbbell, Target, CheckSquare, ArrowRightLeft, Upload, User as UserIcon, Calendar as CalendarIcon, CreditCard, Cake, MoreHorizontal, Star, Crown, ChevronDown, FileText, Loader2, Sparkles, Download, Clock, AlertTriangle, History, Filter, CheckCircle, Send, Globe, AlertCircle, ClipboardCheck, XCircle, FileSpreadsheet, Cloud, RefreshCw, ChevronLeft, Phone, School, CalendarDays, FileDown, LayoutGrid, LayoutList, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Ruler, Weight, Files } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { generatePlayerReview } from '../services/geminiService';
import { exportToPDF } from '../services/pdfService';

// --- Shared Helper Functions ---

const POSITION_ORDER: Record<Position, number> = {
  [Position.GK_ATT]: 10,
  [Position.GK_DEF]: 11,
  [Position.CB]: 20,
  [Position.LB]: 21,
  [Position.RB]: 22,
  [Position.LWB]: 23,
  [Position.RWB]: 24,
  [Position.CDM]: 30,
  [Position.CM]: 31,
  [Position.CAM]: 32,
  [Position.F9]: 40,
  [Position.ST]: 41,
  [Position.LW]: 42,
  [Position.RW]: 43,
  [Position.TBD]: 99
};

const calculateTenure = (dateStr?: string) => {
    if (!dateStr) return null;
    const start = new Date(dateStr);
    const now = new Date();
    if (isNaN(start.getTime())) return null;
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years < 0) return '刚刚入队';
    if (years === 0 && months === 0) return '不满1个月';
    let result = '';
    if (years > 0) result += `${years}年`;
    if (months > 0) result += `${months}个月`;
    return result;
};

const getOverallRating = (player: Player): string => {
  const sourceStats = player.lastPublishedStats || player.stats;
  let total = 0;
  let count = 0;
  (['technical', 'tactical', 'physical', 'mental'] as AttributeCategory[]).forEach(cat => {
    if (sourceStats[cat]) {
      Object.values(sourceStats[cat]).forEach(val => { total += val; count++; });
    }
  });
  return count === 0 ? '0.0' : (total / count).toFixed(1);
};

const getCategoryAvg = (player: Player, category: AttributeCategory, attributeConfig: AttributeConfig) => {
  const configItems = attributeConfig[category];
  if (!configItems || configItems.length === 0) return 0;
  let sum = 0;
  let count = 0;
  configItems.forEach(attr => {
    const val = player.stats[category][attr.key] || 0;
    sum += val;
    count++;
  });
  return count === 0 ? 0 : parseFloat((sum / count).toFixed(1));
};

const getCategoryRadarData = (player: Player, category: AttributeCategory, attributeConfig: AttributeConfig) => {
  return attributeConfig[category].map(attr => ({
    subject: attr.label,
    value: player.stats[category][attr.key] || 0,
    fullMark: 10
  }));
};

const calculateAttendanceRate = (player: Player, trainings: TrainingSession[], scope: 'month' | 'quarter' | 'year') => {
    if (!trainings || trainings.length === 0) return 0;
    const now = new Date();
    let startDate = new Date();
    if (scope === 'month') { startDate.setMonth(now.getMonth() - 1); } 
    else if (scope === 'quarter') { startDate.setMonth(now.getMonth() - 3); } 
    else { startDate.setFullYear(now.getFullYear() - 1); }
    const validSessions = trainings.filter(t => {
        const tDate = new Date(t.date);
        return t.teamId === player.teamId && tDate >= startDate && tDate <= now;
    });
    if (validSessions.length === 0) return 0;
    const presentCount = validSessions.filter(t => t.attendance?.some(r => r.playerId === player.id && r.status === 'Present')).length;
    return Math.round((presentCount / validSessions.length) * 100);
};

const getBirthdayStatus = (dateStr: string) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  let nextBirthday = new Date(today.getFullYear(), m - 1, d);
  if (nextBirthday < today) { nextBirthday.setFullYear(today.getFullYear() + 1); }
  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: '今天生日', color: 'bg-pink-500' };
  if (diffDays <= 7) return { label: `${diffDays}天后生日`, color: 'bg-blue-500' };
  return null;
};

const isExpired = (dateStr?: string) => {
    if (!dateStr) return true;
    return new Date(dateStr) < new Date();
};

const getPosColor = (pos: Position) => {
    const p = pos.toString();
    if (p.includes('锋') || p.includes('9')) return 'bg-red-600 text-white border-red-600';
    if (p.includes('中场')) return 'bg-green-600 text-white border-green-600';
    if (p.includes('卫') || p.includes('翼卫')) return 'bg-blue-600 text-white border-blue-600';
    if (p.includes('守门员')) return 'bg-yellow-50 text-white border-yellow-500';
    return 'bg-gray-500 text-white border-gray-500';
};

const getPosColorLight = (pos: Position) => {
    const p = pos.toString();
    if (p.includes('锋') || p.includes('9')) return 'bg-red-50 text-red-700 border-red-200';
    if (p.includes('中场')) return 'bg-green-50 text-green-700 border-green-200';
    if (p.includes('卫') || p.includes('翼卫')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (p.includes('守门员')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-gray-50 text-gray-700 border-gray-2