import React, { useState, useEffect, useRef } from 'react';
import Dexie from 'dexie'; 
import { 
  Crosshair, MapPin, FileText, AlertTriangle, Download, Trash2, Plus, Save, 
  ArrowLeft, Navigation, Users, Eye, Box, PenTool, Image as ImageIcon, 
  Eraser, Edit2, Calendar, Database, Upload, Cloud, Radio, FileCheck, Wind, 
  Thermometer, Eye as VisibilityIcon, Activity, Search, Printer, Globe
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
      "Pilot", "RPAS Model/Reg", "Observer", "Payload", "Op Category", "Mission Type", "Work Element",
      "Flights", "Distance (km)", "Airspace Class", "Airspace Type", "Aerodromes", "Proximity", "NOTAMS", "NavCan Ref",
      "Temp (C)", "Wind Speed (km/h)", "Wind Dir", "Visibility (km)", "Weather Notes",
      "Approach Alt", "Approach Route", "Emergency Site",
      "Preflight Completed", "Preflight Issues",
      "Outcomes/Summary", "Incidents/Maintenance",
      "Description", "Risk Summary"
    ];

    const sortedMissions = [...missions].sort((a, b) => new Date(b.start) - new Date(a.start));

    const rows = sortedMissions.map(m => {
      const aerodromeStr = Array.isArray(m.aerodromes) ? m.aerodromes.join('; ') : (m.aerodromes || '');

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
        m.rpas,
        m.observer,
        m.payload,
        m.opCategory,
        m.type,
        m.workElement,
        m.flightCount || 1,
        m.distance,
        m.airspace,
        m.airspaceType,
        aerodromeStr,
        m.proximity,
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
    const aerodromeStr = Array.isArray(m.aerodromes) ? m.aerodromes.join(', ') : (m.aerodromes || 'None');
    
    html += `
      <div class="mission-card">
        <h2 class="mission-title">${m.location || 'Unknown Location'} - ${formatDateTime24h(m.start)}</h2>
        <table>
          <tbody>
            <tr><th>Mission ID</th><td>${m.id || 'N/A'}</td></tr>
            <tr><th>Date & Time</th><td>Start: ${formatDateTime24h(m.start)}<br/>End: ${formatDateTime24h(m.end)}</td></tr>
            <tr><th>Primary GPS</th><td>Lat: ${m.coords?.lat || '-'}, Lng: ${m.coords?.lng || '-'}</td></tr>
            <tr><th>Secondary GPS</th><td>Lat: ${m.secondaryLat || '-'}, Lng: ${m.secondaryLng || '-'} (Ref Unit: ${m.referenceGpsUnit || 'N/A'})</td></tr>
            <tr><th>Pilot / Observer</th><td>${m.pilot || 'N/A'} / ${m.observer || 'N/A'}</td></tr>
            <tr><th>RPAS / Payload</th><td>${m.rpas || 'N/A'} / ${m.payload || 'N/A'}</td></tr>
            <tr><th>Op Category / Mission Type</th><td>${m.opCategory || 'N/A'} / ${m.type || 'N/A'}</td></tr>
            <tr><th>Work Element</th><td>${m.workElement || 'N/A'}</td></tr>
            <tr><th>Flights / Distance</th><td>${m.flightCount || 1} flight(s) / ${m.distance || 'N/A'} km</td></tr>
            <tr><th>Airspace</th><td>${m.airspace || 'N/A'} (${m.airspaceType || 'N/A'})</td></tr>
            <tr><th>Aerodromes / Proximity</th><td>${aerodromeStr} / ${m.proximity || 'N/A'}</td></tr>
            <tr><th>NOTAMS / NavCan Ref</th><td>${m.notams || 'None'} / ${m.navCanRef || 'N/A'}</td></tr>
            <tr><th>Approach / Emergency Site</th><td>Alt: ${m.approachAlt || 'N/A'}m, Route: ${m.approachRoute || 'N/A'} / Site: ${m.emergencySite || 'None'}</td></tr>
            <tr><th>Weather Conditions</th><td>Temp: ${m.temperature || '-'}°C, Wind: ${m.windSpeed || '-'}km/h ${m.windDir || ''}, Vis: ${m.visibility || '-'} km</td></tr>
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
  payload: ['Visual', 'Thermal', 'LiDAR'],
  opCategories: ['Microdrone', 'Basic', 'Advanced', 'Level 1 Complex', 'SFOC'],
  observers: ['None'],
  types: ['Training', 'Enforcement', 'Search & Rescue', 'Habitat Survey'],
  workElements: ['Striped Bass', 'Salmon', 'Lobster', 'Snow Crab', 'Ice Fishing', 'Habitat', 'Groundfish', 'Trout'],
  locations: [],
  airspaces: ['Class G', 'Class F', 'Class C', 'Class D', 'Class E'],
  aerodromes: [
    'Fredericton (CYFC) - 119.5', 'Moncton (CYQM) - 120.8', 'Saint John (CYSJ) - 118.5', 'Bathurst (CYBF) - 122.3', 'Miramichi (CYCH) - 122.8',
    'Charlottetown (CYYG) - 118.0', 'Summerside (CYSU) - 122.3',
    'Halifax (CYHZ) - 118.7', 'Sydney (CYQY) - 118.7', 'Yarmouth (CYQY) - 122.3', 'Greenwood (CYZX) - 119.5', 'Trenton (CYTN) - 122.8'
  ],
  airspaceTypes: ['Uncontrolled', 'Controlled', 'Restricted'],
  referenceGpsUnits: []
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

const DynamicSelect = ({ label, icon: Icon, value, options, onChange, onDelete, multiple = false }) => {
  const id = `list-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  
  if (multiple) {
     return (
        <div className="mb-4">
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
                   }} className="hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                 </span>
               ))}
            </div>
            <div className="flex gap-2 relative">
               <input
                list={id}
                className="flex-1 p-3 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Select or type..."
                onChange={(e) => {
                  const val = e.target.value;
                  if (options && options.includes(val)) {
                     const current = Array.isArray(value) ? value : [];
                     if (!current.includes(val)) onChange([...current, val]);
                     e.target.value = '';
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.target.value;
                    if (val) {
                       const current = Array.isArray(value) ? value : [];
                       if (!current.includes(val)) onChange([...current, val]);
                       e.target.value = '';
                    }
                  }
                }}
              />
              <datalist id={id}>
                {options && options.map(opt => <option key={opt} value={opt} />)}
              </datalist>
            </div>
            <p className="text-[10px] text-slate-500">Type and press Enter to add multiple entries.</p>
          </div>
        </div>
     )
  }

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2">
        {Icon && <Icon className="h-3 w-3 text-emerald-700" />}
        {label}
      </label>
      <div className="flex gap-2 relative">
        <input
          list={id}
          className="flex-1 p-3 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
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
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const SketchPad = ({ onSave, initialImage }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#dc2626'); 
  const [backgroundImage, setBackgroundImage] = useState(initialImage || null);

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

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
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
    onSave(null);
  };

  return (
    <div className="border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
      <div className="bg-slate-100 p-2 flex gap-2 items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <label className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            LOAD MAP
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <button onClick={clearCanvas} className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:text-red-600 flex items-center gap-1">
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

const MissionForm = ({ onSave, onCancel, lists, onUpdateList, initialData }) => {
  const [step, setStep] = useState(1);
  const [coords, setCoords] = useState(initialData?.coords || { lat: '', lng: '' });
  const scrollRef = useRef(null); 
  
  const [formData, setFormData] = useState(() => {
    if (initialData) return initialData;
    const nowStr = getCurrentLocalTime();
    return {
      start: nowStr,
      end: addMinutes(nowStr, 30),
      location: '', description: '', pilot: '', rpas: '', observer: '', 
      payload: '', opCategory: '', 
      type: '', workElement: '', flightCount: 1, 
      airspace: '', airspaceType: '', aerodromes: [], proximity: '',
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
  
  const handleGPS = () => getCoordinates((c) => setCoords(c));
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
      alert("Please enter at least a Location and Pilot name.");
      return;
    }

    // Hazard Mitigation Validation
    const riskEntries = Object.entries(formData.risks || {});
    for (let i = 0; i < riskEntries.length; i++) {
      const [riskName, riskData] = riskEntries[i];
      if (riskData.checked && (riskData.level === 'Medium' || riskData.level === 'High')) {
        if (!riskData.mitigation || riskData.mitigation.trim() === '') {
          alert(`Mitigation strategy is mandatory for ${riskData.level} risk item: ${riskName}`);
          return;
        }
      }
    }

    // Pre-flight Validation
    if (!formData.preflightCompleted) {
      alert("You must complete and check off the pre-flight checklist before saving the mission.");
      const preflightEl = document.getElementById('preflight-section');
      if (preflightEl) {
        preflightEl.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    const keysToCheck = ['pilots', 'rpas', 'observers', 'payload', 'opCategories', 'types', 'workElements', 'locations', 'airspaces', 'aerodromes', 'airspaceTypes', 'referenceGpsUnits'];
    const fieldMap = { 
      'pilots': 'pilot', 'rpas': 'rpas', 'observers': 'observer', 
      'payload': 'payload', 'opCategories': 'opCategory', 'types': 'type',
      'workElements': 'workElement',
      'locations': 'location', 'airspaces': 'airspace', 'aerodromes': 'aerodromes', 
      'airspaceTypes': 'airspaceType', 'referenceGpsUnits': 'referenceGpsUnit'
    };

    keysToCheck.forEach(listKey => {
      const formField = fieldMap[listKey];
      const val = formData[formField];
      if (Array.isArray(val)) {
         val.forEach(item => { if (item && lists[listKey] && !lists[listKey].includes(item)) onUpdateList(listKey, item, 'add'); });
      } else {
         if (val && lists[listKey] && !lists[listKey].includes(val)) onUpdateList(listKey, val, 'add');
      }
    });

    const mission = { ...formData, coords, id: initialData?.id || generateId(), created: initialData?.created || new Date().toISOString() };
    onSave(mission);
  };

  const getListProps = (formKey, listKey, multiple = false) => ({
    value: formData[formKey],
    options: lists[listKey] || [],
    onChange: (val) => update(formKey, val),
    multiple,
    onDelete: (val) => {
       if (confirm(`Remove "${val}" from the saved list?`)) {
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
                  <button onClick={handleGPS} className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-bold hover:bg-emerald-200 transition-colors">ACQUIRE GPS</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Latitude</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono" value={coords.lat || ''} onChange={(e) => handleCoordChange('lat', e.target.value)} placeholder="0.000000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Longitude</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono" value={coords.lng || ''} onChange={(e) => handleCoordChange('lng', e.target.value)} placeholder="0.000000" />
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
              <DynamicSelect label="Pilot in Command" icon={Users} {...getListProps('pilot', 'pilots')} />
              <DynamicSelect label="RPAS Model and Reg No." icon={Crosshair} {...getListProps('rpas', 'rpas')} />
              <DynamicSelect label="Observer" icon={Eye} {...getListProps('observer', 'observers')} />
              <DynamicSelect label="Payload" icon={Box} {...getListProps('payload', 'payload')} />
              <DynamicSelect label="Operation Category" icon={Activity} {...getListProps('opCategory', 'opCategories')} />
              
              <DynamicSelect label="Airspace Class" icon={Cloud} {...getListProps('airspace', 'airspaces')} />
              <DynamicSelect label="Airspace Type" icon={Cloud} {...getListProps('airspaceType', 'airspaceTypes')} />
              <DynamicSelect label="Nearby Aerodromes / Frequency" icon={MapPin} {...getListProps('aerodromes', 'aerodromes', true)} />
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Proximity to Nearest Aerodrome</label>
                <input type="text" className="w-full p-3 border border-slate-300 rounded-md" value={formData.proximity} onChange={(e) => update('proximity', e.target.value)} placeholder="e.g. 5NM West" />
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
                       {[1, 3, 5, 10, 15, 20, 25, 30, '30+'].map(v => <option key={v} value={v}>{v}</option>)}
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
               <div>
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Outcomes/Summary</label>
                 <textarea className="w-full p-3 border border-slate-300 rounded-md h-20" value={formData.outcomesSummary || ''} onChange={(e) => update('outcomesSummary', e.target.value)} placeholder="Mission outcomes..." />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Incidents/Maintenance</label>
                 <textarea className="w-full p-3 border border-slate-300 rounded-md h-20" value={formData.incidentsMaintenance || ''} onChange={(e) => update('incidentsMaintenance', e.target.value)} placeholder="Any incidents or maintenance required..." />
               </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Crosshair className="h-5 w-5 text-emerald-700" /> MISSION</h3>
               <DynamicSelect label="Mission Type" icon={FileText} {...getListProps('type', 'types')} />
               <DynamicSelect label="Work Element" icon={FileText} {...getListProps('workElement', 'workElements')} />
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
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Altitude (m)</label><select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.approachAlt} onChange={(e) => update('approachAlt', e.target.value)}><option value="">Select...</option>{Array.from({length: 120}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                    <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Route</label><select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.approachRoute} onChange={(e) => update('approachRoute', e.target.value)}><option value="">Select...</option>{['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                 </div>
               </div>
               <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Emergency Landing Site</label><input type="text" className="w-full p-3 border border-slate-300 rounded-md" value={formData.emergencySite} onChange={(e) => update('emergencySite', e.target.value)} placeholder="Describe location..." /></div>
               <div><label className="font-bold text-slate-800 mb-2 block text-sm uppercase">Description / Objectives</label><textarea className="w-full p-3 border border-slate-300 rounded-md h-24" value={formData.description} onChange={e => update('description', e.target.value)} /></div>
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
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label><textarea className="w-full p-2 border border-slate-300 rounded bg-white text-sm" rows={2} value={riskData.desc || ''} onChange={(e) => handleRiskChange(item, 'desc', e.target.value)} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mitigation</label><textarea className="w-full p-2 border border-slate-300 rounded bg-white text-sm" rows={2} value={riskData.mitigation || ''} onChange={(e) => handleRiskChange(item, 'mitigation', e.target.value)} /></div>
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
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">ISSUES / CONCERNS</label>
                <textarea className="w-full p-3 border border-slate-300 rounded-md h-20" value={formData.preflightIssues || ''} onChange={(e) => update('preflightIssues', e.target.value)} placeholder="Note any issues or concerns here..." />
              </div>
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
            <p className="text-sm mb-1"><strong>Pilot:</strong> {mission.pilot}</p>
            <p className="text-sm mb-1"><strong>RPAS:</strong> {mission.rpas}</p>
            <p className="text-sm mb-1"><strong>Op Category:</strong> {mission.opCategory || 'N/A'}</p>
            <p className="text-sm mb-1"><strong>Payload:</strong> {mission.payload || 'N/A'}</p>
            <p className="text-sm mb-1"><strong>Observer:</strong> {mission.observer || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Mission Details</h3>
            <p className="text-sm mb-1"><strong>Type:</strong> {mission.type}</p>
            <p className="text-sm mb-1"><strong>Work Element:</strong> {mission.workElement || 'N/A'}</p>
            <p className="text-sm mb-1"><strong>Flights:</strong> {mission.flightCount || 1}</p>
            <p className="text-sm mb-1"><strong>Distance:</strong> {mission.distance || 'N/A'} km</p>
            <p className="text-sm mb-1"><strong>Airspace:</strong> {mission.airspace} ({mission.airspaceType})</p>
            <p className="text-sm mb-1"><strong>Aerodromes:</strong> {Array.isArray(mission.aerodromes) ? mission.aerodromes.join(', ') : (mission.aerodromes || 'None')}</p>
            <p className="text-sm mb-1"><strong>Proximity:</strong> {mission.proximity || 'N/A'}</p>
            <p className="text-sm mb-1"><strong>Emergency Site:</strong> {mission.emergencySite || 'N/A'}</p>
            <p className="text-sm mb-1 mt-2"><strong>Objectives:</strong> {mission.description || 'N/A'}</p>
          </div>
          <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">Weather Conditions</h3>
             <p className="text-sm mb-1"><strong>Temp:</strong> {mission.temperature ? `${mission.temperature}°C` : 'N/A'}</p>
             <p className="text-sm mb-1"><strong>Wind:</strong> {mission.windSpeed ? `${mission.windSpeed} km/h ${mission.windDir}` : 'N/A'}</p>
             <p className="text-sm mb-1"><strong>Visibility:</strong> {mission.visibility ? `${mission.visibility} km` : 'N/A'}</p>
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

const Dashboard = ({ missions, onCreateNew, onDelete, onEdit, onExport, onExportFull, onBackup, onRestore, onPrint }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // SORTED: Newest First
  const filteredMissions = missions.filter(m => 
    (m.location && m.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.pilot && m.pilot.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a,b) => new Date(b.start) - new Date(a.start));

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
      <header className="flex justify-between items-center bg-emerald-900 text-white p-6 rounded-md shadow-lg">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-3 tracking-wider"><Crosshair className="h-6 w-6 text-emerald-400" /> DFO RPAS FLIGHT LOG</h1>
          <p className="text-xs text-emerald-200 mt-1 uppercase tracking-widest">Fishery Officer Field Unit</p>
          <div className="text-[10px] text-emerald-300 mt-2 space-y-0.5">
            <p>Compliant with CARs Part IX - TC and DFO Policy Draft</p>
            <p>Regional RPAS program coordinator: Philip Bouma</p>
            <p>Chief of Enforcement Operations: Ulysse Brideau</p>
          </div>
        </div>
      </header>

      <div className="flex gap-3">
        <button onClick={onCreateNew} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-md shadow-md font-bold flex items-center justify-center gap-2 text-md"><Plus className="h-5 w-5" /> NEW MISSION</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onExport} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><FileText className="h-4 w-4 text-emerald-600" /> CSV Report</button>
        <button onClick={onExportFull} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><Globe className="h-4 w-4 text-purple-600" /> Full Report</button>
        <button onClick={onBackup} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><Database className="h-4 w-4 text-blue-600" /> Backup Data</button>
        <label className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm cursor-pointer">
          <Upload className="h-4 w-4 text-amber-600" /> Restore Data
          <input type="file" accept=".json" onChange={onRestore} className="hidden" />
        </label>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
         <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
         <input 
           type="text" 
           placeholder="Search site or pilot..." 
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
          {filteredMissions.map(mission => {
            return (
              <div key={mission.id} className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row">
                <div className="bg-slate-100 w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-200">
                  {mission.sketch ? <img src={mission.sketch} alt="Map" className="w-full h-full object-cover" /> : <div className="text-slate-300 flex flex-col items-center"><ImageIcon className="h-8 w-8 mb-1" /><span className="text-[10px] font-bold uppercase">No Map</span></div>}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{mission.location}</h3>
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedMissions = await db.missions.toArray();
        setMissions(savedMissions);
        const savedLists = await db.settings.get('customLists');
        // FIX: Force merge opCategories from DEFAULT_LISTS if they are missing or incomplete in the saved DB
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
                : DEFAULT_LISTS.workElements
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
          onBackup={() => backupData(missions, lists)}
          onRestore={handleRestore}
          onPrint={(mission) => { setEditingMission(mission); setView('print'); }}
        />
      )}
      {view === 'form' && (
        <MissionForm 
          initialData={editingMission}
          onSave={handleSaveMission} 
          onCancel={() => setView('dashboard')}
          lists={lists}
          onUpdateList={handleUpdateList}
        />
      )}
      {view === 'print' && (
        <PrintMissionView 
          mission={editingMission} 
          onBack={() => { setEditingMission(null); setView('dashboard'); }} 
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