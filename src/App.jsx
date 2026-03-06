import React, { useState, useEffect, useRef } from 'react';
import Dexie from 'dexie'; 
import { 
  Crosshair, MapPin, FileText, AlertTriangle, Download, Trash2, Plus, Save, 
  ArrowLeft, Navigation, Users, Eye, Box, PenTool, Image as ImageIcon, 
  Eraser, Edit2, Calendar, Database, Upload, Cloud, Radio, FileCheck, Wind, 
  Thermometer, Eye as VisibilityIcon, Activity, Search, Printer, Globe, Undo2, List
} from 'lucide-react';

/**
 * --- DATABASE SETUP (DEXIE) ---
 */
class DroneLogDatabase extends Dexie {
  constructor() {
    super('DFO_Drone_Log_DB');
    this.version(1).stores({
      missions: 'id, created, start', 
      settings: 'key' 
    });
  }
}

const db = new DroneLogDatabase();

/**
 * --- UTILITIES ---
 */

const generateId = () => Math.random().toString(36).substr(2, 9);

// 24H Time Formatter
const formatDateTime24h = (isoString) => {
  if (!isoString) return '---';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// Helper to add minutes
const addMinutes = (dateString, minutes) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  date.setMinutes(date.getMinutes() + minutes);
  const offset = date.getTimezoneOffset() * 60000;
  return (new Date(date - offset)).toISOString().slice(0, 16);
};

// Helper to get current local time
const getCurrentLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return (new Date(now - offset)).toISOString().slice(0, 16);
};

const getCoordinates = (callback) => {
  if (!("geolocation" in navigator)) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  const success = (position) => {
    callback({
      lat: position.coords.latitude.toFixed(6),
      lng: position.coords.longitude.toFixed(6)
    });
  };
  const error = (err) => alert(`GPS Error: ${err.message}`);
  navigator.geolocation.getCurrentPosition(success, error, {
    enableHighAccuracy: true, timeout: 10000, maximumAge: Infinity
  });
};

// Calculate distance between two coordinates in km
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

