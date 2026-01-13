import React, { useState, useEffect, useRef } from 'react';
// import Dexie from 'dexie'; // <--- UNCOMMENT THIS FOR LOCAL USE AFTER RUNNING: npm install dexie
import { 
  Crosshair, 
  MapPin, 
  FileText, 
  AlertTriangle, 
  Download, 
  Trash2, 
  Plus, 
  Save, 
  ArrowLeft,
  Navigation,
  Users,
  Eye,
  Box,
  PenTool,
  Image as ImageIcon,
  Eraser,
  Edit2,
  Calendar,
  Database,
  Upload,
  Cloud
} from 'lucide-react';

/**
 * --- MOCK DEXIE CLASS (FOR PREVIEW ONLY) ---
 * This allows the app to run in this preview window without installing dependencies.
 * FOR LOCAL USE: You can delete this entire class and the TableHandler class 
 * once you have installed the real 'dexie' package and uncommented the import above.
 */
class Dexie {
  constructor(name) {
    this.dbName = name;
  }
  version(n) { return this; }
  stores(schema) { return this; }
  
  // Define tables (matches the schema used below)
  get missions() { return new TableHandler(this.dbName, 'missions'); }
  get settings() { return new TableHandler(this.dbName, 'settings'); }
}

class TableHandler {
  constructor(dbName, tableName) {
    this.dbName = dbName;
    this.tableName = tableName;
  }
  
