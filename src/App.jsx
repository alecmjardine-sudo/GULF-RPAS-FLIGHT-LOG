import React, { useState, useEffect, useRef } from 'react';
import Dexie from 'dexie'; 
import { 
  Crosshair, MapPin, FileText, AlertTriangle, Download, Trash2, Plus, Save, 
  ArrowLeft, Navigation, Users, Eye, Box, PenTool, Image as ImageIcon, 
  Eraser, Edit2, Calendar, Database, Upload, Cloud, Radio, FileCheck, Wind, 
  Thermometer, Eye as VisibilityIcon, Activity, Search, Printer, Globe, Undo2, List
} from 'lucide-react';

/**
 * --- TRANSLATION DICTIONARY ---
 */
const TRANSLATIONS = {
  // General & Labels
  "Yes": "Oui", "No": "Non", "None": "Aucun", "None specified": "Aucune spécifiée", "N/A": "S.O.",
  "No risks flagged.": "Aucun risque signalé.",
  
  // Headers & Titles
  "DFO RPAS FLIGHT LOG": "CARNET DE VOL SATP DU MPO",
  "Fishery Officer Field Unit": "Unité opérationnelle des agents des pêches",
  "Compliant with CARs Part IX - TC and DFO Policy Draft": "Conforme à la partie IX du RAC - Ébauche de la politique de TC et du MPO",
  "Regional RPAS program coordinator: Philip Bouma": "Coordonnateur régional du programme SATP : Philip Bouma",
  "Chief of Enforcement Operations: Ulysse Brideau": "Chef des opérations d'application de la loi : Ulysse Brideau",
  "Note: Backup your data often": "Remarque : Sauvegardez vos données régulièrement",
  
  // Dashboard Buttons
  "CSV Report": "Rapport CSV", "Full Report": "Rapport complet", "Saved Lists": "Listes de référence",
  "Backup Data": "Sauvegarder les données", "Restore Data": "Restaurer les données",
  "NEW MISSION": "NOUVELLE MISSION", "Search all mission data...": "Rechercher dans les données de mission...",
  "Recorded Missions": "Missions enregistrées", "RECORDS": "DOSSIERS",
  "No mission data found.": "Aucune donnée de mission trouvée.",
  "Edit": "Modifier", "Print": "Imprimer", "Delete": "Supprimer", "No Map": "Aucune carte",

  // Form Steps
  "EDIT MISSION": "MODIFIER LA MISSION", "STEP": "ÉTAPE", "Back": "Retour", "Next": "Suivant", "Save Mission": "Enregistrer la mission",
  
  // Step 1
  "TIME & LOCATION": "HEURE ET LIEU", "Start (24h)": "Début (24h)", "End (24h)": "Fin (24h)",
  "Location / Site Name": "Emplacement / Nom du site", "GPS Coordinates": "Coordonnées GPS",
  "ACQUIRE GPS": "ACQUÉRIR GPS", "Latitude": "Latitude", "Longitude": "Longitude",
  "SECONDARY GPS COORDINATES (REFERENCE)": "COORDONNÉES GPS SECONDAIRES (RÉFÉRENCE)",
  "REFERENCE GPS UNIT": "UNITÉ GPS DE RÉFÉRENCE",
  
  // Step 2
  "OPERATIONAL RESOURCES": "RESSOURCES OPÉRATIONNELLES", "Pilot In Command": "Pilote commandant de bord",
  "Additional Pilots": "Pilotes supplémentaires", "Camera Operators": "Opérateurs de caméra",
  "Observers": "Observateurs visuels", "RPAS Model and Reg No.": "Modèle et no d'immatriculation du SATP",
  "Payload": "Charge utile", "Operation Category": "Catégorie d'utilisation",
  "Airspace Class": "Classe d'espace aérien", "Airspace Type": "Type d'espace aérien",
  "Aerodromes within 100km": "Aérodromes dans un rayon de 100 km", "POPULATE": "GÉNÉRER",
  "Will auto-populate when GPS is acquired or populate is pressed...": "Se remplira automatiquement lors de l'acquisition des coordonnées GPS ou en appuyant sur Générer...",
  "Applicable NOTAMS": "NOTAM en vigueur", "Enter applicable NOTAMs...": "Saisir les NOTAM en vigueur...",
  "Nav Canada Ref No.": "No de réf. de NAV CANADA", "Enter Ref No.": "Saisir le no de réf.",
  "NAV Canada File Upload": "Téléversement du fichier de NAV CANADA", "File Attached": "Fichier joint",
  "Upload File / Image": "Téléverser un fichier / image", "WEATHER CONDITIONS": "CONDITIONS MÉTÉOROLOGIQUES",
  "Temp (°C)": "Temp. (°C)", "Wind (km/h)": "Vent (km/h)", "Wind Direction": "Direction du vent",
  "Visibility (km)": "Visibilité (km)", "Select...": "Sélectionner...", "Weather Notes": "Notes météorologiques",
  "Attach Forecast / Screenshot": "Joindre les prévisions / capture d'écran", "Click to upload screenshot": "Cliquer pour téléverser une capture d'écran",
  "AFTER MISSION REPORT": "COMPTE RENDU POST-VOL", "Outcomes/Summary": "Bilan / Résumé",
  "Incidents/Maintenance": "Incidents / Maintenance", "MISSION": "MISSION", "Mission Type": "Type de mission",
  "Work Elements": "Activités opérationnelles", "No. of Flights": "Nbre de vols", "Distance to Operational Area (km)": "Distance de la zone d'opération (km)",
  "Approach and Departure": "Approche et départ", "Alt (m)": "Alt. (m)", "Route": "Trajectoire",
  "Emergency Landing Site": "Site d'atterrissage d'urgence", "Description / Objectives": "Description / Objectifs",
  "MISSION AREA SKETCH": "CROQUIS DE LA ZONE DES OPÉRATIONS", "LOAD MAP": "CHARGER UNE CARTE", "UNDO": "ANNULER", "CLEAR": "EFFACER",
  
  // Step 3
  "Assessment Required:": "Évaluation requise :", 
  "Select all hazards present. Mitigation strategies are mandatory for Medium and High risk items.": "Sélectionner tous les dangers présents. Les stratégies d'atténuation sont obligatoires pour les risques de niveau moyen et élevé.",
  "Risk Level": "Niveau de risque", "Low": "Faible", "Medium": "Moyen", "High": "Élevé", "NO LEVEL": "NON ÉVALUÉ",
  "Description": "Description", "Mitigation": "Mesure d'atténuation", "PRE-FLIGHT CHECKLIST": "LISTE DE VÉRIFICATIONS PRÉVOL",
  "COMPLETED CHECKLIST": "LISTE DE VÉRIFICATIONS REMPLIE", "I have completed the pre-flight checklist": "J'ai rempli la liste de vérifications prévol",
  "Issues / Concerns": "Problèmes / Préoccupations",
  
  // Components & Selects
  "Remove tag": "Supprimer l'étiquette", "Type and press + to add...": "Saisir et appuyer sur + pour ajouter...",
  "Add Entry": "Ajouter l'entrée", "Delete from saved options": "Supprimer des options sauvegardées",
  "Type an entry and press Enter to add it to the mission.": "Saisir une entrée et appuyer sur Entrée pour l'ajouter à la mission.",
  "Select or type...": "Sélectionner ou saisir...", "Insert a previously saved entry...": "Insérer une entrée sauvegardée...",
  "Delete this exact entry from saved list": "Supprimer cette entrée exacte de la liste sauvegardée",
  "Type here...": "Saisir ici...",
  
  // Saved Lists Manager
  "SAVED LISTS MANAGER": "GESTIONNAIRE DES LISTES DE RÉFÉRENCE", "This list is currently empty.": "Cette liste est actuellement vide.",
  "SAVE": "ENREGISTRER", "CANCEL": "ANNULER", "Add new item...": "Ajouter un nouvel élément...",
  "Locations / Site Names": "Emplacements / Noms des sites", "Pilots In Command": "Pilotes commandants de bord",
  "RPAS Models & Reg": "Modèles et immatriculations de SATP", "Payloads": "Charges utiles", "Operation Categories": "Catégories d'opérations",
  "Mission Types": "Types de missions", "Airspace Classes": "Classes d'espace aérien", "Airspace Types": "Types d'espace aérien",
  "Aerodromes Info": "Infos sur les aérodromes", "Reference GPS Units": "Unités GPS de référence", "Approach Altitudes": "Altitudes d'approche",
  "Emergency Landing Sites": "Sites d'atterrissage d'urgence", "Descriptions / Objectives": "Descriptions / Objectifs",
  "Pre-Flight Issues / Incidents": "Problèmes / Incidents prévol", "Risk Descriptions": "Descriptions des risques",
  "Risk Mitigations": "Mesures d'atténuation des risques",
  
  // Weather Options
  "Excellent (above 10 km)": "Excellente (plus de 10 km)", "Good (5-10 km)": "Bonne (5-10 km)",
  "Fair (2-5 km)": "Moyenne (2-5 km)", "Poor (1-2 km)": "Faible (1-2 km)",
  
  // Wind Dirs
  "W": "O", "WNW": "ONO", "NW": "NO", "NNW": "NNO", "SW": "SO", "WSW": "OSO", "SSW": "SSO",
  
  // Print & CSV View specific
  "Print Report": "Imprimer le rapport", "Mission ID": "ID de mission", "Date & Time": "Date et heure",
  "Start Time": "Heure de début", "End Time": "Heure de fin", "Lat": "Lat.", "Lng": "Long.", "Secondary Lat": "Lat. secondaire", "Secondary Lng": "Long. secondaire",
  "Primary GPS": "GPS principal", "Ref GPS": "GPS de réf.", "RPAS / Payload": "SATP / Charge utile",
  "Op Category / Mission Type": "Catégorie d'opération / Type de mission", "Flights / Distance": "Vols / Distance",
  "Airspace": "Espace aérien", "NOTAMS / NavCan Ref": "NOTAM / Réf. NAV CANADA", "Approach / Emergency Site": "Approche / Site d'urgence",
  "Mission Objectives": "Objectifs de la mission", "Risk Assessment": "Évaluation des risques",
  "Risk Factor": "Facteur de risque", "Mitigation Strategy": "Stratégie d'atténuation", "Mission Area Map": "Carte de la zone des opérations",
  "Weather Forecast / Screenshot": "Prévisions météo / Capture d'écran", "NAV Canada Authorization File": "Fichier d'autorisation de NAV CANADA",
  "Pilot": "Pilote", "Op Category": "Catégorie d'opération", "Proximity": "Proximité", "Approach Alt": "Alt. d'approche",
  "Preflight Checked": "Prévol vérifié", "Issues": "Problèmes", "Outcomes": "Bilan", "Maintenance": "Maintenance",
  "Flights": "Vols", "Distance (km)": "Distance (km)", "Aerodromes": "Aérodromes", "Start:": "Début :", "End:": "Fin :",
  
  // iOS
  "Install DFO RPAS Log": "Installer le carnet de vol SATP",
  "To install this app on your iPhone, tap the ": "Pour installer cette application sur votre iPhone, appuyez sur l'icône ",
  " icon below, then select ": " ci-dessous, puis sélectionnez ",
  "Add to Home Screen": "Sur l'écran d'accueil",
  "CLOSE": "FERMER",
  "INSTALL APP": "INSTALLER L'APPLICATION",
  
  // Risks Array (Display only)
  'Presence of people': 'Présence de personnes',
  'Proximity to built-up area': 'Proximité de zones bâties',
  'Proximity to obstacles': 'Proximité d\'obstacles',
  'Proximity to protected birds or animals': 'Proximité d\'oiseaux ou d\'animaux protégés',
  'Proximity to air traffic': 'Proximité de la circulation aérienne',
  'Operation in control zones': 'Opération dans des zones de contrôle',
  'Airspace restriction (F zone)': 'Restriction d\'espace aérien (Zone F)',
  'Risk of radio interference': 'Risque d\'interférence radio',
  'Proximity to magnetic fields': 'Proximité de champs magnétiques',
  'Environment with sand or dust in suspension': 'Environnement avec sable ou poussière en suspension',
  'Proximity to glass buildings': 'Proximité de bâtiments vitrés',
  'Strong wind condition': 'Conditions de vent fort',
  'Very cold weather': 'Temps très froid',
  'Heat wave condition (heat stress)': 'Conditions de canicule (stress thermique)',
  'Municipal restriction': 'Restrictions municipales',
  'Risk of intrusion into privacy': 'Risque d\'atteinte à la vie privée',
  'Proximity of pyrotechnic': 'Proximité de matériel pyrotechnique',
  'Drone not contrasted with the horizon': 'SATP ne contrastant pas avec l\'horizon',
  'Any other risk': 'Tout autre risque'
};