// --- CSV EXPORT FUNCTION (Images Removed) ---
const exportToCSV = (missions) => {
  if (!missions || missions.length === 0) {
    alert("No missions to export.");
    return;
  }

  try {
    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '';
      const stringValue = String(str);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const formatRisks = (risks) => {
      if (!risks) return "None";
      const entries = Object.entries(risks);
      if (entries.length === 0) return "None";
      
      return entries
        .filter(([_, val]) => val && val.checked)
        .map(([key, val]) => {
          const level = val.level || '-';
          const mit = val.mitigation ? ` (Mitigation: ${val.mitigation})` : '';
          return `${key} [${level}]${mit}`;
        })
        .join(" | ");
    };

    const headers = [
      "Mission ID", "Start Time", "End Time", "Location", "Lat", "Lng", 
      "Secondary Lat", "Secondary Lng", "Ref GPS Unit",
      "Pilot In Command", "Additional Pilots", "Camera Operators", "Observers", "RPAS Model/Reg", "Payload", "Op Category", "Mission Type", "Work Elements",
      "Flights", "Distance (km)", "Airspace Class", "Airspace Type", "Aerodromes within 100km", "NOTAMS", "NavCan Ref",
      "Temp (C)", "Wind Speed (km/h)", "Wind Dir", "Visibility (km)", "Weather Notes",
      "Approach Alt", "Approach Route", "Emergency Site",
      "Preflight Completed", "Preflight Issues",
      "Outcomes/Summary", "Incidents/Maintenance",
      "Description", "Risk Summary"
    ];

    const sortedMissions = [...missions].sort((a, b) => new Date(b.start) - new Date(a.start));

    const rows = sortedMissions.map(m => {
      // Fallback to legacy fields if the new field is missing (protects old data)
      const aeroOut = m.aerodromesWithin100km ? m.aerodromesWithin100km : (Array.isArray(m.aerodromes) ? m.aerodromes.join('; ') : (m.aerodromes || ''));
      const workElemStr = Array.isArray(m.workElements) ? m.workElements.join('; ') : (m.workElements || m.workElement || '');
      const addPilotsStr = Array.isArray(m.additionalPilots) ? m.additionalPilots.join('; ') : '';
      const camOpsStr = Array.isArray(m.cameraOperators) ? m.cameraOperators.join('; ') : '';
      const observersStr = Array.isArray(m.observers) ? m.observers.join('; ') : (m.observer || '');
      const rpasStr = Array.isArray(m.rpas) ? m.rpas.join('; ') : (m.rpas || '');
      const payloadStr = Array.isArray(m.payload) ? m.payload.join('; ') : (m.payload || '');

      return [
        m.id,
        formatDateTime24h(m.start),
        formatDateTime24h(m.end),
        m.location,
        m.coords?.lat,
        m.coords?.lng,
        m.secondaryLat,
        m.secondaryLng,
        m.referenceGpsUnit,
        m.pilot,
        addPilotsStr,
        camOpsStr,
        observersStr,
        rpasStr,
        payloadStr,
        m.opCategory,
        m.type,
        workElemStr,
        m.flightCount || 1,
        m.distance,
        m.airspace,
        m.airspaceType,
        aeroOut,
        m.notams,
        m.navCanRef,
        m.temperature,
        m.windSpeed,
        m.windDir,
        m.visibility,
        m.weatherText,
        m.approachAlt,
        m.approachRoute,
        m.emergencySite,
        m.preflightCompleted ? 'Yes' : 'No',
        m.preflightIssues,
        m.outcomesSummary,
        m.incidentsMaintenance,
        m.description,
        formatRisks(m.risks)
      ].map(escapeCSV).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dfo_mission_log_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (err) {
    console.error("Export Error:", err);
    alert("Failed to generate CSV. Check console for details.\nError: " + err.message);
  }
};

// --- FULL HTML REPORT EXPORT ---
const exportToHTML = (missions) => {
  if (!missions || missions.length === 0) {
    alert("No missions to export.");
    return;
  }

  const sortedMissions = [...missions].sort((a, b) => new Date(b.start) - new Date(a.start));

  let html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>DFO Full Mission Report</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f1f5f9; color: #333; padding: 20px; }
      .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; }
      .header { border-bottom: 3px solid #064e3b; padding-bottom: 10px; margin-bottom: 30px; }
      h1 { color: #064e3b; margin: 0; }
      .mission-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 40px; background-color: #f8fafc; page-break-inside: avoid; }
      .mission-title { font-size: 1.25rem; font-weight: bold; color: #0f172a; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 0.9rem; }
      th, td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
      th { background-color: #e2e8f0; width: 30%; color: #334155; }
      td { background-color: #fff; }
      .image-grid { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px; }
      .img-box { border: 1px solid #e2e8f0; padding: 10px; background: #fff; text-align: center; border-radius: 4px; flex: 1; min-width: 250px; }
      .img-box h4 { margin-top: 0; margin-bottom: 10px; font-size: 0.85rem; color: #64748b; text-transform: uppercase; }
      .img-box img { max-width: 100%; max-height: 350px; border-radius: 4px; border: 1px solid #cbd5e1; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>DFO RPAS Flight Log - Full Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      </div>
  `;

  sortedMissions.forEach(m => {
    const risks = m.risks ? Object.entries(m.risks).filter(([_, v]) => v.checked).map(([k, v]) => `${k} (${v.level || 'Unrated'} - Mitigation: ${v.mitigation || 'None'})`).join('<br/>') : 'None';
    const aeroOut = m.aerodromesWithin100km ? m.aerodromesWithin100km.replace(/\n/g, '<br/>') : (Array.isArray(m.aerodromes) ? m.aerodromes.join(', ') : (m.aerodromes || 'None'));
    const workElemStr = Array.isArray(m.workElements) ? m.workElements.join(', ') : (m.workElements || m.workElement || 'N/A');
    const addPilotsStr = Array.isArray(m.additionalPilots) ? m.additionalPilots.join(', ') : 'None';
    const camOpsStr = Array.isArray(m.cameraOperators) ? m.cameraOperators.join(', ') : 'None';
    const observersStr = Array.isArray(m.observers) ? m.observers.join(', ') : (m.observer || 'None');
    const rpasStr = Array.isArray(m.rpas) ? m.rpas.join(', ') : (m.rpas || 'N/A');
    const payloadStr = Array.isArray(m.payload) ? m.payload.join(', ') : (m.payload || 'N/A');
    
    html += `
      <div class="mission-card">
        <h2 class="mission-title">${m.location || 'Unknown Location'} - ${formatDateTime24h(m.start)}</h2>
        <table>
          <tbody>
            <tr><th>Mission ID</th><td>${m.id || 'N/A'}</td></tr>
            <tr><th>Date & Time</th><td>Start: ${formatDateTime24h(m.start)}<br/>End: ${formatDateTime24h(m.end)}</td></tr>
            <tr><th>Primary GPS</th><td>Lat: ${m.coords?.lat || '-'}, Lng: ${m.coords?.lng || '-'}</td></tr>
            <tr><th>Secondary GPS</th><td>Lat: ${m.secondaryLat || '-'}, Lng: ${m.secondaryLng || '-'} (Ref Unit: ${m.referenceGpsUnit || 'N/A'})</td></tr>
            <tr><th>Pilot In Command</th><td>${m.pilot || 'N/A'}</td></tr>
            <tr><th>Additional Pilots</th><td>${addPilotsStr}</td></tr>
            <tr><th>Camera Operators</th><td>${camOpsStr}</td></tr>
            <tr><th>Observers</th><td>${observersStr}</td></tr>
            <tr><th>RPAS / Payload</th><td>${rpasStr} / ${payloadStr}</td></tr>
            <tr><th>Op Category / Mission Type</th><td>${m.opCategory || 'N/A'} / ${m.type || 'N/A'}</td></tr>
            <tr><th>Work Elements</th><td>${workElemStr}</td></tr>
            <tr><th>Flights / Distance</th><td>${m.flightCount || 1} flight(s) / ${m.distance || 'N/A'} km</td></tr>
            <tr><th>Airspace</th><td>${m.airspace || 'N/A'} (${m.airspaceType || 'N/A'})</td></tr>
            <tr><th>Aerodromes within 100km</th><td>${aeroOut}</td></tr>
            <tr><th>NOTAMS / NavCan Ref</th><td>${m.notams || 'None'} / ${m.navCanRef || 'N/A'}</td></tr>
            <tr><th>Approach / Emergency Site</th><td>Alt: ${m.approachAlt || 'N/A'}, Route: ${m.approachRoute || 'N/A'} / Site: ${m.emergencySite || 'None'}</td></tr>
            <tr><th>Weather Conditions</th><td>Temp: ${m.temperature || '-'}°C, Wind: ${m.windSpeed || '-'}km/h ${m.windDir || ''}, Vis: ${m.visibility || '-'}</td></tr>
            <tr><th>Weather Notes</th><td>${m.weatherText || 'None'}</td></tr>
            <tr><th>Preflight Checklist</th><td>Completed: ${m.preflightCompleted ? 'Yes' : 'No'}<br/>Issues: ${m.preflightIssues || 'None'}</td></tr>
            <tr><th>Mission Objectives</th><td>${m.description || 'None'}</td></tr>
            <tr><th>Outcomes / Summary</th><td>${m.outcomesSummary || 'None'}</td></tr>
            <tr><th>Incidents / Maintenance</th><td>${m.incidentsMaintenance || 'None'}</td></tr>
            <tr><th>Risk Assessment</th><td>${risks || 'None'}</td></tr>
          </tbody>
        </table>
        
        <div class="image-grid">
          ${m.sketch ? `<div class="img-box"><h4>Map Sketch</h4><img src="${m.sketch}" alt="Map Sketch" /></div>` : ''}
          ${m.weatherImage ? `<div class="img-box"><h4>Weather Screenshot</h4><img src="${m.weatherImage}" alt="Weather Screenshot" /></div>` : ''}
          ${m.navCanFile ? `<div class="img-box"><h4>Nav Canada Auth</h4><img src="${m.navCanFile}" alt="Nav Canada Auth" /></div>` : ''}
        </div>
      </div>
    `;
  });

  html += `
    </div>
  </body>
  </html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `dfo_full_report_${new Date().toISOString().slice(0,10)}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const backupData = async (missions, lists) => {
  const data = { missions, lists, version: 'v6-dexie', backupDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `dfo_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const DEFAULT_LISTS = {
  rpas: ['Mavic 2 Enterprise', 'Matrice 300', 'Mini 3 Pro'],
  pilots: ['Officer Smith', 'Officer Jones'],
  additionalPilots: [],
  cameraOperators: [],
  payload: ['Visual', 'Thermal', 'LiDAR'],
  opCategories: ['Microdrone', 'Basic', 'Advanced', 'Level 1 Complex', 'SFOC'],
  observers: ['None'],
  types: ['Training', 'Enforcement', 'Search & Rescue', 'Habitat Survey'],
  workElements: ['Striped Bass', 'Salmon', 'Lobster', 'Snow Crab', 'Ice Fishing', 'Habitat', 'Groundfish', 'Trout'],
  locations: [],
  airspaces: ['Class G', 'Class F', 'Class C', 'Class D', 'Class E'],
  aerodromes: [
    'Fredericton Int\'l (CYFC) - 119.5 - [45.8688, -66.5372]',
    'Moncton / Roméo LeBlanc Int\'l (CYQM) - 120.8 - [46.1122, -64.6786]',
    'Saint John (CYSJ) - 118.5 - [45.3161, -65.8902]',
    'Bathurst (CYBF) - 122.3 - [47.6297, -65.7388]',
    'Miramichi (CYCH) - 122.8 - [46.9736, -65.4491]',
    'Charlo (CYCL) - 122.8 - [47.9905, -66.3302]',
    'Grand Manan (CYGK) - 122.8 - [44.7108, -66.7944]',
    'St. Stephen (CYSQ) - 122.8 - [45.2058, -67.2497]',
    'Sussex (CCY3) - 122.8 - [45.6936, -65.5455]',
    'Woodstock (CCQ3) - 122.8 - [46.1488, -67.5458]',
    'Edmundston (CCY5) - 122.8 - [47.4575, -68.3241]',
    'Florenceville (CCZ3) - 122.8 - [46.4252, -67.6258]',
    'Bouctouche (CDA5) - 122.8 - [46.4380, -64.6975]',
    'Havelock (CCS5) - 122.8 - [45.9861, -65.3166]',
    'Brockway (CCX3) - 122.8 - [45.5700, -67.0983]',
    'Weyman (CCG3) - 122.8 - [46.0469, -66.8530]',
    'Saint John Reg Hospital Heliport (CSN6) - 122.8 - [45.3061, -66.0847]',
    'Moncton Hospital Heliport (CHC9) - 122.8 - [46.1044, -64.7950]',
    'Shediac Bridge (CSB5) - 122.8 - [46.2411, -64.5555]',
    'Halifax Stanfield Int\'l (CYHZ) - 118.7 - [44.8808, -63.5086]',
    'Sydney / J.A. Douglas McCurdy (CYQY) - 118.7 - [46.1613, -60.0477]',
    'Yarmouth (CYQI) - 122.3 - [43.8272, -66.0019]',
    'Greenwood (CYZX) - 119.5 - [44.9844, -64.9169]',
    'Shearwater Heliport (CYAW) - 118.1 - [44.6397, -63.4994]',
    'Debert (CCQ3) - 122.8 - [45.4180, -63.4608]',
    'Digby (CYID) - 122.8 - [44.5383, -65.7888]',
    'Port Hawkesbury (CYPD) - 122.8 - [45.6200, -61.3663]',
    'Trenton (CYTN) - 122.8 - [45.6111, -62.6225]',
    'Waterville / Kings County (CCW3) - 122.8 - [45.0538, -64.8016]',
    'Fox Harbour (CFH4) - 122.8 - [45.8683, -63.4625]',
    'Margaree (CCZ4) - 122.8 - [46.3392, -60.9805]',
    'Thorburn (CCZ5) - 122.8 - [45.5666, -62.5983]',
    'South Noel Road (CSN5) - 122.8 - [45.2411, -63.7547]',
    'Finlay (CFI4) - 122.8 - [45.8450, -63.6394]',
    'Halifax (QE II Hosp) Heliport (CHQE) - 122.8 - [44.6444, -63.5855]',
    'Halifax (IWK) Heliport (CHI2) - 122.8 - [44.6397, -63.5841]',
    'Kentville (Camp Aldershot) Heliport (CKV4) - 122.8 - [45.0938, -64.5097]',
    'Charlottetown (CYYG) - 118.0 - [46.2897, -63.1211]',
    'Summerside (CYSU) - 122.3 - [46.4427, -63.8344]',
    'Cable Head (CCA3) - 122.8 - [46.4527, -62.5694]',
    'Charlottetown (Queen Elizabeth Hosp) Heliport (CDV3) - 122.8 - [46.2461, -63.1097]',
    'Summerside (Prince County Hosp) Heliport (CCH6) - 122.8 - [46.4116, -63.7844]',
    'St. John\'s Int\'l (CYYT) - 120.6 - [47.6186, -52.7519]',
    'Gander Int\'l (CYQX) - 118.1 - [48.9369, -54.5680]',
    'Deer Lake (CYDF) - 122.3 - [49.2108, -57.3913]',
    'Stephenville (CYJT) - 122.8 - [48.5441, -58.5499]',
    'Wabush (CYWK) - 122.1 - [52.9219, -66.8644]',
    'Goose Bay (CYYR) - 119.4 - [53.3191, -60.4258]',
    'St. Anthony (CYAY) - 122.8 - [51.3919, -56.0830]',
    'Churchill Falls (CZUM) - 122.8 - [53.5622, -64.0152]',
    'Nain (CYDP) - 122.8 - [56.5466, -61.6811]',
    'Hopedale (CYHO) - 122.8 - [55.4483, -60.2286]',
    'Makkovik (CYFT) - 122.8 - [55.0763, -59.1866]',
    'Cartwright (CYCA) - 122.8 - [53.6827, -57.0422]',
    'Mary\'s Harbour (CYMH) - 122.8 - [52.3025, -55.8483]',
    'Natuashish (CNH2) - 122.8 - [55.9133, -60.8294]',
    'Postville (CCD4) - 122.8 - [54.9103, -59.7850]',
    'Port Hope Simpson (CCX4) - 122.8 - [52.5275, -56.2881]',
    'Rigolet (CCZ2) - 122.8 - [54.3275, -58.4578]',
    'Black Tickle (CCE4) - 122.8 - [53.4681, -53.5822]',
    'Charlottetown (NL) (CCH4) - 122.8 - [52.7661, -56.1158]',
    'Fogo (CDY3) - 122.8 - [49.6952, -54.2394]',
    'Winterland (CCC2) - 122.8 - [47.1352, -55.3283]',
    'Springdale (CCD2) - 122.8 - [49.4838, -56.1802]',
    'St. John\'s (Health Sciences Centre) Heliport (CCK2) - 122.8 - [47.5738, -52.7441]',
    'Clarenville (CCV3) - 122.8 - [48.1750, -53.9261]'
  ],
  airspaceTypes: ['Uncontrolled', 'Controlled', 'Restricted'],
  referenceGpsUnits: [],
  approachAlts: [],
  emergencySites: [],
  descriptions: [],
  preflightIssuesList: [],
  riskDescriptions: [],
  riskMitigations: []
};

const RISK_ITEMS = [
  'Presence of people', 'Proximity to built-up area', 'Proximity to obstacles',
  'Proximity to protected birds or animals', 'Proximity to air traffic',
  'Operation in control zones', 'Airspace restriction (F zone)', 'Risk of radio interference',
  'Proximity to magnetic fields', 'Environment with sand or dust in suspension',
  'Proximity to glass buildings', 'Strong wind condition', 'Very cold weather',
  'Heat wave condition (heat stress)', 'Municipal restriction', 'Risk of intrusion into privacy',
  'Proximity of pyrotechnic', 'Drone not contrasted with the horizon', 'Any other risk'
];

/**
 * --- COMPONENTS ---
 */

// -- NEW SAVED LISTS MANAGER VIEW --
const SavedListsView = ({ lists, onUpdateBulkLists, onBack }) => {
  const [selectedList, setSelectedList] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');

  const LIST_NAMES = {
    locations: "Locations / Site Names",
    pilots: "Pilots In Command",
    additionalPilots: "Additional Pilots",
    cameraOperators: "Camera Operators",
    observers: "Observers",
    rpas: "RPAS Models & Reg",
    payload: "Payloads",
    opCategories: "Operation Categories",
    types: "Mission Types",
    workElements: "Work Elements",
    airspaces: "Airspace Classes",
    airspaceTypes: "Airspace Types",
    aerodromes: "Aerodromes (100km Calc)",
    referenceGpsUnits: "Reference GPS Units",
    approachAlts: "Approach Altitudes",
    emergencySites: "Emergency Landing Sites",
    descriptions: "Descriptions / Objectives",
    preflightIssuesList: "Pre-Flight Issues / Incidents",
    riskDescriptions: "Risk Descriptions",
    riskMitigations: "Risk Mitigations"
  };

  if (selectedList === null) {
     return (
       <div className="flex flex-col h-screen max-w-3xl mx-auto bg-slate-100">
         <div className="bg-emerald-900 text-white p-4 sticky top-0 z-10 flex items-center shadow-md gap-3">
           <button onClick={onBack} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><ArrowLeft className="h-6 w-6" /></button>
           <h2 className="text-lg font-bold tracking-wide">SAVED LISTS MANAGER</h2>
         </div>
         <div className="flex-1 overflow-y-auto p-4 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-3">
           {Object.entries(LIST_NAMES).map(([key, label]) => (
             <button key={key} onClick={() => setSelectedList(key)} className="bg-white p-4 rounded-md shadow-sm border border-slate-200 text-left hover:bg-emerald-50 transition-colors flex justify-between items-center group">
               <span className="font-bold text-slate-700 group-hover:text-emerald-800">{label}</span>
               <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-700">{(lists[key] || []).length}</span>
             </button>
           ))}
         </div>
       </div>
     )
  }

  const currentItems = lists[selectedList] || [];

  return (
     <div className="flex flex-col h-screen max-w-3xl mx-auto bg-slate-100">
         <div className="bg-emerald-900 text-white p-4 sticky top-0 z-10 flex items-center shadow-md gap-3">
           <button onClick={() => setSelectedList(null)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><ArrowLeft className="h-6 w-6" /></button>
           <h2 className="text-lg font-bold tracking-wide uppercase truncate">{LIST_NAMES[selectedList]}</h2>
         </div>
         <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-3">
            {currentItems.length === 0 && <p className="text-center text-slate-500 italic mt-10">This list is currently empty.</p>}
            {currentItems.map((item, idx) => (
               <div key={idx} className="bg-white p-3 rounded-md shadow-sm border border-slate-200 flex items-start justify-between gap-3">
                  {editingIndex === idx ? (
                     <div className="flex-1 flex gap-2">
                       <textarea className="flex-1 p-2 border border-emerald-500 rounded text-sm w-full outline-none" rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} />
                       <div className="flex flex-col gap-2 shrink-0">
                         <button onClick={() => {
                            const newLists = {...lists};
                            newLists[selectedList][idx] = editValue;
                            onUpdateBulkLists(newLists);
                            setEditingIndex(null);
                         }} className="bg-emerald-600 text-white px-3 py-2 rounded text-xs font-bold">SAVE</button>
                         <button onClick={() => setEditingIndex(null)} className="bg-slate-200 text-slate-700 px-3 py-2 rounded text-xs font-bold">CANCEL</button>
                       </div>
                     </div>
                  ) : (
                     <>
                       <span className="text-sm text-slate-800 flex-1 break-words whitespace-pre-wrap leading-relaxed">{item}</span>
                       <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditingIndex(idx); setEditValue(item); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => {
                             if(confirm('Delete this item?')) {
                                const newLists = {...lists};
                                newLists[selectedList].splice(idx, 1);
                                onUpdateBulkLists(newLists);
                             }
                          }} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded"><Trash2 className="h-4 w-4" /></button>
                       </div>
                     </>
                  )}
               </div>
            ))}
         </div>
         <div className="fixed bottom-0 left-0 right-0 bg-slate-200 border-t border-slate-300 z-20" style={{ padding: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <div className="max-w-3xl mx-auto flex gap-2">
               <textarea className="flex-1 border border-slate-300 p-3 rounded-md text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" rows={2} placeholder="Add new item..." value={newValue} onChange={e => setNewValue(e.target.value)} />
               <button onClick={() => {
                  if(newValue.trim()==='') return;
                  const newLists = {...lists};
                  if(!newLists[selectedList]) newLists[selectedList] = [];
                  newLists[selectedList].push(newValue.trim());
                  onUpdateBulkLists(newLists);
                  setNewValue('');
               }} className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 rounded-md font-bold flex items-center justify-center transition-colors shadow-md"><Plus className="h-6 w-6" /></button>
            </div>
         </div>
     </div>
  );
};


const DynamicSelect = ({ label, icon: Icon, value, options, onChange, onDelete, multiple = false, className = "mb-4" }) => {
  const id = `list-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  const [inputValue, setInputValue] = useState('');
  
  if (multiple) {
     return (
        <div className={className}>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2">
            {Icon && <Icon className="h-3 w-3 text-emerald-700" />}
            {label}
          </label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
               {Array.isArray(value) && value.map(v => (
                 <span key={v} className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                   {v}
                   <button onClick={() => {
                      const newValue = value.filter(i => i !== v);
                      onChange(newValue);
                   }} className="hover:text-red-600" title="Remove tag"><Trash2 className="h-3 w-3" /></button>
                 </span>
               ))}
            </div>
            <div className="flex gap-2 relative">
               <input
                list={id}
                className="flex-1 min-w-0 p-3 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Type and press + to add..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    const val = inputValue.trim();
                    if (val) {
                       const current = Array.isArray(value) ? value : [];
                       if (!current.includes(val)) onChange([...current, val]);
                       setInputValue('');
                    }
                  }
                }}
              />
              <datalist id={id}>
                {options && options.map(opt => <option key={opt} value={opt} />)}
              </datalist>
              <button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-md flex items-center justify-center transition-colors shadow-sm"
                onClick={() => {
                  const val = inputValue.trim();
                  if (val) {
                     const current = Array.isArray(value) ? value : [];
                     if (!current.includes(val)) onChange([...current, val]);
                     setInputValue('');
                  }
                }}
                title="Add Entry"
              >
                <Plus className="h-5 w-5" />
              </button>
              {inputValue && options && options.includes(inputValue) && (
                <button 
                  onClick={() => {
                    if (confirm(`Remove "${inputValue}" from your saved options list?`)) {
                      onDelete(inputValue);
                      setInputValue('');
                    }
                  }}
                  className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 px-3 rounded-md border border-slate-300 shadow-sm"
                  type="button"
                  title="Delete from saved options"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
     )
  }

  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2">
        {Icon && <Icon className="h-3 w-3 text-emerald-700" />}
        {label}
      </label>
      <div className="flex gap-2 relative">
        <input
          list={id}
          className="flex-1 min-w-0 p-3 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Select or type..."
        />
        <datalist id={id}>
          {options && options.map(opt => <option key={opt} value={opt} />)}
        </datalist>
        {value && options && options.includes(value) && (
          <button 
            onClick={() => onDelete(value)}
            className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 px-3 rounded-md border border-slate-300"
            type="button"
            title="Delete from saved options"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT FOR MULTILINE RETAINED TEXT ---
const DynamicTextArea = ({ label, icon: Icon, value, options, onChange, onDelete }) => {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2">
        {Icon && <Icon className="h-3 w-3 text-emerald-700" />}
        {label}
      </label>
      <div className="space-y-2">
        {(options && options.length > 0) && (
          <div className="flex gap-2">
            <select 
              className="flex-1 min-w-0 p-2 border border-slate-300 rounded-md bg-slate-50 text-xs text-slate-700"
              onChange={(e) => {
                if (e.target.value) {
                  onChange(e.target.value);
                  e.target.value = ""; 
                }
              }}
            >
              <option value="">Insert a previously saved entry...</option>
              {options.map(opt => <option key={opt} value={opt}>{opt.substring(0, 60)}{opt.length > 60 ? '...' : ''}</option>)}
            </select>
            {value && options.includes(value) && (
              <button 
                onClick={() => onDelete(value)}
                className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 px-3 rounded-md border border-slate-300"
                type="button"
                title="Delete this exact entry from saved list"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <textarea
          className="w-full p-3 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type here..."
        />
      </div>
    </div>
  );
};

const SketchPad = ({ onSave, initialImage }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#dc2626'); 
  const [backgroundImage, setBackgroundImage] = useState(initialImage || null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 300; 
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      img.onload = () => {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        onSave(canvas.toDataURL());
      };
    }
  }, [backgroundImage]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev, canvas.toDataURL()]);
    }
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    saveState();
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      onSave(canvasRef.current.toDataURL());
    }
  };

  const undo = () => {
    if (history.length > 0) {
      const prevState = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (prevState) {
        const img = new Image();
        img.src = prevState;
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          onSave(canvas.toDataURL());
        };
      } else {
        onSave(null);
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setBackgroundImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setBackgroundImage(null);
    setHistory([]);
    onSave(null);
  };

  return (
    <div className="border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
      <div className="bg-slate-100 p-2 flex gap-2 items-center justify-between border-b border-slate-200 flex-wrap">
        <div className="flex gap-2">
          <label className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            LOAD MAP
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <button onClick={undo} type="button" className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1">
            <Undo2 className="h-3 w-3" /> UNDO
          </button>
          <button onClick={clearCanvas} type="button" className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:text-red-600 flex items-center gap-1">
            <Eraser className="h-3 w-3" /> CLEAR
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <div className={`w-5 h-5 rounded-full cursor-pointer border-2 ${color === '#dc2626' ? 'border-slate-800' : 'border-transparent'}`} style={{background: '#dc2626'}} onClick={() => setColor('#dc2626')} />
          <div className={`w-5 h-5 rounded-full cursor-pointer border-2 ${color === '#2563eb' ? 'border-slate-800' : 'border-transparent'}`} style={{background: '#2563eb'}} onClick={() => setColor('#2563eb')} />
          <div className={`w-5 h-5 rounded-full cursor-pointer border-2 ${color === '#000000' ? 'border-slate-800' : 'border-transparent'}`} style={{background: '#000000'}} onClick={() => setColor('#000000')} />
        </div>
      </div>
      <canvas 
        ref={canvasRef}
        className="w-full h-[300px] touch-none cursor-crosshair bg-white"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
    </div>
  );
};

const MissionForm = ({ onSave, onCancel, lists, onUpdateList, onUpdateBulkLists, initialData }) => {
  const [step, setStep] = useState(1);
  const [coords, setCoords] = useState(initialData?.coords || { lat: '', lng: '' });
  const scrollRef = useRef(null); 
  
  const [formData, setFormData] = useState(() => {
    if (initialData) return { 
      ...initialData,
      workElements: initialData.workElements || (initialData.workElement ? [initialData.workElement] : []),
      observers: initialData.observers || (initialData.observer ? [initialData.observer] : []),
      additionalPilots: initialData.additionalPilots || [],
      cameraOperators: initialData.cameraOperators || [],
      rpas: initialData.rpas ? (Array.isArray(initialData.rpas) ? initialData.rpas : [initialData.rpas]) : [],
      payload: initialData.payload ? (Array.isArray(initialData.payload) ? initialData.payload : [initialData.payload]) : [],
      aerodromesWithin100km: initialData.aerodromesWithin100km || ''
    };
    
    const nowStr = getCurrentLocalTime();
    return {
      start: nowStr,
      end: addMinutes(nowStr, 30),
      location: '', description: '', pilot: '', additionalPilots: [], cameraOperators: [], observers: [], rpas: [], 
      payload: [], opCategory: '', 
      type: '', workElements: [], flightCount: 1, 
      airspace: '', airspaceType: '', aerodromesWithin100km: '',
      distance: '', 
      notams: '', navCanRef: '', navCanFile: null,
      temperature: '', windSpeed: '', windDir: '', visibility: '',
      approachAlt: '', approachRoute: '', emergencySite: '',
      secondaryLat: '', secondaryLng: '', referenceGpsUnit: '',
      preflightCompleted: false, preflightIssues: '',
      outcomesSummary: '', incidentsMaintenance: '',
      sketch: null, weatherText: '', weatherImage: null, risks: {}
    };
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);

  const update = (k, v) => {
    setFormData(prev => {
      const newData = { ...prev, [k]: v };
      if (k === 'start' && v) newData.end = addMinutes(v, 30);
      return newData;
    });
  };
  
  const handleGPS = () => getCoordinates((c) => {
    setCoords(c);
    
    // Auto-calculate aerodromes
    let nearbyText = "";
    if (lists.aerodromes && Array.isArray(lists.aerodromes)) {
      const nearby = [];
      lists.aerodromes.forEach(aeroStr => {
         // Expects format: "Name (CODE) - Freq - [lat, lng]"
         const match = aeroStr.match(/^(.*?)\s*\((.*?)\)\s*-\s*(.*?)\s*-\s*\[(.*?),\s*(.*?)\]$/);
         if (match) {
            const [_, name, code, freq, latStr, lngStr] = match;
            const dist = getDistanceFromLatLonInKm(parseFloat(c.lat), parseFloat(c.lng), parseFloat(latStr), parseFloat(lngStr));
            if (dist <= 100) {
               nearby.push(`${name} (${code}) - ${freq} MHz - GPS: ${latStr}, ${lngStr} (${dist.toFixed(1)}km)`);
            }
         }
      });
      if (nearby.length > 0) {
         nearby.sort((a, b) => {
           const distA = parseFloat(a.match(/\(([\d\.]+)km\)$/)[1]);
           const distB = parseFloat(b.match(/\(([\d\.]+)km\)$/)[1]);
           return distA - distB;
         });
         nearbyText = nearby.join('\n');
      } else {
         nearbyText = "No aerodromes within 100km detected.";
      }
    }
    update('aerodromesWithin100km', nearbyText);
  });
  
  const handleCoordChange = (field, value) => setCoords(prev => ({ ...prev, [field]: value }));
  
  const handleRiskChange = (riskName, field, value) => {
    setFormData(prev => {
      const currentRisk = prev.risks[riskName] || { checked: false, level: '', desc: '', mitigation: '' };
      if (field === 'checked' && value === false) {
        const newRisks = { ...prev.risks };
        delete newRisks[riskName];
        return { ...prev, risks: newRisks };
      }
      return { ...prev, risks: { ...prev.risks, [riskName]: { ...currentRisk, [field]: value } } };
    });
  };

  const saveMission = () => {
    if (!formData.location || !formData.pilot) {
      alert("Please enter at least a Location and Pilot In Command.");
      return;
    }

    // Hazard Mitigation Validation
    const riskEntries = Object.entries(formData.risks || {});
    for (let i = 0; i < riskEntries.length; i++) {
      const [riskName, riskData] = riskEntries[i];
      if (riskData.checked && (riskData.level === 'Medium' || riskData.level === 'High')) {
        if (!riskData.mitigation || riskData.mitigation.trim() === '') {
          alert(`A Mitigation strategy is mandatory for ${riskData.level} risk item: ${riskName}`);
          return;
        }
      }
    }

    // Pre-flight check
    if (!formData.preflightCompleted) {
      alert("You must complete and check off the pre-flight checklist before saving the mission.");
      const preflightEl = document.getElementById('preflight-section');
      if (preflightEl) {
        preflightEl.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Mass List Extraction and Saving
    const newLists = JSON.parse(JSON.stringify(lists));
    let listsChanged = false;

    const checkAndAdd = (listKey, val) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return;
      const trimmed = val.trim();
      if (!newLists[listKey]) newLists[listKey] = [];
      if (!newLists[listKey].includes(trimmed)) {
          newLists[listKey].push(trimmed);
          listsChanged = true;
      }
    };

    const keysToCheck = [
      'pilots', 'additionalPilots', 'cameraOperators', 'observers', 'rpas', 'payload', 'opCategories', 'types', 'workElements', 
      'locations', 'airspaces', 'airspaceTypes', 'referenceGpsUnits',
      'approachAlts', 'emergencySites', 'descriptions', 'preflightIssuesList'
    ];
    
    const fieldMap = { 
      'pilots': 'pilot', 'additionalPilots': 'additionalPilots', 'cameraOperators': 'cameraOperators', 'observers': 'observers', 
      'rpas': 'rpas', 'payload': 'payload', 'opCategories': 'opCategory', 'types': 'type',
      'workElements': 'workElements',
      'locations': 'location', 'airspaces': 'airspace', 'airspaceTypes': 'airspaceType', 'referenceGpsUnits': 'referenceGpsUnit',
      'approachAlts': 'approachAlt', 'emergencySites': 'emergencySite',
      'descriptions': 'description', 'preflightIssuesList': 'preflightIssues'
    };

    keysToCheck.forEach(listKey => {
      const formField = fieldMap[listKey];
      const val = formData[formField];
      if (Array.isArray(val)) {
          val.forEach(item => checkAndAdd(listKey, item));
      } else {
          checkAndAdd(listKey, val);
      }
    });

    Object.values(formData.risks || {}).forEach(risk => {
      if (risk.checked) {
          checkAndAdd('riskDescriptions', risk.desc);
          checkAndAdd('riskMitigations', risk.mitigation);
      }
    });

    if (listsChanged) {
      onUpdateBulkLists(newLists);
    }

    const mission = { ...formData, coords, id: initialData?.id || generateId(), created: initialData?.created || new Date().toISOString() };
    onSave(mission);
  };

  const getListProps = (formKey, listKey, multiple = false, customClass = "mb-4") => ({
    value: formData[formKey],
    options: lists[listKey] || [],
    onChange: (val) => update(formKey, val),
    multiple,
    className: customClass,
    onDelete: (val) => {
       if (confirm(`Remove "${val}" from your saved options list?`)) {
         onUpdateList(listKey, val, 'del');
         if (!multiple && formData[formKey] === val) update(formKey, '');
       }
    }
  });

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-slate-100">
      <div className="bg-emerald-900 text-white p-4 sticky top-0 z-10 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-emerald-800 rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-bold tracking-wide">
            {initialData ? 'EDIT MISSION' : 'NEW MISSION'}
          </h2>
        </div>
        <div className="text-xs font-mono bg-emerald-800 px-2 py-1 rounded">
          STEP {step}/3
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24" ref={scrollRef}>
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="h-5 w-5 text-emerald-700" />
                TIME & LOCATION
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full overflow-hidden">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Start (24h)</label>
                  <input type="datetime-local" className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50" style={{ maxWidth: '100%', boxSizing: 'border-box' }} value={formData.start} onChange={e => update('start', e.target.value)} />
                </div>
                <div className="w-full overflow-hidden">
                   <label className="block text-xs font-bold text-slate-600 uppercase mb-1">End (24h)</label>
                  <input type="datetime-local" className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50" style={{ maxWidth: '100%', boxSizing: 'border-box' }} value={formData.end} onChange={e => update('end', e.target.value)} />
                </div>
              </div>
              <DynamicSelect label="Location / Site Name" icon={null} {...getListProps('location', 'locations')} />
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">GPS Coordinates</span>
                  <button onClick={handleGPS} className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-bold hover:bg-emerald-200 transition-colors shadow-sm">ACQUIRE GPS</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Latitude</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white" value={coords.lat || ''} onChange={(e) => handleCoordChange('lat', e.target.value)} placeholder="0.000000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Longitude</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white" value={coords.lng || ''} onChange={(e) => handleCoordChange('lng', e.target.value)} placeholder="0.000000" />
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded border border-slate-200 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">SECONDARY GPS COORDINATES (REFERENCE)</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Latitude</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white" value={formData.secondaryLat || ''} onChange={(e) => update('secondaryLat', e.target.value)} placeholder="0.000000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Longitude</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white" value={formData.secondaryLng || ''} onChange={(e) => update('secondaryLng', e.target.value)} placeholder="0.000000" />
                  </div>
                </div>
                <DynamicSelect label="REFERENCE GPS UNIT" icon={Navigation} {...getListProps('referenceGpsUnit', 'referenceGpsUnits')} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Users className="h-5 w-5 text-emerald-700" />
                OPERATIONAL RESOURCES
              </h3>
              <DynamicSelect label="Pilot In Command" icon={Users} {...getListProps('pilot', 'pilots')} />
              <DynamicSelect label="Additional Pilots" icon={Users} {...getListProps('additionalPilots', 'additionalPilots', true)} />
              <DynamicSelect label="Camera Operators" icon={Eye} {...getListProps('cameraOperators', 'cameraOperators', true)} />
              <DynamicSelect label="Observers" icon={Eye} {...getListProps('observers', 'observers', true)} />
              
              <DynamicSelect label="RPAS Model and Reg No." icon={Crosshair} {...getListProps('rpas', 'rpas', true)} />
              <DynamicSelect label="Payload" icon={Box} {...getListProps('payload', 'payload', true)} />
              <DynamicSelect label="Operation Category" icon={Activity} {...getListProps('opCategory', 'opCategories')} />
              
              <DynamicSelect label="Airspace Class" icon={Cloud} {...getListProps('airspace', 'airspaces')} />
              <DynamicSelect label="Airspace Type" icon={Cloud} {...getListProps('airspaceType', 'airspaceTypes')} />
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><MapPin className="h-3 w-3 text-emerald-700" /> Aerodromes within 100km</label>
                <textarea className="w-full p-3 border border-slate-300 rounded-md h-32 text-xs font-mono bg-slate-50" value={formData.aerodromesWithin100km || ''} onChange={(e) => update('aerodromesWithin100km', e.target.value)} placeholder="Will auto-populate when GPS is acquired..." />
              </div>
               <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Applicable NOTAMS</label>
                <textarea className="w-full p-3 border border-slate-300 rounded-md h-20" value={formData.notams} onChange={(e) => update('notams', e.target.value)} placeholder="Enter applicable NOTAMs..." />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><FileText className="h-3 w-3 text-emerald-700" /> Nav Canada Ref No.</label>
                <input type="text" className="w-full p-3 border border-slate-300 rounded-md" value={formData.navCanRef} onChange={(e) => update('navCanRef', e.target.value)} placeholder="Enter Ref No." />
              </div>
              <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><FileCheck className="h-3 w-3 text-emerald-700" /> NAV Canada File Upload</label>
                 {formData.navCanFile ? (
                    <div className="relative group p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800 flex items-center gap-2">
                       <FileCheck className="h-4 w-4" /> File Attached
                       <button onClick={() => update('navCanFile', null)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-md"><Trash2 className="h-3 w-3" /></button>
                    </div>
                 ) : (
                    <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                        <Upload className="h-4 w-4 text-slate-400" /><span className="text-[10px] text-slate-500">Upload File / Image</span>
                        <input type="file" className="hidden" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onload=(ev)=>update('navCanFile', ev.target.result); r.readAsDataURL(f); }}} />
                    </label>
                 )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-3">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Cloud className="h-5 w-5 text-emerald-700" /> WEATHER CONDITIONS</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Temp (°C)</label><input type="number" className="w-full p-3 border border-slate-300 rounded-md" value={formData.temperature} onChange={(e) => update('temperature', e.target.value)} /></div>
                  <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Wind (km/h)</label><input type="number" className="w-full p-3 border border-slate-300 rounded-md" value={formData.windSpeed} onChange={(e) => update('windSpeed', e.target.value)} /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Wind Direction</label>
                    <select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.windDir} onChange={(e) => update('windDir', e.target.value)}>
                      <option value="">Select...</option>
                      {['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Visibility (km)</label>
                    <select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.visibility} onChange={(e) => update('visibility', e.target.value)}>
                       <option value="">Select...</option>
                       {['Excellent (above 10 km)', 'Good (5-10 km)', 'Fair (2-5 km)', 'Poor (1-2 km)'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
               </div>
               <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Weather Notes</label><textarea className="w-full p-3 border border-slate-300 rounded-md h-20" value={formData.weatherText} onChange={e => update('weatherText', e.target.value)} /></div>
               <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Attach Forecast / Screenshot</label>
                  {formData.weatherImage ? (
                    <div className="relative group"><img src={formData.weatherImage} alt="Weather" className="w-full h-48 object-contain rounded-md border border-slate-200 bg-slate-50" /><button onClick={() => update('weatherImage', null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-md"><Trash2 className="h-4 w-4" /></button></div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-50"><Upload className="h-6 w-6 text-slate-400 mb-1" /><span className="text-xs text-slate-500">Click to upload screenshot</span><input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onload=(ev)=>update('weatherImage', ev.target.result); r.readAsDataURL(f); }}} /></label>
                  )}
               </div>
            </div>
            
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                 <FileText className="h-5 w-5 text-emerald-700" />
                 AFTER MISSION REPORT
               </h3>
               <DynamicTextArea label="Outcomes/Summary" value={formData.outcomesSummary || ''} options={lists.descriptions} onChange={(val) => update('outcomesSummary', val)} onDelete={(val) => onUpdateList('descriptions', val, 'del')} />
               <DynamicTextArea label="Incidents/Maintenance" value={formData.incidentsMaintenance || ''} options={lists.preflightIssuesList} onChange={(val) => update('incidentsMaintenance', val)} onDelete={(val) => onUpdateList('preflightIssuesList', val, 'del')} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Crosshair className="h-5 w-5 text-emerald-700" /> MISSION</h3>
               <DynamicSelect label="Mission Type" icon={FileText} {...getListProps('type', 'types')} />
               <DynamicSelect label="Work Elements" icon={FileText} {...getListProps('workElements', 'workElements', true)} />
               <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><Plus className="h-3 w-3 text-emerald-700" /> No. of Flights</label>
                 <select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.flightCount} onChange={(e) => update('flightCount', parseInt(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select>
               </div>
               
               <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><Navigation className="h-3 w-3 text-emerald-700" /> Distance to Operational Area (km)</label>
                 <input type="text" className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.distance} onChange={(e) => update('distance', e.target.value)} placeholder="e.g. 1.2" />
               </div>

               <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                 <h4 className="font-bold text-slate-700 text-xs uppercase mb-3">Approach and Departure</h4>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-28 shrink-0">
                      <DynamicSelect label="Alt (m)" icon={null} customClass="" {...getListProps('approachAlt', 'approachAlts')} />
                    </div>
                    <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Route</label>
                      <select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.approachRoute} onChange={(e) => update('approachRoute', e.target.value)}><option value="">Select...</option>{['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'].map(d => <option key={d} value={d}>{d}</option>)}</select>
                    </div>
                 </div>
               </div>
               
               <DynamicSelect label="Emergency Landing Site" icon={null} {...getListProps('emergencySite', 'emergencySites')} />
               <DynamicTextArea label="Description / Objectives" value={formData.description || ''} options={lists.descriptions} onChange={(val) => update('description', val)} onDelete={(val) => onUpdateList('descriptions', val, 'del')} />
               
               <div className="space-y-3">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase"><PenTool className="h-4 w-4 text-emerald-700" /> MISSION AREA SKETCH</h3>
                 <SketchPad initialImage={formData.sketch} onSave={(data) => update('sketch', data)} />
               </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-md text-emerald-900 text-sm mb-4">
              <strong>Assessment Required:</strong> Select all hazards present. Mitigation strategies are mandatory for Medium and High risk items.
            </div>
            {RISK_ITEMS.map((item) => {
              const riskData = formData.risks[item] || { checked: false };
              return (
                <div key={item} className={`bg-white rounded-md border shadow-sm overflow-hidden transition-all ${riskData.checked ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'}`}>
                  <label className="flex items-center p-4 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" className="w-5 h-5 accent-emerald-700 rounded mr-3" checked={riskData.checked} onChange={(e) => handleRiskChange(item, 'checked', e.target.checked)} />
                    <span className={`flex-1 font-medium ${riskData.checked ? 'text-slate-900' : 'text-slate-600'}`}>{item}</span>
                    {riskData.checked && <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${riskData.level === 'High' ? 'bg-red-100 text-red-700' : riskData.level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{riskData.level || 'NO LEVEL'}</span>}
                  </label>
                  {riskData.checked && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Level</label><select className="w-full p-2 border border-slate-300 rounded bg-white text-sm" value={riskData.level || ''} onChange={(e) => handleRiskChange(item, 'level', e.target.value)}><option value="">Select...</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
                      <DynamicTextArea label="Description" value={riskData.desc || ''} options={lists.riskDescriptions} onChange={(val) => handleRiskChange(item, 'desc', val)} onDelete={(val) => onUpdateList('riskDescriptions', val, 'del')} />
                      <DynamicTextArea label="Mitigation" value={riskData.mitigation || ''} options={lists.riskMitigations} onChange={(val) => handleRiskChange(item, 'mitigation', val)} onDelete={(val) => onUpdateList('riskMitigations', val, 'del')} />
                    </div>
                  )}
                </div>
              );
            })}
            
            <div id="preflight-section" className="bg-white p-5 rounded-md border border-slate-200 shadow-sm mt-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                <FileCheck className="h-5 w-5 text-emerald-700" />
                PRE-FLIGHT CHECKLIST
              </h3>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">COMPLETED CHECKLIST</label>
                <label className="flex items-center cursor-pointer bg-slate-50 p-3 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input type="checkbox" className="w-5 h-5 accent-emerald-700 rounded mr-3" checked={formData.preflightCompleted || false} onChange={(e) => update('preflightCompleted', e.target.checked)} />
                  <span className="text-sm font-medium text-slate-700">I have completed the pre-flight checklist</span>
                </label>
              </div>
              <DynamicTextArea label="Issues / Concerns" value={formData.preflightIssues || ''} options={lists.preflightIssuesList} onChange={(val) => update('preflightIssues', val)} onDelete={(val) => onUpdateList('preflightIssuesList', val, 'del')} />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 shadow-lg" style={{ padding: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-3xl mx-auto flex gap-4">
          {step > 1 && <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md uppercase tracking-wide text-sm">Back</button>}
          {step < 3 ? <button onClick={() => setStep(s => s + 1)} className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-md shadow-md uppercase tracking-wide text-sm">Next</button> : <button onClick={saveMission} className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md shadow-md flex justify-center items-center gap-2 uppercase tracking-wide text-sm"><Save className="h-5 w-5" /> Save Mission</button>}
        </div>
      </div>
    </div>
  );
};

// --- PRINT VIEW COMPONENT ---
const PrintMissionView = ({ mission, onBack }) => {
  if (!mission) return null;

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-20">
      <div className="print:hidden bg-emerald-900 text-white p-4 flex justify-between items-center shadow-md">
        <button onClick={onBack} className="flex items-center gap-2 font-bold hover:text-emerald-200 transition-colors">
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <button onClick={() => window.print()} className="bg-white text-emerald-900 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-sm">
          <Printer className="h-5 w-5" /> Print Report
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider">DFO RPAS Flight Log - Mission Report</h1>
          <p className="text-sm text-slate-600 mt-1">Mission ID: {mission.id}</p>
          <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
            <p>Compliant with CARs Part IX - TC and DFO Policy Draft</p>
            <p>Regional RPAS program coordinator: Philip Bouma</p>
            <p>Chief of Enforcement Operations: Ulysse Brideau</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Location & Time</h3>
            <p className="text-sm mb-1"><strong>Site:</strong> {mission.location}</p>
            <p className="text-sm mb-1"><strong>Start:</strong> {formatDateTime24h(mission.start)}</p>
            <p className="text-sm mb-1"><strong>End:</strong> {formatDateTime24h(mission.end)}</p>
            <p className="text-sm mb-1"><strong>Primary GPS:</strong> {mission.coords?.lat || 'N/A'}, {mission.coords?.lng || 'N/A'}</p>
            {(mission.secondaryLat || mission.secondaryLng) && (
              <p className="text-sm mb-1"><strong>Ref GPS:</strong> {mission.secondaryLat}, {mission.secondaryLng} ({mission.referenceGpsUnit})</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Operational Resources</h3>
            <p className="text-sm mb-1"><strong>Pilot In Command:</strong> {mission.pilot}</p>
            <p className="text-sm mb-1"><strong>Additional Pilots:</strong> {Array.isArray(mission.additionalPilots) ? mission.additionalPilots.join(', ') : 'None'}</p>
            <p className="text-sm mb-1"><strong>Camera Operators:</strong> {Array.isArray(mission.cameraOperators) ? mission.cameraOperators.join(', ') : 'None'}</p>
            <p className="text-sm mb-1"><strong>Observers:</strong> {Array.isArray(mission.observers) ? mission.observers.join(', ') : (mission.observer || 'None')}</p>
            <p className="text-sm mb-1 mt-2"><strong>RPAS:</strong> {Array.isArray(mission.rpas) ? mission.rpas.join(', ') : (mission.rpas || 'N/A')}</p>
            <p className="text-sm mb-1"><strong>Op Category:</strong> {mission.opCategory || 'N/A'}</p>
            <p className="text-sm mb-1"><strong>Payload:</strong> {Array.isArray(mission.payload) ? mission.payload.join(', ') : (mission.payload || 'N/A')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Mission Details</h3>
            <p className="text-sm mb-1"><strong>Type:</strong> {mission.type}</p>
            <p className="text-sm mb-1"><strong>Work Elements:</strong> {Array.isArray(mission.workElements) ? mission.workElements.join(', ') : (mission.workElement || 'N/A')}</p>
            <p className="text-sm mb-1"><strong>Flights:</strong> {mission.flightCount || 1}</p>
            <p className="text-sm mb-1"><strong>Distance:</strong> {mission.distance || 'N/A'} km</p>
            <p className="text-sm mb-1"><strong>Airspace:</strong> {mission.airspace} ({mission.airspaceType})</p>
            <p className="text-sm mb-1"><strong>Aerodromes within 100km:</strong> {mission.aerodromesWithin100km ? mission.aerodromesWithin100km : (Array.isArray(mission.aerodromes) ? mission.aerodromes.join(', ') : (mission.aerodromes || 'None'))}</p>
            <p className="text-sm mb-1"><strong>NOTAMS:</strong> {mission.notams || 'None'}</p>
            <p className="text-sm mb-1"><strong>NavCan Ref:</strong> {mission.navCanRef || 'N/A'}</p>
            <p className="text-sm mb-1 mt-2"><strong>Approach Alt:</strong> {mission.approachAlt || 'N/A'}, <strong>Route:</strong> {mission.approachRoute || 'N/A'}</p>
            <p className="text-sm mb-1"><strong>Emergency Site:</strong> {mission.emergencySite || 'N/A'}</p>
            <p className="text-sm mb-1 mt-2"><strong>Objectives:</strong> {mission.description || 'N/A'}</p>
          </div>
          <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Weather Conditions</h3>
             <p className="text-sm mb-1"><strong>Temp:</strong> {mission.temperature ? `${mission.temperature}°C` : 'N/A'}</p>
             <p className="text-sm mb-1"><strong>Wind:</strong> {mission.windSpeed ? `${mission.windSpeed} km/h ${mission.windDir}` : 'N/A'}</p>
             <p className="text-sm mb-1"><strong>Visibility:</strong> {mission.visibility || 'N/A'}</p>
             <p className="text-sm mb-1 mt-2"><strong>Notes:</strong> {mission.weatherText || 'None'}</p>
             
             <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2 mt-4">Post-Flight</h3>
             <p className="text-sm mb-1"><strong>Preflight Checked:</strong> {mission.preflightCompleted ? 'Yes' : 'No'}</p>
             <p className="text-sm mb-1"><strong>Issues:</strong> {mission.preflightIssues || 'None'}</p>
             <p className="text-sm mb-1"><strong>Outcomes:</strong> {mission.outcomesSummary || 'None'}</p>
             <p className="text-sm mb-1"><strong>Maintenance:</strong> {mission.incidentsMaintenance || 'None'}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Risk Assessment</h3>
          {(!mission.risks || Object.keys(mission.risks).filter(k => mission.risks[k].checked).length === 0) ? (
            <p className="text-sm italic text-slate-500">No risks flagged.</p>
          ) : (
            <table className="w-full text-sm border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left">Risk Factor</th>
                  <th className="border border-slate-300 p-2 text-left w-24">Level</th>
                  <th className="border border-slate-300 p-2 text-left">Mitigation Strategy</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(mission.risks).filter(([_, v]) => v.checked).map(([k, v]) => (
                  <tr key={k}>
                    <td className="border border-slate-300 p-2 font-medium">{k}</td>
                    <td className="border border-slate-300 p-2">{v.level || '-'}</td>
                    <td className="border border-slate-300 p-2">{v.mitigation || 'None specified'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {mission.sketch && (
            <div className="page-break-inside-avoid">
              <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Mission Area Map</h3>
              <img src={mission.sketch} alt="Mission Map" className="w-full max-h-[500px] object-contain border border-slate-300 rounded p-2" />
            </div>
          )}
          {mission.weatherImage && (
            <div className="page-break-inside-avoid">
              <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Weather Forecast / Screenshot</h3>
              <img src={mission.weatherImage} alt="Weather Screenshot" className="w-full max-h-[500px] object-contain border border-slate-300 rounded p-2" />
            </div>
          )}
          {mission.navCanFile && (
            <div className="page-break-inside-avoid">
              <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">NAV Canada Authorization File</h3>
              <img src={mission.navCanFile} alt="NAV Canada File" className="w-full max-h-[500px] object-contain border border-slate-300 rounded p-2" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const Dashboard = ({ missions, onCreateNew, onDelete, onEdit, onExport, onExportFull, onManageLists, onBackup, onRestore, onPrint, scrollRef }) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (scrollRef && scrollRef.current !== undefined) {
      window.scrollTo(0, scrollRef.current);
    }
    const handleScroll = () => {
      if (scrollRef) scrollRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);
  
  // JSON global search filter, newest first sort
  const filteredMissions = missions.filter(m => {
    if (!searchTerm) return true;
    return JSON.stringify(m).toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a,b) => new Date(b.start) - new Date(a.start));

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
      
      <div className="space-y-4">
        <header className="bg-emerald-900 text-white p-6 rounded-md shadow-lg">
          <div className="flex items-center sm:items-start gap-3">
            <Crosshair className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400 shrink-0 mt-0.5 sm:mt-1" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-wider leading-tight">
                DFO RPAS FLIGHT LOG
              </h1>
              <p className="text-xs text-emerald-200 mt-1 uppercase tracking-widest">
                Fishery Officer Field Unit
              </p>
            </div>
          </div>
        </header>
        
        <div className="bg-slate-300 p-4 rounded-md shadow-sm text-[10px] text-slate-700 uppercase font-bold tracking-wider space-y-1">
          <p>Compliant with CARs Part IX - TC and DFO Policy Draft</p>
          <p>Regional RPAS program coordinator: Philip Bouma</p>
          <p>Chief of Enforcement Operations: Ulysse Brideau</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCreateNew} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-md shadow-md font-bold flex items-center justify-center gap-2 text-md"><Plus className="h-5 w-5" /> NEW MISSION</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button onClick={onExport} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><FileText className="h-4 w-4 text-emerald-600" /> CSV Report</button>
        <button onClick={onExportFull} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><Globe className="h-4 w-4 text-purple-600" /> Full Report</button>
        <button onClick={onManageLists} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><List className="h-4 w-4 text-indigo-600" /> Saved Lists</button>
        <button onClick={onBackup} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><Database className="h-4 w-4 text-blue-600" /> Backup Data</button>
        <label className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm cursor-pointer">
          <Upload className="h-4 w-4 text-amber-600" /> Restore Data
          <input type="file" accept=".json" onChange={onRestore} className="hidden" />
        </label>
      </div>

      <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
        Note: Backup your data often
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
         <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
         <input 
           type="text" 
           placeholder="Search all mission data..." 
           className="w-full pl-10 p-3 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      <div className="border-b border-slate-200 pb-2 flex justify-between items-end">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Recorded Missions</h2>
        <span className="text-xs text-slate-400">{filteredMissions.length} RECORDS</span>
      </div>

      {filteredMissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-md border-2 border-dashed border-slate-200"><Crosshair className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">No mission data found.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {filteredMissions.map((mission, index) => {
            const visualRefNum = filteredMissions.length - index;
            
            return (
              <div key={mission.id} className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row">
                <div className="bg-slate-100 w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-200">
                  {mission.sketch ? <img src={mission.sketch} alt="Map" className="w-full h-full object-cover" /> : <div className="text-slate-300 flex flex-col items-center"><ImageIcon className="h-8 w-8 mb-1" /><span className="text-[10px] font-bold uppercase">No Map</span></div>}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">
                        <span className="text-slate-400 mr-2">#{visualRefNum}</span>
                        {mission.location}
                      </h3>
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">{mission.opCategory || 'Basic'}</span>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1 mb-4">
                      <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-emerald-600" /><span>{formatDateTime24h(mission.start)}</span></div>
                      <div className="flex items-center gap-2"><Users className="h-3 w-3 text-emerald-600" /><span>{mission.pilot}</span></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 mt-auto">
                    <button onClick={() => onEdit(mission)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded text-xs font-bold uppercase border border-slate-200 flex items-center justify-center gap-1 transition-colors"><Edit2 className="h-3 w-3" /> Edit</button>
                    <button onClick={() => onPrint(mission)} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded text-xs font-bold uppercase border border-emerald-200 flex items-center justify-center gap-1 transition-colors"><Printer className="h-3 w-3" /> Print</button>
                    <button onClick={() => onDelete(mission.id)} className="flex-1 bg-white hover:bg-red-50 text-red-600 py-2 rounded text-xs font-bold uppercase border border-red-100 flex items-center justify-center gap-1 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const [missions, setMissions] = useState([]);
  const [editingMission, setEditingMission] = useState(null);
  const [lists, setLists] = useState(DEFAULT_LISTS);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const dashboardScrollRef = useRef(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedMissions = await db.missions.toArray();
        setMissions(savedMissions);
        const savedLists = await db.settings.get('customLists');
        if (savedLists) {
           setLists(prev => ({ 
             ...DEFAULT_LISTS, 
             ...savedLists.value,
             opCategories: (savedLists.value.opCategories && savedLists.value.opCategories.length > 1) 
                ? savedLists.value.opCategories 
                : DEFAULT_LISTS.opCategories,
             referenceGpsUnits: savedLists.value.referenceGpsUnits || DEFAULT_LISTS.referenceGpsUnits,
             workElements: (savedLists.value.workElements && savedLists.value.workElements.length > 0)
                ? savedLists.value.workElements
                : DEFAULT_LISTS.workElements,
             additionalPilots: savedLists.value.additionalPilots || DEFAULT_LISTS.additionalPilots,
             cameraOperators: savedLists.value.cameraOperators || DEFAULT_LISTS.cameraOperators,
             observers: savedLists.value.observers || DEFAULT_LISTS.observers
           }));
        }
      } catch (error) { console.error(error); }
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Detection for custom install prompt
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    if (isIos && !isInStandaloneMode) {
      setShowIosPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => { setDeferredPrompt(null); });
    }
  };

  const handleUpdateList = async (key, value, action) => {
    const newLists = { ...lists };
    const current = newLists[key] || [];
    if (action === 'add' && !current.includes(value)) newLists[key] = [...current, value];
    else if (action === 'del') newLists[key] = current.filter(x => x !== value);
    setLists(newLists);
    await db.settings.put({ key: 'customLists', value: newLists });
  };
  
  const handleUpdateBulkLists = async (newListsObj) => {
    const updatedLists = { ...lists, ...newListsObj };
    setLists(updatedLists);
    await db.settings.put({ key: 'customLists', value: updatedLists });
  };

  const handleSaveMission = async (mission) => {
    try {
      await db.missions.put(mission);
      const allMissions = await db.missions.toArray();
      setMissions(allMissions);
      setEditingMission(null);
      setView('dashboard');
    } catch (error) { alert("Failed to save."); }
  };

  const handleEditStart = (mission) => { setEditingMission(mission); setView('form'); };

  const handleDeleteMission = async (id) => {
    if (confirm("Are you sure you want to delete this mission record?")) {
      await db.missions.delete(id);
      const allMissions = await db.missions.toArray();
      setMissions(allMissions);
    }
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.missions && Array.isArray(data.missions)) {
          if(confirm(`Restore ${data.missions.length} missions? This will overwrite current data.`)) {
             await db.transaction('rw', db.missions, db.settings, async () => {
                await db.missions.clear();
                await db.missions.bulkPut(data.missions);
                if(data.lists) {
                   await db.settings.put({ key: 'customLists', value: data.lists });
                   setLists(data.lists);
                }
             });
             const allMissions = await db.missions.toArray();
             setMissions(allMissions);
             alert("Restored successfully.");
          }
        } else alert("Invalid backup file.");
      } catch (err) { alert("Error reading file."); }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 overscroll-none">
      {view === 'dashboard' && (
        <Dashboard 
          missions={missions} 
          onCreateNew={() => { setEditingMission(null); setView('form'); }} 
          onEdit={handleEditStart}
          onDelete={handleDeleteMission}
          onExport={() => exportToCSV(missions)}
          onExportFull={() => exportToHTML(missions)}
          onManageLists={() => setView('saved-lists')}
          onBackup={() => backupData(missions, lists)}
          onRestore={handleRestore}
          onPrint={(mission) => { setEditingMission(mission); setView('print'); }}
          scrollRef={dashboardScrollRef}
        />
      )}
      {view === 'form' && (
        <MissionForm 
          initialData={editingMission}
          onSave={handleSaveMission} 
          onCancel={() => setView('dashboard')}
          lists={lists}
          onUpdateList={handleUpdateList}
          onUpdateBulkLists={handleUpdateBulkLists}
        />
      )}
      {view === 'print' && (
        <PrintMissionView 
          mission={editingMission} 
          onBack={() => { setView('dashboard'); }} 
        />
      )}
      {view === 'saved-lists' && (
        <SavedListsView 
          lists={lists} 
          onUpdateBulkLists={handleUpdateBulkLists} 
          onBack={() => setView('dashboard')} 
        />
      )}
      
      {/* Android Install Prompt */}
      {deferredPrompt && (
        <button onClick={handleInstall} className="fixed bottom-4 right-4 z-50 bg-emerald-900 text-white px-4 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 hover:bg-emerald-950 transition-all border-2 border-emerald-400 animate-bounce">
          <Download className="h-5 w-5" /> INSTALL APP
        </button>
      )}

      {/* Custom iOS Install Prompt */}
      {showIosPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 text-white p-4 shadow-2xl flex items-start gap-3 border-t border-slate-700" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <div className="flex-1">
            <p className="font-bold text-sm mb-1">Install DFO RPAS Log</p>
            <p className="text-slate-300 text-xs">To install this app on your iPhone, tap the <strong>Share</strong> icon below, then select <strong>Add to Home Screen</strong>.</p>
          </div>
          <button onClick={() => setShowIosPrompt(false)} className="text-slate-400 hover:text-white px-2 font-bold uppercase text-xs">
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
}