import React, { useEffect, useState } from 'react'

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
  Clock
} from 'lucide-react';

/**
 * --- UTILITIES ---
 */

const generateId = () => Math.random().toString(36).substr(2, 9);

// 24H Time Formatter
const formatDateTime24h = (isoString) => {
  if (!isoString) return '---';
  const date = new Date(isoString);
  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // Force 24h
  });
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

// 1. Dynamic Dropdown Component
const DynamicSelect = ({ label, icon: Icon, value, options, onChange, onAdd, onDelete }) => {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2">
        {Icon && <Icon className="h-3 w-3 text-emerald-700" />}
        {label}
      </label>
      <div className="flex gap-2">
        <select 
          className="flex-1 p-3 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-- Select --</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <button 
          onClick={onAdd}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 rounded-md border border-slate-300 font-bold"
          type="button"
          title="Add new option"
        >
          <Plus className="h-4 w-4" />
        </button>
        {value && options.includes(value) && (
          <button 
            onClick={() => onDelete(value)}
            className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 px-3 rounded-md border border-slate-300"
            type="button"
            title="Delete this option"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// 2. Sketch Pad Component
const SketchPad = ({ onSave, initialImage }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#dc2626'); // Red
  const [backgroundImage, setBackgroundImage] = useState(initialImage || null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 300; 
    
    // Fill white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      img.onload = () => {
        // Draw image "contain" style
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
      return { 
        x: e.touches[0].clientX - rect.left, 
        y: e.touches[0].clientY - rect.top 
      };
    }
    return { 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    };
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
    e.preventDefault(); // Prevent scrolling while drawing
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

// 3. New/Edit Mission Form
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
    risks: {}
  });

  const update = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));
  const handleGPS = () => getCoordinates((c) => setCoords(c));
  
  const handleRiskChange = (riskName, field, value) => {
    setFormData(prev => {
      const currentRisk = prev.risks[riskName] || { checked: false, level: '', desc: '', mitigation: '' };
      
      // If unchecking, remove from object
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
    const mission = {
      ...formData,
      coords,
      id: initialData?.id || generateId(),
      created: initialData?.created || new Date().toISOString()
    };
    onSave(mission);
  };

  const listHandler = (key) => ({
    value: formData[key],
    options: lists[key] || [],
    onChange: (val) => update(key, val),
    onAdd: () => {
      const v = window.prompt(`Add new ${key}`);
      if (v) {
        onUpdateList(key, v, 'add');
        update(key, v); // Auto select new option
      }
    },
    onDelete: (val) => {
      if (confirm(`Remove "${val}" from the saved list?`)) {
        onUpdateList(key, val, 'del');
        update(key, '');
      }
    }
  });

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-slate-100">
      {/* Header */}
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
            
            {/* Timing & Location */}
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
                <input 
                  className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" 
                  placeholder="e.g. Fraser River - Site 4"
                  value={formData.location}
                  onChange={e => update('location', e.target.value)} 
                />
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">GPS Coordinates</span>
                  <button onClick={handleGPS} className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-bold hover:bg-emerald-200 transition-colors">
                    ACQUIRE GPS
                  </button>
                </div>
                <div className="flex gap-4 text-sm font-mono text-slate-700">
                  <span>LAT: {coords.lat || '---'}</span>
                  <span>LNG: {coords.lng || '---'}</span>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Users className="h-5 w-5 text-emerald-700" />
                RESOURCES
              </h3>
              <DynamicSelect label="Pilot in Command" icon={Users} {...listHandler('pilots')} />
              <DynamicSelect label="RPAS (System)" icon={Crosshair} {...listHandler('rpas')} />
              <DynamicSelect label="Observer" icon={Eye} {...listHandler('observers')} />
              <DynamicSelect label="Payload" icon={Box} {...listHandler('payload')} />
              <DynamicSelect label="Mission Type" icon={FileText} {...listHandler('types')} />
            </div>

            {/* Sketch Pad */}
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <PenTool className="h-5 w-5 text-emerald-700" />
                MISSION AREA SKETCH
              </h3>
              <SketchPad 
                initialImage={formData.sketch} 
                onSave={(data) => update('sketch', data)} 
              />
            </div>

            {/* Description */}
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm">
               <label className="font-bold text-slate-800 mb-2 block text-sm uppercase">Description / Objectives</label>
               <textarea 
                  className="w-full p-3 border border-slate-300 rounded-md h-24 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Enter detailed mission objectives..."
                  value={formData.description}
                  onChange={e => update('description', e.target.value)}
               />
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
                  {/* Header Row */}
                  <label className="flex items-center p-4 cursor-pointer hover:bg-slate-50">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-emerald-700 rounded mr-3"
                      checked={riskData.checked}
                      onChange={(e) => handleRiskChange(item, 'checked', e.target.checked)}
                    />
                    <span className={`flex-1 font-medium ${riskData.checked ? 'text-slate-900' : 'text-slate-600'}`}>{item}</span>
                    {riskData.checked && (
                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                        riskData.level === 'High' ? 'bg-red-100 text-red-700' :
                        riskData.level === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {riskData.level || 'NO LEVEL'}
                      </span>
                    )}
                  </label>

                  {/* Expanded Details */}
                  {riskData.checked && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Level</label>
                        <select 
                          className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                          value={riskData.level || ''}
                          onChange={(e) => handleRiskChange(item, 'level', e.target.value)}
                        >
                          <option value="">Select Level...</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description of Hazard</label>
                        <textarea 
                          className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                          rows={2}
                          value={riskData.desc || ''}
                          onChange={(e) => handleRiskChange(item, 'desc', e.target.value)}
                          placeholder="Why is this a risk?"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mitigation Strategy</label>
                        <textarea 
                          className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                          rows={2}
                          value={riskData.mitigation || ''}
                          onChange={(e) => handleRiskChange(item, 'mitigation', e.target.value)}
                          placeholder="Control measures..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-20 shadow-lg">
        <div className="max-w-3xl mx-auto flex gap-4">
          {step === 2 && (
             <button 
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors uppercase tracking-wide text-sm"
            >
              Back
            </button>
          )}
          {step === 1 ? (
            <button 
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-md shadow-md transition-colors uppercase tracking-wide text-sm"
            >
              Next: Risk Assessment
            </button>
          ) : (
            <button 
              onClick={saveMission}
              className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md shadow-md flex justify-center items-center gap-2 transition-colors uppercase tracking-wide text-sm"
            >
              <Save className="h-5 w-5" />
              Save Mission
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Dashboard (Home)
const Dashboard = ({ missions, onCreateNew, onDelete, onEdit, onExport }) => {
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
        <button 
          onClick={onCreateNew}
          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-md shadow-md font-bold flex items-center justify-center gap-2 text-md transition-all active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          NEW MISSION
        </button>
        <button 
          onClick={onExport}
          className="bg-white hover:bg-slate-50 text-emerald-900 px-6 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm transition-colors"
        >
          <Download className="h-5 w-5" />
          EXPORT
        </button>
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
                
                {/* Thumbnail Area */}
                <div className="bg-slate-100 w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-200">
                  {mission.sketch ? (
                    <img src={mission.sketch} alt="Map" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center">
                      <ImageIcon className="h-8 w-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase">No Map</span>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{mission.location}</h3>
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {mission.type || 'General'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-slate-600 space-y-1 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-emerald-600" />
                        <span>{formatDateTime24h(mission.start)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-emerald-600" />
                        <span>{mission.pilot}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-auto">
                    <button 
                      onClick={() => onEdit(mission)}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded text-xs font-bold uppercase border border-slate-200 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button 
                      onClick={() => onDelete(mission.id)}
                      className="flex-1 bg-white hover:bg-red-50 text-red-600 py-2 rounded text-xs font-bold uppercase border border-red-100 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
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

/**
 * --- MAIN APP ---
 */
export default function App() {
  const [view, setView] = useState('dashboard'); // dashboard, form
  const [missions, setMissions] = useState([]);
  const [editingMission, setEditingMission] = useState(null);
  const [lists, setLists] = useState(DEFAULT_LISTS);

  // Load Data
  useEffect(() => {
    try {
      const savedMissions = localStorage.getItem('dfo_missions_v3');
      const savedLists = localStorage.getItem('dfo_lists_v3');
      
      if (savedMissions) setMissions(JSON.parse(savedMissions));
      if (savedLists) setLists(JSON.parse(savedLists));
    } catch (e) {
      console.error("Load error", e);
    }
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem('dfo_missions_v3', JSON.stringify(missions));
    localStorage.setItem('dfo_lists_v3', JSON.stringify(lists));
  }, [missions, lists]);

  const handleUpdateList = (key, value, action) => {
    setLists(prev => {
      const current = prev[key] || [];
      if (action === 'add' && !current.includes(value)) {
        return { ...prev, [key]: [...current, value] };
      }
      if (action === 'del') {
        return { ...prev, [key]: current.filter(x => x !== value) };
      }
      return prev;
    });
  };

  const handleSaveMission = (mission) => {
    setMissions(prev => {
      const exists = prev.find(m => m.id === mission.id);
      if (exists) {
        return prev.map(m => m.id === mission.id ? mission : m);
      }
      return [mission, ...prev];
    });
    setEditingMission(null);
    setView('dashboard');
  };

  const handleEditStart = (mission) => {
    setEditingMission(mission);
    setView('form');
  };

  const handleDeleteMission = (id) => {
    if (confirm("Are you sure you want to delete this mission record? This cannot be undone.")) {
      setMissions(prev => prev.filter(m => m.id !== id));
    }
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
    </div>
  );
}

  // ✅ Capture install prompt and clean up
  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault()
      console.log('✅ beforeinstallprompt event captured')
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ User accepted the install prompt')
        } else {
          console.log('❌ User dismissed the install prompt')
        }
        setDeferredPrompt(null)
      })
    }
  }

      {/* ✅ Show Install Button if PWA is installable */}
      {deferredPrompt && (
        <button
          onClick={handleInstall}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 20px',
            background: '#004c2c',
            color: '#fff',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 1000
          }}
        >
          📲 Install App
        </button>
      )}
    </div>
  )
}