const t = (key, lang) => {
  if (lang === 'en') return key;
  return TRANSLATIONS[key] || key;
};

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

const getCoordinates = (callback, lang) => {
  if (!("geolocation" in navigator)) {
    alert(lang === 'fr' ? "La géolocalisation n'est pas prise en charge par votre navigateur." : "Geolocation is not supported by your browser.");
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
const exportToCSV = (missions, lang) => {
  if (!missions || missions.length === 0) {
    alert(lang === 'fr' ? "Aucune mission à exporter." : "No missions to export.");
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
      if (!risks) return t("None", lang);
      const entries = Object.entries(risks);
      if (entries.length === 0) return t("None", lang);
      
      return entries
        .filter(([_, val]) => val && val.checked)
        .map(([key, val]) => {
          const level = val.level || '-';
          const mit = val.mitigation ? ` (${t('Mitigation', lang)}: ${val.mitigation})` : '';
          return `${t(key, lang)} [${t(level, lang)}]${mit}`;
        })
        .join(" | ");
    };

    const headers = [
      t("Mission ID", lang), t("Start Time", lang), t("End Time", lang), t("Location", lang), t("Lat", lang), t("Lng", lang), 
      t("Secondary Lat", lang), t("Secondary Lng", lang), t("Ref GPS Unit", lang),
      t("Pilot In Command", lang), t("Additional Pilots", lang), t("Camera Operators", lang), t("Observers", lang), t("RPAS Model/Reg", lang), t("Payload", lang), t("Op Category", lang), t("Mission Type", lang), t("Work Elements", lang),
      t("Flights", lang), t("Distance (km)", lang), t("Airspace Class", lang), t("Airspace Type", lang), t("Aerodromes within 100km", lang), t("NOTAMS", lang), t("NavCan Ref", lang),
      t("Temp (°C)", lang), t("Wind Speed (km/h)", lang), t("Wind Direction", lang), t("Visibility (km)", lang), t("Weather Notes", lang),
      t("Approach Alt", lang), t("Approach Route", lang), t("Emergency Landing Site", lang),
      t("Preflight Completed", lang), t("Preflight Issues", lang),
      t("Outcomes/Summary", lang), t("Incidents/Maintenance", lang),
      t("Description / Objectives", lang), t("Risk Summary", lang)
    ];

    const sortedMissions = [...missions].sort((a, b) => new Date(b.start) - new Date(a.start));

    const rows = sortedMissions.map(m => {
      // Fallback to legacy fields if the new field is missing (protects old data)
      const aeroOut = m.aerodromesWithin100km ? m.aerodromesWithin100km : (Array.isArray(m.aerodromesInfo) ? m.aerodromesInfo.join('; ') : (m.aerodromesInfo || ''));
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
        m.windDir ? t(m.windDir, lang) : '',
        m.visibility ? t(m.visibility, lang) : '',
        m.weatherText,
        m.approachAlt,
        m.approachRoute ? t(m.approachRoute, lang) : '',
        m.emergencySite,
        m.preflightCompleted ? t('Yes', lang) : t('No', lang),
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
    alert((lang === 'fr' ? "Échec de la génération du CSV. Erreur: " : "Failed to generate CSV. Error: ") + err.message);
  }
};

// --- FULL HTML REPORT EXPORT ---
const exportToHTML = (missions, lang) => {
  if (!missions || missions.length === 0) {
    alert(lang === 'fr' ? "Aucune mission à exporter." : "No missions to export.");
    return;
  }

  const sortedMissions = [...missions].sort((a, b) => new Date(b.start) - new Date(a.start));

  let html = `
  <!DOCTYPE html>
  <html lang="${lang}">
  <head>
    <meta charset="UTF-8">
    <title>${t("DFO RPAS Flight Log - Full Report", lang)}</title>
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
        <h1>${t("DFO RPAS Flight Log - Full Report", lang)}</h1>
        <p><strong>${t("Generated:", lang)}</strong> ${new Date().toLocaleString()}</p>
      </div>
  `;

  sortedMissions.forEach(m => {
    const risks = m.risks ? Object.entries(m.risks).filter(([_, v]) => v.checked).map(([k, v]) => `${t(k, lang)} (${t(v.level || 'Unrated', lang)} - ${t("Mitigation:", lang)} ${v.mitigation || t('None', lang)})`).join('<br/>') : t('None', lang);
    const aeroOut = m.aerodromesWithin100km ? m.aerodromesWithin100km.replace(/\n/g, '<br/>') : (Array.isArray(m.aerodromesInfo) ? m.aerodromesInfo.join(', ') : (m.aerodromesInfo || t('None', lang)));
    const workElemStr = Array.isArray(m.workElements) ? m.workElements.join(', ') : (m.workElements || m.workElement || t('N/A', lang));
    const addPilotsStr = Array.isArray(m.additionalPilots) ? m.additionalPilots.join(', ') : t('None', lang);
    const camOpsStr = Array.isArray(m.cameraOperators) ? m.cameraOperators.join(', ') : t('None', lang);
    const observersStr = Array.isArray(m.observers) ? m.observers.join(', ') : (m.observer || t('None', lang));
    const rpasStr = Array.isArray(m.rpas) ? m.rpas.join(', ') : (m.rpas || t('N/A', lang));
    const payloadStr = Array.isArray(m.payload) ? m.payload.join(', ') : (m.payload || t('N/A', lang));
    
    html += `
      <div class="mission-card">
        <h2 class="mission-title">${m.location || t('Unknown Location', lang)} - ${formatDateTime24h(m.start)}</h2>
        <table>
          <tbody>
            <tr><th>${t("Mission ID", lang)}</th><td>${m.id || t('N/A', lang)}</td></tr>
            <tr><th>${t("Date & Time", lang)}</th><td>${t("Start:", lang)} ${formatDateTime24h(m.start)}<br/>${t("End:", lang)} ${formatDateTime24h(m.end)}</td></tr>
            <tr><th>${t("Primary GPS", lang)}</th><td>Lat: ${m.coords?.lat || '-'}, Lng: ${m.coords?.lng || '-'}</td></tr>
            <tr><th>${t("Secondary GPS", lang)}</th><td>Lat: ${m.secondaryLat || '-'}, Lng: ${m.secondaryLng || '-'} (${t("Ref Unit:", lang)} ${m.referenceGpsUnit || t('N/A', lang)})</td></tr>
            <tr><th>${t("Pilot In Command", lang)}</th><td>${m.pilot || t('N/A', lang)}</td></tr>
            <tr><th>${t("Additional Pilots", lang)}</th><td>${addPilotsStr}</td></tr>
            <tr><th>${t("Camera Operators", lang)}</th><td>${camOpsStr}</td></tr>
            <tr><th>${t("Observers", lang)}</th><td>${observersStr}</td></tr>
            <tr><th>${t("RPAS / Payload", lang)}</th><td>${rpasStr} / ${payloadStr}</td></tr>
            <tr><th>${t("Op Category / Mission Type", lang)}</th><td>${m.opCategory || t('N/A', lang)} / ${m.type || t('N/A', lang)}</td></tr>
            <tr><th>${t("Work Elements", lang)}</th><td>${workElemStr}</td></tr>
            <tr><th>${t("Flights / Distance", lang)}</th><td>${m.flightCount || 1} ${t("flight(s)", lang)} / ${m.distance || t('N/A', lang)} km</td></tr>
            <tr><th>${t("Airspace", lang)}</th><td>${m.airspace || t('N/A', lang)} (${m.airspaceType || t('N/A', lang)})</td></tr>
            <tr><th>${t("Aerodromes within 100km", lang)}</th><td>${aeroOut}</td></tr>
            <tr><th>${t("NOTAMS / NavCan Ref", lang)}</th><td>${m.notams || t('None', lang)} / ${m.navCanRef || t('N/A', lang)}</td></tr>
            <tr><th>${t("Approach / Emergency Site", lang)}</th><td>Alt: ${m.approachAlt || t('N/A', lang)}, Route: ${m.approachRoute ? t(m.approachRoute, lang) : t('N/A', lang)} / Site: ${m.emergencySite || t('None', lang)}</td></tr>
            <tr><th>${t("Weather Conditions", lang)}</th><td>Temp: ${m.temperature || '-'}°C, Vent: ${m.windSpeed || '-'}km/h ${m.windDir ? t(m.windDir, lang) : ''}, Vis: ${m.visibility ? t(m.visibility, lang) : '-'}</td></tr>
            <tr><th>${t("Weather Notes", lang)}</th><td>${m.weatherText || t('None', lang)}</td></tr>
            <tr><th>${t("Preflight Checklist", lang)}</th><td>Completed: ${m.preflightCompleted ? t('Yes', lang) : t('No', lang)}<br/>Issues: ${m.preflightIssues || t('None', lang)}</td></tr>
            <tr><th>${t("Mission Objectives", lang)}</th><td>${m.description || t('None', lang)}</td></tr>
            <tr><th>${t("Outcomes / Summary", lang)}</th><td>${m.outcomesSummary || t('None', lang)}</td></tr>
            <tr><th>${t("Incidents / Maintenance", lang)}</th><td>${m.incidentsMaintenance || t('None', lang)}</td></tr>
            <tr><th>${t("Risk Assessment", lang)}</th><td>${risks}</td></tr>
          </tbody>
        </table>
        
        <div class="image-grid">
          ${m.sketch ? `<div class="img-box"><h4>${t("Mission Area Sketch", lang)}</h4><img src="${m.sketch}" alt="Map Sketch" /></div>` : ''}
          ${m.weatherImage ? `<div class="img-box"><h4>${t("Weather Forecast / Screenshot", lang)}</h4><img src="${m.weatherImage}" alt="Weather Screenshot" /></div>` : ''}
          ${m.navCanFile ? `<div class="img-box"><h4>${t("NAV Canada Authorization File", lang)}</h4><img src="${m.navCanFile}" alt="Nav Canada Auth" /></div>` : ''}
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
  aerodromesInfo: [
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

// -- SAVED LISTS MANAGER VIEW --
const SavedListsView = ({ lists, onUpdateBulkLists, onBack, lang }) => {
  const [selectedList, setSelectedList] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');

  const LIST_NAMES = {
    locations: t("Locations / Site Names", lang),
    pilots: t("Pilots In Command", lang),
    additionalPilots: t("Additional Pilots", lang),
    cameraOperators: t("Camera Operators", lang),
    observers: t("Observers", lang),
    rpas: t("RPAS Models & Reg", lang),
    payload: t("Payloads", lang),
    opCategories: t("Operation Categories", lang),
    types: t("Mission Types", lang),
    workElements: t("Work Elements", lang),
    airspaces: t("Airspace Classes", lang),
    airspaceTypes: t("Airspace Types", lang),
    aerodromesInfo: t("Aerodromes Info", lang),
    referenceGpsUnits: t("Reference GPS Units", lang),
    approachAlts: t("Approach Altitudes", lang),
    emergencySites: t("Emergency Landing Sites", lang),
    descriptions: t("Descriptions / Objectives", lang),
    preflightIssuesList: t("Pre-Flight Issues / Incidents", lang),
    riskDescriptions: t("Risk Descriptions", lang),
    riskMitigations: t("Risk Mitigations", lang)
  };

  if (selectedList === null) {
     return (
       <div className="flex flex-col h-screen max-w-3xl mx-auto bg-slate-100">
         <div className="bg-emerald-900 text-white p-4 sticky top-0 z-10 flex items-center shadow-md gap-3">
           <button onClick={onBack} className="p-2 hover:bg-emerald-800 rounded-full transition-colors"><ArrowLeft className="h-6 w-6" /></button>
           <h2 className="text-lg font-bold tracking-wide">{t("SAVED LISTS MANAGER", lang)}</h2>
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
            {currentItems.length === 0 && <p className="text-center text-slate-500 italic mt-10">{t("This list is currently empty.", lang)}</p>}
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
                         }} className="bg-emerald-600 text-white px-3 py-2 rounded text-xs font-bold">{t("SAVE", lang)}</button>
                         <button onClick={() => setEditingIndex(null)} className="bg-slate-200 text-slate-700 px-3 py-2 rounded text-xs font-bold">{t("CANCEL", lang)}</button>
                       </div>
                     </div>
                  ) : (
                     <>
                       <span className="text-sm text-slate-800 flex-1 break-words whitespace-pre-wrap leading-relaxed">{item}</span>
                       <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditingIndex(idx); setEditValue(item); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => {
                             if(confirm(t('Delete this item?', lang))) {
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
               <textarea className="flex-1 border border-slate-300 p-3 rounded-md text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" rows={2} placeholder={t("Add new item...", lang)} value={newValue} onChange={e => setNewValue(e.target.value)} />
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


const DynamicSelect = ({ label, icon: Icon, value, options, onChange, onDelete, lang, multiple = false, className = "mb-4" }) => {
  const id = `list-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  const [inputValue, setInputValue] = useState('');
  
  if (multiple) {
     return (
        <div className={className}>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2">
            {Icon && <Icon className="h-3 w-3 text-emerald-700" />}
            {t(label, lang)}
          </label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
               {Array.isArray(value) && value.map(v => (
                 <span key={v} className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                   {v}
                   <button onClick={() => {
                      const newValue = value.filter(i => i !== v);
                      onChange(newValue);
                   }} className="hover:text-red-600" title={t("Remove tag", lang)}><Trash2 className="h-3 w-3" /></button>
                 </span>
               ))}
            </div>
            <div className="flex gap-2 relative">
               <input
                list={id}
                className="flex-1 min-w-0 p-3 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder={t("Type and press + to add...", lang)}
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
                title={t("Add Entry", lang)}
              >
                <Plus className="h-5 w-5" />
              </button>
              {inputValue && options && options.includes(inputValue) && (
                <button 
                  onClick={() => {
                    const confirmMsg = lang === 'fr' ? `Retirer "${inputValue}" de votre liste d'options enregistrées ?` : `Remove "${inputValue}" from your saved options list?`;
                    if (confirm(confirmMsg)) {
                      onDelete(inputValue);
                      setInputValue('');
                    }
                  }}
                  className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 px-3 rounded-md border border-slate-300 shadow-sm"
                  type="button"
                  title={t("Delete from saved options", lang)}
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
        {t(label, lang)}
      </label>
      <div className="flex gap-2 relative">
        <input
          list={id}
          className="flex-1 min-w-0 p-3 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("Select or type...", lang)}
        />
        <datalist id={id}>
          {options && options.map(opt => <option key={opt} value={opt} />)}
        </datalist>
        {value && options && options.includes(value) && (
          <button 
            onClick={() => {
               const confirmMsg = lang === 'fr' ? `Retirer "${value}" de votre liste d'options enregistrées ?` : `Remove "${value}" from your saved options list?`;
               if (confirm(confirmMsg)) {
                  onDelete(value);
               }
            }}
            className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 px-3 rounded-md border border-slate-300"
            type="button"
            title={t("Delete from saved options", lang)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT FOR MULTILINE RETAINED TEXT ---
const DynamicTextArea = ({ label, icon: Icon, value, options, onChange, onDelete, lang }) => {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2">
        {Icon && <Icon className="h-3 w-3 text-emerald-700" />}
        {t(label, lang)}
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
              <option value="">{t("Insert a previously saved entry...", lang)}</option>
              {options.map(opt => <option key={opt} value={opt}>{opt.substring(0, 60)}{opt.length > 60 ? '...' : ''}</option>)}
            </select>
            {value && options.includes(value) && (
              <button 
                onClick={() => {
                   const confirmMsg = lang === 'fr' ? `Retirer cette entrée exacte de votre liste d'options enregistrées ?` : `Delete this exact entry from saved list?`;
                   if (confirm(confirmMsg)) {
                      onDelete(value);
                   }
                }}
                className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 px-3 rounded-md border border-slate-300"
                type="button"
                title={t("Delete this exact entry from saved list", lang)}
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
          placeholder={t("Type here...", lang)}
        />
      </div>
    </div>
  );
};

const SketchPad = ({ onSave, initialImage, lang }) => {
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
            {t("LOAD MAP", lang)}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <button onClick={undo} type="button" className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1">
            <Undo2 className="h-3 w-3" /> {t("UNDO", lang)}
          </button>
          <button onClick={clearCanvas} type="button" className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:text-red-600 flex items-center gap-1">
            <Eraser className="h-3 w-3" /> {t("CLEAR", lang)}
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

const MissionForm = ({ onSave, onCancel, lists, onUpdateList, onUpdateBulkLists, initialData, lang }) => {
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

  const calculateAerodromes = (lat, lng) => {
    let nearbyText = "";
    if (lists.aerodromesInfo && Array.isArray(lists.aerodromesInfo)) {
      const nearby = [];
      lists.aerodromesInfo.forEach(aeroStr => {
         const match = aeroStr.match(/^(.*?)\s*\((.*?)\)\s*-\s*(.*?)\s*-\s*\[(.*?),\s*(.*?)\]$/);
         if (match) {
            const [_, name, code, freq, latStr, lngStr] = match;
            const dist = getDistanceFromLatLonInKm(parseFloat(lat), parseFloat(lng), parseFloat(latStr), parseFloat(lngStr));
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
         nearbyText = t("No aerodromes within 100km detected.", lang);
      }
    }
    return nearbyText;
  };
  
  const handleGPS = () => {
    if (coords.lat && coords.lng) {
      if (!confirm(t("Are you sure you want to re-acquire GPS coordinates? This will overwrite the current coordinates.", lang))) {
        return;
      }
    }
    getCoordinates((c) => {
      setCoords(c);
      update('aerodromesWithin100km', calculateAerodromes(c.lat, c.lng));
    }, lang);
  };

  const handlePopulateAerodromes = () => {
    if (!coords.lat || !coords.lng) {
      alert(t("Please acquire or manually enter GPS coordinates first.", lang));
      return;
    }
    update('aerodromesWithin100km', calculateAerodromes(coords.lat, coords.lng));
  };
  
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
      alert(t("Please enter at least a Location and Pilot In Command.", lang));
      return;
    }

    // Hazard Mitigation Validation
    const riskEntries = Object.entries(formData.risks || {});
    for (let i = 0; i < riskEntries.length; i++) {
      const [riskName, riskData] = riskEntries[i];
      if (riskData.checked && (riskData.level === 'Medium' || riskData.level === 'High')) {
        if (!riskData.mitigation || riskData.mitigation.trim() === '') {
          const msg = lang === 'fr' 
            ? `Une stratégie d'atténuation est obligatoire pour l'élément à risque ${t(riskData.level, lang)} : ${t(riskName, lang)}` 
            : `A Mitigation strategy is mandatory for ${riskData.level} risk item: ${riskName}`;
          alert(msg);
          return;
        }
      }
    }

    // Pre-flight check
    if (!formData.preflightCompleted) {
      alert(t("You must complete and check off the pre-flight checklist before saving the mission.", lang));
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
    lang,
    onDelete: (val) => {
       const confirmMsg = lang === 'fr' ? `Retirer "${val}" de votre liste d'options enregistrées ?` : `Remove "${val}" from your saved options list?`;
       if (confirm(confirmMsg)) {
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
            {initialData ? t('EDIT MISSION', lang) : t('NEW MISSION', lang)}
          </h2>
        </div>
        <div className="text-xs font-mono bg-emerald-800 px-2 py-1 rounded">
          {t('STEP', lang)} {step}/3
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24" ref={scrollRef}>
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="h-5 w-5 text-emerald-700" />
                {t('TIME & LOCATION', lang)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full overflow-hidden">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Start (24h)', lang)}</label>
                  <input type="datetime-local" className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50" style={{ maxWidth: '100%', boxSizing: 'border-box' }} value={formData.start} onChange={e => update('start', e.target.value)} />
                </div>
                <div className="w-full overflow-hidden">
                   <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('End (24h)', lang)}</label>
                  <input type="datetime-local" className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50" style={{ maxWidth: '100%', boxSizing: 'border-box' }} value={formData.end} onChange={e => update('end', e.target.value)} />
                </div>
              </div>
              <DynamicSelect label="Location / Site Name" icon={null} {...getListProps('location', 'locations')} />
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">{t('GPS Coordinates', lang)}</span>
                  <button onClick={handleGPS} className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-bold hover:bg-emerald-200 transition-colors shadow-sm">{t('ACQUIRE GPS', lang)}</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('Latitude', lang)}</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white" value={coords.lat || ''} onChange={(e) => handleCoordChange('lat', e.target.value)} placeholder="0.000000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('Longitude', lang)}</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white" value={coords.lng || ''} onChange={(e) => handleCoordChange('lng', e.target.value)} placeholder="0.000000" />
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded border border-slate-200 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">{t('SECONDARY GPS COORDINATES (REFERENCE)', lang)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('Latitude', lang)}</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white" value={formData.secondaryLat || ''} onChange={(e) => update('secondaryLat', e.target.value)} placeholder="0.000000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('Longitude', lang)}</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white" value={formData.secondaryLng || ''} onChange={(e) => update('secondaryLng', e.target.value)} placeholder="0.000000" />
                  </div>
                </div>
                <DynamicSelect label="REFERENCE GPS UNIT" icon={Navigation} {...getListProps('referenceGpsUnit', 'referenceGpsUnits')} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <Users className="h-5 w-5 text-emerald-700" />
                {t('OPERATIONAL RESOURCES', lang)}
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase flex items-center gap-2"><MapPin className="h-3 w-3 text-emerald-700" /> {t('Aerodromes within 100km', lang)}</label>
                  <button onClick={handlePopulateAerodromes} type="button" className="text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-bold hover:bg-emerald-200 transition-colors shadow-sm">{t('POPULATE', lang)}</button>
                </div>
                <textarea className="w-full p-3 border border-slate-300 rounded-md h-32 text-xs font-mono bg-slate-50" value={formData.aerodromesWithin100km || ''} onChange={(e) => update('aerodromesWithin100km', e.target.value)} placeholder={t("Will auto-populate when GPS is acquired or populate is pressed...", lang)} />
              </div>
               <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Applicable NOTAMS', lang)}</label>
                <textarea className="w-full p-3 border border-slate-300 rounded-md h-20" value={formData.notams} onChange={(e) => update('notams', e.target.value)} placeholder={t("Enter applicable NOTAMs...", lang)} />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><FileText className="h-3 w-3 text-emerald-700" /> {t('Nav Canada Ref No.', lang)}</label>
                <input type="text" className="w-full p-3 border border-slate-300 rounded-md" value={formData.navCanRef} onChange={(e) => update('navCanRef', e.target.value)} placeholder={t("Enter Ref No.", lang)} />
              </div>
              <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><FileCheck className="h-3 w-3 text-emerald-700" /> {t('NAV Canada File Upload', lang)}</label>
                 {formData.navCanFile ? (
                    <div className="relative group p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800 flex items-center gap-2">
                       <FileCheck className="h-4 w-4" /> {t('File Attached', lang)}
                       <button onClick={() => update('navCanFile', null)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-md"><Trash2 className="h-3 w-3" /></button>
                    </div>
                 ) : (
                    <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                        <Upload className="h-4 w-4 text-slate-400" /><span className="text-[10px] text-slate-500">{t('Upload File / Image', lang)}</span>
                        <input type="file" className="hidden" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onload=(ev)=>update('navCanFile', ev.target.result); r.readAsDataURL(f); }}} />
                    </label>
                 )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-3">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Cloud className="h-5 w-5 text-emerald-700" /> {t('WEATHER CONDITIONS', lang)}</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Temp (°C)', lang)}</label><input type="number" className="w-full p-3 border border-slate-300 rounded-md" value={formData.temperature} onChange={(e) => update('temperature', e.target.value)} /></div>
                  <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Wind (km/h)', lang)}</label><input type="number" className="w-full p-3 border border-slate-300 rounded-md" value={formData.windSpeed} onChange={(e) => update('windSpeed', e.target.value)} /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Wind Direction', lang)}</label>
                    <select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.windDir} onChange={(e) => update('windDir', e.target.value)}>
                      <option value="">{t('Select...', lang)}</option>
                      {['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'].map(d => <option key={d} value={d}>{t(d, lang)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Visibility (km)', lang)}</label>
                    <select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.visibility} onChange={(e) => update('visibility', e.target.value)}>
                       <option value="">{t('Select...', lang)}</option>
                       {['Excellent (above 10 km)', 'Good (5-10 km)', 'Fair (2-5 km)', 'Poor (1-2 km)'].map(v => <option key={v} value={v}>{t(v, lang)}</option>)}
                    </select>
                  </div>
               </div>
               <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Weather Notes', lang)}</label><textarea className="w-full p-3 border border-slate-300 rounded-md h-20" value={formData.weatherText} onChange={e => update('weatherText', e.target.value)} /></div>
               <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Attach Forecast / Screenshot', lang)}</label>
                  {formData.weatherImage ? (
                    <div className="relative group"><img src={formData.weatherImage} alt="Weather" className="w-full h-48 object-contain rounded-md border border-slate-200 bg-slate-50" /><button onClick={() => update('weatherImage', null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-md"><Trash2 className="h-4 w-4" /></button></div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-50"><Upload className="h-6 w-6 text-slate-400 mb-1" /><span className="text-xs text-slate-500">{t('Click to upload screenshot', lang)}</span><input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onload=(ev)=>update('weatherImage', ev.target.result); r.readAsDataURL(f); }}} /></label>
                  )}
               </div>
            </div>
            
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                 <FileText className="h-5 w-5 text-emerald-700" />
                 {t('AFTER MISSION REPORT', lang)}
               </h3>
               <DynamicTextArea label="Outcomes/Summary" value={formData.outcomesSummary || ''} options={lists.descriptions} onChange={(val) => update('outcomesSummary', val)} onDelete={(val) => onUpdateList('descriptions', val, 'del')} lang={lang} />
               <DynamicTextArea label="Incidents/Maintenance" value={formData.incidentsMaintenance || ''} options={lists.preflightIssuesList} onChange={(val) => update('incidentsMaintenance', val)} onDelete={(val) => onUpdateList('preflightIssuesList', val, 'del')} lang={lang} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Crosshair className="h-5 w-5 text-emerald-700" /> {t('MISSION', lang)}</h3>
               <DynamicSelect label="Mission Type" icon={FileText} {...getListProps('type', 'types')} />
               <DynamicSelect label="Work Elements" icon={FileText} {...getListProps('workElements', 'workElements', true)} />
               <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><Plus className="h-3 w-3 text-emerald-700" /> {t('No. of Flights', lang)}</label>
                 <select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.flightCount} onChange={(e) => update('flightCount', parseInt(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select>
               </div>
               
               <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><Navigation className="h-3 w-3 text-emerald-700" /> {t('Distance to Operational Area (km)', lang)}</label>
                 <input type="text" className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.distance} onChange={(e) => update('distance', e.target.value)} placeholder="e.g. 1.2" />
               </div>

               <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                 <h4 className="font-bold text-slate-700 text-xs uppercase mb-3">{t('Approach and Departure', lang)}</h4>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-28 shrink-0">
                      <DynamicSelect label="Alt (m)" icon={null} customClass="" {...getListProps('approachAlt', 'approachAlts')} />
                    </div>
                    <div className="flex-1 min-w-0 mb-4 sm:mb-0">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('Route', lang)}</label>
                      <select className="w-full p-3 border border-slate-300 rounded-md bg-white" value={formData.approachRoute} onChange={(e) => update('approachRoute', e.target.value)}><option value="">{t('Select...', lang)}</option>{['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'].map(d => <option key={d} value={d}>{t(d, lang)}</option>)}</select>
                    </div>
                 </div>
               </div>
               
               <DynamicSelect label="Emergency Landing Site" icon={null} {...getListProps('emergencySite', 'emergencySites')} />
               <DynamicTextArea label="Description / Objectives" value={formData.description || ''} options={lists.descriptions} onChange={(val) => update('description', val)} onDelete={(val) => onUpdateList('descriptions', val, 'del')} lang={lang} />
               
               <div className="space-y-3">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase"><PenTool className="h-4 w-4 text-emerald-700" /> {t('MISSION AREA SKETCH', lang)}</h3>
                 <SketchPad initialImage={formData.sketch} onSave={(data) => update('sketch', data)} lang={lang} />
               </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-md text-emerald-900 text-sm mb-4">
              <strong>{t('Assessment Required:', lang)}</strong> {t('Select all hazards present. Mitigation strategies are mandatory for Medium and High risk items.', lang)}
            </div>
            {RISK_ITEMS.map((item) => {
              const riskData = formData.risks[item] || { checked: false };
              return (
                <div key={item} className={`bg-white rounded-md border shadow-sm overflow-hidden transition-all ${riskData.checked ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'}`}>
                  <label className="flex items-center p-4 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" className="w-5 h-5 accent-emerald-700 rounded mr-3" checked={riskData.checked} onChange={(e) => handleRiskChange(item, 'checked', e.target.checked)} />
                    <span className={`flex-1 font-medium ${riskData.checked ? 'text-slate-900' : 'text-slate-600'}`}>{t(item, lang)}</span>
                    {riskData.checked && <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${riskData.level === 'High' ? 'bg-red-100 text-red-700' : riskData.level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{t(riskData.level || 'NO LEVEL', lang)}</span>}
                  </label>
                  {riskData.checked && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Risk Level', lang)}</label><select className="w-full p-2 border border-slate-300 rounded bg-white text-sm" value={riskData.level || ''} onChange={(e) => handleRiskChange(item, 'level', e.target.value)}><option value="">{t('Select...', lang)}</option><option value="Low">{t('Low', lang)}</option><option value="Medium">{t('Medium', lang)}</option><option value="High">{t('High', lang)}</option></select></div>
                      <DynamicTextArea label="Description" value={riskData.desc || ''} options={lists.riskDescriptions} onChange={(val) => handleRiskChange(item, 'desc', val)} onDelete={(val) => onUpdateList('riskDescriptions', val, 'del')} lang={lang} />
                      <DynamicTextArea label="Mitigation" value={riskData.mitigation || ''} options={lists.riskMitigations} onChange={(val) => handleRiskChange(item, 'mitigation', val)} onDelete={(val) => onUpdateList('riskMitigations', val, 'del')} lang={lang} />
                    </div>
                  )}
                </div>
              );
            })}
            
            <div id="preflight-section" className="bg-white p-5 rounded-md border border-slate-200 shadow-sm mt-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                <FileCheck className="h-5 w-5 text-emerald-700" />
                {t('PRE-FLIGHT CHECKLIST', lang)}
              </h3>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">{t('COMPLETED CHECKLIST', lang)}</label>
                <label className="flex items-center cursor-pointer bg-slate-50 p-3 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input type="checkbox" className="w-5 h-5 accent-emerald-700 rounded mr-3" checked={formData.preflightCompleted || false} onChange={(e) => update('preflightCompleted', e.target.checked)} />
                  <span className="text-sm font-medium text-slate-700">{t('I have completed the pre-flight checklist', lang)}</span>
                </label>
              </div>
              <DynamicTextArea label="Issues / Concerns" value={formData.preflightIssues || ''} options={lists.preflightIssuesList} onChange={(val) => update('preflightIssues', val)} onDelete={(val) => onUpdateList('preflightIssuesList', val, 'del')} lang={lang} />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 shadow-lg" style={{ padding: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-3xl mx-auto flex gap-4">
          {step > 1 && <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md uppercase tracking-wide text-sm">{t('Back', lang)}</button>}
          {step < 3 ? <button onClick={() => setStep(s => s + 1)} className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-md shadow-md uppercase tracking-wide text-sm">{t('Next', lang)}</button> : <button onClick={saveMission} className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md shadow-md flex justify-center items-center gap-2 uppercase tracking-wide text-sm"><Save className="h-5 w-5" /> {t('Save Mission', lang)}</button>}
        </div>
      </div>
    </div>
  );
};

// --- PRINT VIEW COMPONENT ---
const PrintMissionView = ({ mission, onBack, lang }) => {
  if (!mission) return null;

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-20">
      <div className="print:hidden bg-emerald-900 text-white p-4 flex justify-between items-center shadow-md">
        <button onClick={onBack} className="flex items-center gap-2 font-bold hover:text-emerald-200 transition-colors">
          <ArrowLeft className="h-5 w-5" /> {t('Back', lang)}
        </button>
        <button onClick={() => window.print()} className="bg-white text-emerald-900 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-sm">
          <Printer className="h-5 w-5" /> {t('Print Report', lang)}
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider">{t('DFO RPAS Flight Log - Mission Report', lang)}</h1>
          <p className="text-sm text-slate-600 mt-1">{t('Mission ID', lang)}: {mission.id}</p>
          <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
            <p>{t('Compliant with CARs Part IX - TC and DFO Policy Draft', lang)}</p>
            <p>{t('Regional RPAS program coordinator: Philip Bouma', lang)}</p>
            <p>{t('Chief of Enforcement Operations: Ulysse Brideau', lang)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">{t('Location & Time', lang)}</h3>
            <p className="text-sm mb-1"><strong>Site:</strong> {mission.location}</p>
            <p className="text-sm mb-1"><strong>{t('Start:', lang)}</strong> {formatDateTime24h(mission.start)}</p>
            <p className="text-sm mb-1"><strong>{t('End:', lang)}</strong> {formatDateTime24h(mission.end)}</p>
            <p className="text-sm mb-1"><strong>{t('Primary GPS', lang)}:</strong> {mission.coords?.lat || t('N/A', lang)}, {mission.coords?.lng || t('N/A', lang)}</p>
            {(mission.secondaryLat || mission.secondaryLng) && (
              <p className="text-sm mb-1"><strong>{t('Ref GPS', lang)}:</strong> {mission.secondaryLat}, {mission.secondaryLng} ({mission.referenceGpsUnit})</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">{t('Operational Resources', lang)}</h3>
            <p className="text-sm mb-1"><strong>{t('Pilot In Command', lang)}:</strong> {mission.pilot}</p>
            <p className="text-sm mb-1"><strong>{t('Additional Pilots', lang)}:</strong> {Array.isArray(mission.additionalPilots) ? mission.additionalPilots.join(', ') : t('None', lang)}</p>
            <p className="text-sm mb-1"><strong>{t('Camera Operators', lang)}:</strong> {Array.isArray(mission.cameraOperators) ? mission.cameraOperators.join(', ') : t('None', lang)}</p>
            <p className="text-sm mb-1"><strong>{t('Observers', lang)}:</strong> {Array.isArray(mission.observers) ? mission.observers.join(', ') : (mission.observer || t('None', lang))}</p>
            <p className="text-sm mb-1 mt-2"><strong>RPAS:</strong> {Array.isArray(mission.rpas) ? mission.rpas.join(', ') : (mission.rpas || t('N/A', lang))}</p>
            <p className="text-sm mb-1"><strong>{t('Op Category', lang)}:</strong> {mission.opCategory || t('N/A', lang)}</p>
            <p className="text-sm mb-1"><strong>{t('Payload', lang)}:</strong> {Array.isArray(mission.payload) ? mission.payload.join(', ') : (mission.payload || t('N/A', lang))}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">{t('Mission Details', lang)}</h3>
            <p className="text-sm mb-1"><strong>Type:</strong> {mission.type}</p>
            <p className="text-sm mb-1"><strong>{t('Work Elements', lang)}:</strong> {Array.isArray(mission.workElements) ? mission.workElements.join(', ') : (mission.workElement || t('N/A', lang))}</p>
            <p className="text-sm mb-1"><strong>{t('Flights', lang)}:</strong> {mission.flightCount || 1}</p>
            <p className="text-sm mb-1"><strong>Distance:</strong> {mission.distance || t('N/A', lang)} km</p>
            <p className="text-sm mb-1"><strong>{t('Airspace', lang)}:</strong> {mission.airspace} ({mission.airspaceType})</p>
            <p className="text-sm mb-1"><strong>{t('Aerodromes within 100km', lang)}:</strong><br/><span style={{whiteSpace: 'pre-wrap'}}>{mission.aerodromesWithin100km ? mission.aerodromesWithin100km : (Array.isArray(mission.aerodromesInfo) ? mission.aerodromesInfo.join(', ') : (mission.aerodromesInfo || t('None', lang)))}</span></p>
            <p className="text-sm mb-1 mt-2"><strong>NOTAMS:</strong> {mission.notams || t('None', lang)}</p>
            <p className="text-sm mb-1"><strong>NavCan Ref:</strong> {mission.navCanRef || t('N/A', lang)}</p>
            <p className="text-sm mb-1 mt-2"><strong>{t('Approach Alt', lang)}:</strong> {mission.approachAlt || t('N/A', lang)}, <strong>Route:</strong> {mission.approachRoute ? t(mission.approachRoute, lang) : t('N/A', lang)}</p>
            <p className="text-sm mb-1"><strong>{t('Emergency Landing Site', lang)}:</strong> {mission.emergencySite || t('N/A', lang)}</p>
            <p className="text-sm mb-1 mt-2"><strong>{t('Description / Objectives', lang)}:</strong> {mission.description || t('N/A', lang)}</p>
          </div>
          <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">{t('WEATHER CONDITIONS', lang)}</h3>
             <p className="text-sm mb-1"><strong>Temp:</strong> {mission.temperature ? `${mission.temperature}°C` : t('N/A', lang)}</p>
             <p className="text-sm mb-1"><strong>Wind:</strong> {mission.windSpeed ? `${mission.windSpeed} km/h ${mission.windDir ? t(mission.windDir, lang) : ''}` : t('N/A', lang)}</p>
             <p className="text-sm mb-1"><strong>{t('Visibility (km)', lang)}:</strong> {mission.visibility ? t(mission.visibility, lang) : t('N/A', lang)}</p>
             <p className="text-sm mb-1 mt-2"><strong>{t('Weather Notes', lang)}:</strong> {mission.weatherText || t('None', lang)}</p>
             
             <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2 mt-4">{t('AFTER MISSION REPORT', lang)}</h3>
             <p className="text-sm mb-1"><strong>{t('Preflight Checked', lang)}:</strong> {mission.preflightCompleted ? t('Yes', lang) : t('No', lang)}</p>
             <p className="text-sm mb-1"><strong>{t('Issues', lang)}:</strong> {mission.preflightIssues || t('None', lang)}</p>
             <p className="text-sm mb-1"><strong>{t('Outcomes', lang)}:</strong> {mission.outcomesSummary || t('None', lang)}</p>
             <p className="text-sm mb-1"><strong>{t('Maintenance', lang)}:</strong> {mission.incidentsMaintenance || t('None', lang)}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">{t('Risk Assessment', lang)}</h3>
          {(!mission.risks || Object.keys(mission.risks).filter(k => mission.risks[k].checked).length === 0) ? (
            <p className="text-sm italic text-slate-500">{t('No risks flagged.', lang)}</p>
          ) : (
            <table className="w-full text-sm border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left">{t('Risk Factor', lang)}</th>
                  <th className="border border-slate-300 p-2 text-left w-24">{t('Risk Level', lang)}</th>
                  <th className="border border-slate-300 p-2 text-left">{t('Mitigation Strategy', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(mission.risks).filter(([_, v]) => v.checked).map(([k, v]) => (
                  <tr key={k}>
                    <td className="border border-slate-300 p-2 font-medium">{t(k, lang)}</td>
                    <td className="border border-slate-300 p-2">{t(v.level || '-', lang)}</td>
                    <td className="border border-slate-300 p-2">{v.mitigation || t('None specified', lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {mission.sketch && (
            <div className="page-break-inside-avoid">
              <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">{t('Mission Area Map', lang)}</h3>
              <img src={mission.sketch} alt="Mission Map" className="w-full max-h-[500px] object-contain border border-slate-300 rounded p-2" />
            </div>
          )}
          {mission.weatherImage && (
            <div className="page-break-inside-avoid">
              <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">{t('Weather Forecast / Screenshot', lang)}</h3>
              <img src={mission.weatherImage} alt="Weather Screenshot" className="w-full max-h-[500px] object-contain border border-slate-300 rounded p-2" />
            </div>
          )}
          {mission.navCanFile && (
            <div className="page-break-inside-avoid">
              <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200 mb-2">{t('NAV Canada Authorization File', lang)}</h3>
              <img src={mission.navCanFile} alt="NAV Canada File" className="w-full max-h-[500px] object-contain border border-slate-300 rounded p-2" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const Dashboard = ({ missions, onCreateNew, onDelete, onEdit, onExport, onExportFull, onManageLists, onBackup, onRestore, onPrint, scrollRef, lang, onToggleLang }) => {
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
                {t('DFO RPAS FLIGHT LOG', lang)}
              </h1>
              <p className="text-xs text-emerald-200 mt-1 uppercase tracking-widest">
                {t('Fishery Officer Field Unit', lang)}
              </p>
            </div>
          </div>
        </header>
        
        <div className="bg-slate-300 p-4 rounded-md shadow-sm text-[10px] text-slate-700 uppercase font-bold tracking-wider space-y-1">
          <p>{t('Compliant with CARs Part IX - TC and DFO Policy Draft', lang)}</p>
          <p>{t('Regional RPAS program coordinator: Philip Bouma', lang)}</p>
          <p>{t('Chief of Enforcement Operations: Ulysse Brideau', lang)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button onClick={onExport} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><FileText className="h-4 w-4 text-emerald-600" /> {t('CSV Report', lang)}</button>
        <button onClick={onExportFull} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><Globe className="h-4 w-4 text-purple-600" /> {t('Full Report', lang)}</button>
        <button onClick={onManageLists} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><List className="h-4 w-4 text-indigo-600" /> {t('Saved Lists', lang)}</button>
        <button onClick={onBackup} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm"><Database className="h-4 w-4 text-blue-600" /> {t('Backup Data', lang)}</button>
        <label className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm cursor-pointer">
          <Upload className="h-4 w-4 text-amber-600" /> {t('Restore Data', lang)}
          <input type="file" accept=".json" onChange={onRestore} className="hidden" />
        </label>
        <button onClick={onToggleLang} className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-3 rounded-md font-bold flex flex-col items-center justify-center text-xs gap-1 border border-slate-200 shadow-sm">
          <Globe className="h-4 w-4 text-teal-600" /> {lang === 'en' ? 'Français' : 'English'}
        </button>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onCreateNew} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-md shadow-md font-bold flex items-center justify-center gap-2 text-md"><Plus className="h-5 w-5" /> {t('NEW MISSION', lang)}</button>
      </div>

      <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
        {t('Note: Backup your data often', lang)}
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
         <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
         <input 
           type="text" 
           placeholder={t("Search all mission data...", lang)} 
           className="w-full pl-10 p-3 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      <div className="border-b border-slate-200 pb-2 flex justify-between items-end">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{t('Recorded Missions', lang)}</h2>
        <span className="text-xs text-slate-400">{filteredMissions.length} {t('RECORDS', lang)}</span>
      </div>

      {filteredMissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-md border-2 border-dashed border-slate-200"><Crosshair className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">{t('No mission data found.', lang)}</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {filteredMissions.map((mission, index) => {
            const visualRefNum = filteredMissions.length - index;
            
            return (
              <div key={mission.id} className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row">
                <div className="bg-slate-100 w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-200">
                  {mission.sketch ? <img src={mission.sketch} alt="Map" className="w-full h-full object-cover" /> : <div className="text-slate-300 flex flex-col items-center"><ImageIcon className="h-8 w-8 mb-1" /><span className="text-[10px] font-bold uppercase">{t('No Map', lang)}</span></div>}
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
                    <button onClick={() => onEdit(mission)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded text-xs font-bold uppercase border border-slate-200 flex items-center justify-center gap-1 transition-colors"><Edit2 className="h-3 w-3" /> {t('Edit', lang)}</button>
                    <button onClick={() => onPrint(mission)} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded text-xs font-bold uppercase border border-emerald-200 flex items-center justify-center gap-1 transition-colors"><Printer className="h-3 w-3" /> {t('Print', lang)}</button>
                    <button onClick={() => onDelete(mission.id)} className="flex-1 bg-white hover:bg-red-50 text-red-600 py-2 rounded text-xs font-bold uppercase border border-red-100 flex items-center justify-center gap-1 transition-colors"><Trash2 className="h-3 w-3" /> {t('Delete', lang)}</button>
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
  const [lang, setLang] = useState(() => localStorage.getItem('dfo_app_lang') || 'en');
  const [view, setView] = useState('dashboard');
  const [missions, setMissions] = useState([]);
  const [editingMission, setEditingMission] = useState(null);
  const [lists, setLists] = useState(DEFAULT_LISTS);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const dashboardScrollRef = useRef(0);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'fr' : 'en';
    setLang(newLang);
    localStorage.setItem('dfo_app_lang', newLang);
  };

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
             observers: savedLists.value.observers || DEFAULT_LISTS.observers,
             aerodromesInfo: savedLists.value.aerodromesInfo || DEFAULT_LISTS.aerodromesInfo
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
    } catch (error) { alert(t("Failed to save.", lang)); }
  };

  const handleEditStart = (mission) => { setEditingMission(mission); setView('form'); };

  const handleDeleteMission = async (id) => {
    if (confirm(t("Are you sure you want to delete this mission record?", lang))) {
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
          const confirmMsg = lang === 'fr' ? `Restaurer ${data.missions.length} missions ? Cela écrasera les données actuelles.` : `Restore ${data.missions.length} missions? This will overwrite current data.`;
          if(confirm(confirmMsg)) {
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
             alert(t("Restored successfully.", lang));
          }
        } else alert(t("Invalid backup file.", lang));
      } catch (err) { alert(t("Error reading file.", lang)); }
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
          onExport={() => exportToCSV(missions, lang)}
          onExportFull={() => exportToHTML(missions, lang)}
          onManageLists={() => setView('saved-lists')}
          onBackup={() => backupData(missions, lists)}
          onRestore={handleRestore}
          onPrint={(mission) => { setEditingMission(mission); setView('print'); }}
          scrollRef={dashboardScrollRef}
          lang={lang}
          onToggleLang={toggleLang}
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
          lang={lang}
        />
      )}
      {view === 'print' && (
        <PrintMissionView 
          mission={editingMission} 
          onBack={() => { setView('dashboard'); }} 
          lang={lang}
        />
      )}
      {view === 'saved-lists' && (
        <SavedListsView 
          lists={lists} 
          onUpdateBulkLists={handleUpdateBulkLists} 
          onBack={() => setView('dashboard')} 
          lang={lang}
        />
      )}
      
      {/* Android Install Prompt */}
      {deferredPrompt && (
        <button onClick={handleInstall} className="fixed bottom-4 right-4 z-50 bg-emerald-900 text-white px-4 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 hover:bg-emerald-950 transition-all border-2 border-emerald-400 animate-bounce">
          <Download className="h-5 w-5" /> {t("INSTALL APP", lang)}
        </button>
      )}

      {/* Custom iOS Install Prompt */}
      {showIosPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 text-white p-4 shadow-2xl flex items-start gap-3 border-t border-slate-700" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <div className="flex-1">
            <p className="font-bold text-sm mb-1">{t("Install DFO RPAS Log", lang)}</p>
            <p className="text-slate-300 text-xs">
               {t("To install this app on your iPhone, tap the ", lang)} 
               <strong>Share</strong> 
               {t(" icon below, then select ", lang)} 
               <strong>{t("Add to Home Screen", lang)}</strong>.
            </p>
          </div>
          <button onClick={() => setShowIosPrompt(false)} className="text-slate-400 hover:text-white px-2 font-bold uppercase text-xs">
            {t("CLOSE", lang)}
          </button>
        </div>
      )}
    </div>
  );
}