  async _getStore(mode = 'readonly') {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('missions')) db.createObjectStore('missions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      };
      request.onsuccess = (event) => {
        const db = event.target.result;
        const tx = db.transaction(this.tableName, mode);
        resolve(tx.objectStore(this.tableName));
      };
      request.onerror = (e) => reject(e);
    });
  }

  async toArray() {
    const store = await this._getStore();
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async put(item) {
    const store = await this._getStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id) {
    const store = await this._getStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async get(key) {
    const store = await this._getStore();
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async clear() {
    const store = await this._getStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async bulkPut(items) {
    const store = await this._getStore('readwrite');
    return Promise.all(items.map(item => new Promise((resolve, reject) => {
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject();
    })));
  }
}

/**
 * --- DATABASE SETUP ---
 * This remains exactly the same as the Dexie implementation.
 */
class DroneLogDatabase extends Dexie {
  constructor() {
    super('DFO_Drone_Log_DB');
    this.version(1).stores({
      missions: 'id, created, start', // Primary key and indexed fields
      settings: 'key' // For storing lists
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

const getCoordinates = (callback) => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        callback({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        });
      },
      (error) => alert("Could not fetch location. Ensure GPS is on.")
    );
  } else {
    alert("Geolocation not available.");
  }
};

const exportToCSV = (missions) => {
  if (missions.length === 0) {
    alert("No missions to export.");
    return;
  }

  const formatRisks = (risks) => {
    if (!risks || Object.keys(risks).length === 0) return "None";
    return Object.entries(risks)
      .filter(([_, val]) => val.checked)
      .map(([key, val]) => `${key} (${val.level || '-'}): ${val.mitigation || ''}`)
      .join(" | ");
  };

  const headers = [
    "Mission ID", "Start Time", "End Time", "Location", "Lat", "Lng", 
    "Pilot", "RPAS", "Observer", "Payload", "Type", 
    "Weather Notes",
    "Description", "Risk Summary"
  ];

  const csvContent = [
    headers.join(","),
    ...missions.map(m => [
      m.id,
      formatDateTime24h(m.start),
      formatDateTime24h(m.end),
      `"${m.location || ''}"`,
      m.coords?.lat || '',
      m.coords?.lng || '',
      `"${m.pilot || ''}"`,
      `"${m.rpas || ''}"`,
      `"${m.observer || ''}"`,
      `"${m.payload || ''}"`,
      `"${m.type || ''}"`,
      `"${m.weatherText || ''}"`,
      `"${m.description || ''}"`,
      `"${formatRisks(m.risks)}"`
    ].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `dfo_mission_log_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- DATA BACKUP UTILS ---
const backupData = async (missions, lists) => {
  const data = {
    missions,
    lists,
    version: 'v4-dexie',
    backupDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `dfo_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Default Lists
const DEFAULT_LISTS = {
  rpas: ['Mavic 2 Enterprise', 'Matrice 300', 'Mini 3 Pro'],
  pilots: ['Officer Smith', 'Officer Jones'],
  payload: ['Visual', 'Thermal', 'LiDAR'],
  observers: ['None'],
  types: ['Training', 'Enforcement', 'Search & Rescue', 'Habitat Survey']
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

const DynamicSelect = ({ label, icon: Icon, value, options, onChange, onDelete }) => {
  const id = `list-${label.replace(/\s+/g, '-').toLowerCase()}`;
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
          {options.map(opt => <option key={opt} value={opt} />)}
        </datalist>
        {value && options.includes(value) && (
          <button 
            onClick={() => onDelete(value)}
            className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 px-3 rounded-md border border-slate-300"
            type="button"
            title="Remove from saved list"
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
  const [formData, setFormData] = useState(initialData || {
    start: '',
    end: '',
    location: '',
    description: '',
    pilot: '',
    rpas: '',
    observer: '',
    payload: '',
    type: '',
    sketch: null,
    weatherText: '',
    weatherImage: null,
    risks: {}
  });

  const update = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));
  const handleGPS = () => getCoordinates((c) => setCoords(c));
  
  const handleRiskChange = (riskName, field, value) => {
    setFormData(prev => {
      const currentRisk = prev.risks[riskName] || { checked: false, level: '', desc: '', mitigation: '' };
      if (field === 'checked' && value === false) {
        const newRisks = { ...prev.risks };
        delete newRisks[riskName];
        return { ...prev, risks: newRisks };
      }
      return {
        ...prev,
        risks: { ...prev.risks, [riskName]: { ...currentRisk, [field]: value } }
      };
    });
  };

  const saveMission = () => {
    if (!formData.location || !formData.pilot) {
      alert("Please enter at least a Location and Pilot name.");
      return;
    }

    // Auto-add new list options
    const keysToCheck = ['pilots', 'rpas', 'observers', 'payload', 'types'];
    const fieldMap = { 'pilots': 'pilot', 'rpas': 'rpas', 'observers': 'observer', 'payload': 'payload', 'types': 'type' };

    keysToCheck.forEach(listKey => {
      const formField = fieldMap[listKey];
      const val = formData[formField];
      if (val && lists[listKey] && !lists[listKey].includes(val)) {
        onUpdateList(listKey, val, 'add');
      }
    });

    const mission = {
      ...formData,
      coords,
      id: initialData?.id || generateId(),
      created: initialData?.created || new Date().toISOString()
    };
    onSave(mission);
  };

  const getListProps = (formKey, listKey) => ({
    value: formData[formKey],
    options: lists[listKey] || [],
    onChange: (val) => update(formKey, val),
    onDelete: (val) => {
       if (confirm(`Remove "${val}" from the saved list?`)) {
         onUpdateList(listKey, val, 'del');
         update(formKey, '');
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
          STEP {step}/2
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {step === 1 && (
          <div className="space-y-6">
            {/* TIME & LOCATION */}
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="h-5 w-5 text-emerald-700" />
                TIME & LOCATION
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Start (24h)</label>
                  <input type="datetime-local" className="w-full p-3 border border-slate-300 rounded bg-slate-50" value={formData.start} onChange={e => update('start', e.target.value)} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-600 uppercase mb-1">End (24h)</label>
                  <input type="datetime-local" className="w-full p-3 border border-slate-300 rounded bg-slate-50" value={formData.end} onChange={e => update('end', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Location / Site Name</label>
                <input className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Fraser River - Site 4" value={formData.location} onChange={e => update('location', e.target.value)} />
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">GPS Coordinates</span>
                  <button onClick={handleGPS} className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-bold hover:bg-emerald-200 transition-colors">ACQUIRE GPS</button>
                </div>
                <div className="flex gap-4 text-sm font-mono text-slate-700">
                  <span>LAT: {coords.lat || '---'}</span>
                  <span>LNG: {coords.lng || '---'}</span>
                </div>
              </div>
            </div>

            {/* RESOURCES */}
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Users className="h-5 w-5 text-emerald-700" />
                RESOURCES
              </h3>
              <DynamicSelect label="Pilot in Command" icon={Users} {...getListProps('pilot', 'pilots')} />
              <DynamicSelect label="RPAS (System)" icon={Crosshair} {...getListProps('rpas', 'rpas')} />
              <DynamicSelect label="Observer" icon={Eye} {...getListProps('observer', 'observers')} />
              <DynamicSelect label="Payload" icon={Box} {...getListProps('payload', 'payload')} />
              <DynamicSelect label="Mission Type" icon={FileText} {...getListProps('type', 'types')} />
            </div>

            {/* WEATHER */}
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-3">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Cloud className="h-5 w-5 text-emerald-700" />
                WEATHER CONDITIONS
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Briefing / Conditions</label>
                <textarea className="w-full p-3 border border-slate-300 rounded-md h-20 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" placeholder="Wind, Visibility, Cloud Ceiling, Temp..." value={formData.weatherText} onChange={e => update('weatherText', e.target.value)} />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Attach Forecast / Screenshot</label>
                 {formData.weatherImage ? (
                    <div className="relative group">
                      <img src={formData.weatherImage} alt="Weather" className="w-full h-48 object-contain rounded-md border border-slate-200 bg-slate-50" />
                      <button onClick={() => update('weatherImage', null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-md hover:bg-red-700" title="Remove Image"><Trash2 className="h-4 w-4" /></button>
                    </div>
                 ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="h-6 w-6 text-slate-400 mb-1" />
                            <p className="text-xs text-slate-500"><span className="font-semibold">Click to upload</span> screenshot</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => update('weatherImage', ev.target.result);
                            reader.readAsDataURL(file);
                          }
                        }} />
                    </label>
                 )}
              </div>
            </div>

            {/* SKETCH */}
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <PenTool className="h-5 w-5 text-emerald-700" />
                MISSION AREA SKETCH
              </h3>
              <SketchPad initialImage={formData.sketch} onSave={(data) => update('sketch', data)} />
            </div>

            {/* DESCRIPTION */}
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm">
               <label className="font-bold text-slate-800 mb-2 block text-sm uppercase">Description / Objectives</label>
               <textarea className="w-full p-3 border border-slate-300 rounded-md h-24 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Enter detailed mission objectives..." value={formData.description} onChange={e => update('description', e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
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
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Level</label>
                        <select className="w-full p-2 border border-slate-300 rounded bg-white text-sm" value={riskData.level || ''} onChange={(e) => handleRiskChange(item, 'level', e.target.value)}>
                          <option value="">Select Level...</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description of Hazard</label>
                        <textarea className="w-full p-2 border border-slate-300 rounded bg-white text-sm" rows={2} value={riskData.desc || ''} onChange={(e) => handleRiskChange(item, 'desc', e.target.value)} placeholder="Why is this a risk?" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mitigation Strategy</label>
                        <textarea className="w-full p-2 border border-slate-300 rounded bg-white text-sm" rows={2} value={riskData.mitigation || ''} onChange={(e) => handleRiskChange(item, 'mitigation', e.target.value)} placeholder="Control measures..." />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-20 shadow-lg">
        <div className="max-w-3xl mx-auto flex gap-4">
          {step === 2 && (
             <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors uppercase tracking-wide text-sm">Back</button>
          )}
          {step === 1 ? (
            <button onClick={() => setStep(2)} className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-md shadow-md transition-colors uppercase tracking-wide text-sm">Next: Risk Assessment</button>
          ) : (
            <button onClick={saveMission} className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md shadow-md flex justify-center items-center gap-2 transition-colors uppercase tracking-wide text-sm"><Save className="h-5 w-5" /> Save Mission</button>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ missions, onCreateNew, onDelete, onEdit, onExport, onBackup, onRestore }) => {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
      <header className="flex justify-between items-center bg-emerald-900 text-white p-6 rounded-md shadow-lg">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-3 tracking-wider">
            <Crosshair className="h-6 w-6 text-emerald-400" />
            DFO FLIGHT LOG
          </h1>
          <p className="text-xs text-emerald-200 mt-1 uppercase tracking-widest">Fishery Officer Field Unit</p>
        </div>
      </header>

      <div className="flex gap-3">
        <button onClick={onCreateNew} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-md shadow-md font-bold flex items-center justify-center gap-2 text-md transition-all active:scale-[0.98]"><Plus className="h-5 w-5" /> NEW MISSION</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
         <button onClick={onExport} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm transition-colors"><FileText className="h-4 w-4 text-emerald-600" /> CSV Report</button>
        <button onClick={onBackup} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm transition-colors"><Database className="h-4 w-4 text-blue-600" /> Backup Data</button>
        <label className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm transition-colors cursor-pointer">
          <Upload className="h-4 w-4 text-amber-600" /> Restore Data
          <input type="file" accept=".json" onChange={onRestore} className="hidden" />
        </label>
      </div>

      <div className="border-b border-slate-200 pb-2 flex justify-between items-end">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Recorded Missions</h2>
        <span className="text-xs text-slate-400">{missions.length} RECORDS</span>
      </div>

      {missions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-md border-2 border-dashed border-slate-200">
          <Crosshair className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No mission data found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {missions.sort((a,b) => new Date(b.created || 0) - new Date(a.created || 0)).map(mission => {
            return (
              <div key={mission.id} className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row">
                <div className="bg-slate-100 w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-200">
                  {mission.sketch ? <img src={mission.sketch} alt="Map" className="w-full h-full object-cover" /> : <div className="text-slate-300 flex flex-col items-center"><ImageIcon className="h-8 w-8 mb-1" /><span className="text-[10px] font-bold uppercase">No Map</span></div>}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{mission.location}</h3>
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">{mission.type || 'General'}</span>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1 mb-4">
                      <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-emerald-600" /><span>{formatDateTime24h(mission.start)}</span></div>
                      <div className="flex items-center gap-2"><Users className="h-3 w-3 text-emerald-600" /><span>{mission.pilot}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-auto">
                    <button onClick={() => onEdit(mission)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded text-xs font-bold uppercase border border-slate-200 flex items-center justify-center gap-2"><Edit2 className="h-3 w-3" /> Edit</button>
                    <button onClick={() => onDelete(mission.id)} className="flex-1 bg-white hover:bg-red-50 text-red-600 py-2 rounded text-xs font-bold uppercase border border-red-100 flex items-center justify-center gap-2"><Trash2 className="h-3 w-3" /> Delete</button>
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

  // Load Data from Dexie on Mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Missions
        const savedMissions = await db.missions.toArray();
        setMissions(savedMissions);

        // Load Lists
        const savedLists = await db.settings.get('customLists');
        if (savedLists) {
          setLists(savedLists.value);
        }
      } catch (error) {
        console.error("Failed to load data from Dexie:", error);
      }
    };
    loadData();
  }, []);

  // Update State when Missions Change (No automatic DB sync needed here, done in actions)
  
  // PWA Install
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') console.log('Accepted');
        setDeferredPrompt(null);
      });
    }
  };

  const handleUpdateList = async (key, value, action) => {
    const newLists = { ...lists };
    const current = newLists[key] || [];
    
    if (action === 'add' && !current.includes(value)) {
      newLists[key] = [...current, value];
    } else if (action === 'del') {
      newLists[key] = current.filter(x => x !== value);
    }
    
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
    } catch (error) {
      alert("Failed to save mission to database.");
      console.error(error);
    }
  };

  const handleEditStart = (mission) => {
    setEditingMission(mission);
    setView('form');
  };

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
             // Wipe current DB
             await db.missions.clear();
             await db.missions.bulkPut(data.missions);
             
             if(data.lists) {
               await db.settings.put({ key: 'customLists', value: data.lists });
               setLists(data.lists);
             }

             const allMissions = await db.missions.toArray();
             setMissions(allMissions);
             alert("Restored successfully.");
          }
        } else {
          alert("Invalid backup file.");
        }
      } catch (err) {
        alert("Error reading file.");
      }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {view === 'dashboard' && (
        <Dashboard 
          missions={missions} 
          onCreateNew={() => { setEditingMission(null); setView('form'); }} 
          onEdit={handleEditStart}
          onDelete={handleDeleteMission}
          onExport={() => exportToCSV(missions)}
          onBackup={() => backupData(missions, lists)}
          onRestore={handleRestore}
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
      {deferredPrompt && (
        <button onClick={handleInstall} className="fixed bottom-4 right-4 z-50 bg-emerald-900 text-white px-4 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 hover:bg-emerald-950 transition-all border-2 border-emerald-400 animate-bounce">
          <Download className="h-5 w-5" /> INSTALL APP
        </button>
      )}
    </div>
  );
}