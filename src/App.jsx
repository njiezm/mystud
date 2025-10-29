import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, BookOpen, User, Trash2, Plus, Search, ChevronDown, ChevronUp, File, Video, Mic, Link, Save, X, Eye, LogOut, Moon, Sun, Menu
} from 'lucide-react';

// --- Constantes et Utilitaires ---

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const STORAGE_KEY = 'studyPlatformData';
const AUTH_KEY = 'studyPlatformAuth';
const THEME_KEY = 'studyPlatformTheme';

const resourceTypes = [
  { key: 'texte', label: 'Texte/Note', icon: FileText },
  { key: 'pdf', label: 'Document PDF', icon: File },
  { key: 'image', label: 'Image', icon: File },
  { key: 'audio', label: 'Fichier Audio', icon: Mic },
  { key: 'video', label: 'Fichier Vidéo', icon: Video },
  { key: 'url', label: 'Lien URL', icon: Link },
];

const USERS = {
  'njie': { password: 'dsPb$et9gz3', role: 'student', name: 'Njie (Étudiant)' },
  'admin': { password: 'aDmin$', role: 'student', name: 'Admin (Étudiant)' }, // Traité comme un étudiant standard
  'xav': { password: 'sdFJ=jd$sg7s4', role: 'tutor', name: 'Xav (Tuteur)' },
};

// Utilisateur cible pour les remarques du tuteur
const TARGET_STUDENT_ID = 'njie';

// Fonction utilitaire pour la conversion Base64 en ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  try {
    const binaryString = atob(base64.split(',')[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error("Erreur de conversion Base64:", e);
    return new ArrayBuffer(0);
  }
};

// Fonction utilitaire pour créer une URL Blob
const createBlobUrl = (base64, mimeType) => {
  const arrayBuffer = base64ToArrayBuffer(base64);
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return URL.createObjectURL(blob);
};

// Composant pour l'ajout et l'affichage des remarques
const RemarkSection = ({ remarks, onAddRemark, currentUserId, contentOwnerId }) => {
  const [newRemark, setNewRemark] = useState('');
  const isTutor = USERS[currentUserId]?.role === 'tutor';
  const isTargetContent = contentOwnerId === TARGET_STUDENT_ID;
  const showRemarkForm = isTutor && isTargetContent;
  const primaryColor = isTutor ? 'red' : 'indigo'; // Pour les remarques du tuteur

  return (
    <div className="mt-4 pt-4 border-t border-gray-600">
      <h5 className="text-lg font-bold text-red-400 mb-2">Remarques du Tuteur ({remarks.length})</h5>

      {/* Afficher les remarques existantes */}
      <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
        {remarks.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Aucune remarque pour l'instant.</p>
        ) : (
          remarks.map((remark, index) => (
            <div key={index} className="bg-red-900/40 p-3 rounded-lg border-l-4 border-red-500">
              <p className="text-red-200 text-sm">{remark.content}</p>
              <span className="text-xs text-red-400/70 block mt-1">Par {USERS[remark.authorId]?.name} le {remark.timestamp}</span>
            </div>
          ))
        )}
      </div>

      {/* Formulaire d'ajout de remarque (visible uniquement par le tuteur sur le contenu de njie) */}
      {showRemarkForm && (
        <div className="space-y-2">
          <textarea
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
            placeholder="Ajouter une remarque en tant que Tuteur..."
            className="w-full bg-gray-700 text-white p-3 rounded-lg border border-red-600 focus:ring-red-500 focus:border-red-500 h-20 resize-none"
          />
          <button
            onClick={() => { onAddRemark(newRemark); setNewRemark(''); }}
            disabled={newRemark.trim() === ''}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 text-sm"
          >
            Ajouter Remarque
          </button>
        </div>
      )}
      {!isTargetContent && isTutor && <p className="text-yellow-500 text-sm italic">Vous ne pouvez ajouter des remarques qu'au contenu de {USERS[TARGET_STUDENT_ID].name}.</p>}
    </div>
  );
};


// --- Composant d'Affichage des Ressources ---

const ResourceViewer = ({ resource, onClose, currentUserId }) => {
  if (!resource) return null;

  const { title, type, contentData, mimeType, description, ownerId } = resource;
  let viewerContent;

  const downloadFile = () => {
    if (contentData) {
      const link = document.createElement('a');
      link.href = contentData;
      link.download = title || 'resource_file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Affichage basé sur le type de ressource
  switch (type) {
    case 'pdf':
    case 'image':
    case 'audio':
    case 'video':
      // Pour les fichiers, on crée l'URL blob si contentData est une chaîne Base64
      if (contentData && contentData.startsWith('data:')) {
        const url = type === 'pdf' ? createBlobUrl(contentData, 'application/pdf') : contentData; // Use direct Base64 if possible
        const mediaClasses = "max-w-full max-h-[80vh] mx-auto rounded-lg shadow-xl";
        if (type === 'pdf') {
             viewerContent = (
              <object data={url} type="application/pdf" className="flex-grow min-h-0 w-full rounded-lg shadow-xl" aria-label={`Visualiseur de ${title}`}>
                <p className="text-white text-center p-4">Votre navigateur ne peut pas afficher ce PDF. <button onClick={downloadFile} className="text-indigo-400 underline">Télécharger le fichier</button>.</p>
              </object>
            );
        } else if (type === 'image') {
            viewerContent = <img src={contentData} alt={title} className={mediaClasses + " object-contain"} />;
        } else if (type === 'audio') {
            viewerContent = <audio controls src={url} className="w-full mt-auto" aria-label={`Lecteur audio : ${title}`}></audio>;
        } else if (type === 'video') {
            viewerContent = <video controls src={url} className={mediaClasses} aria-label={`Lecteur vidéo : ${title}`}></video>;
        }
      } else {
        viewerContent = <p className="text-yellow-400 text-center">Contenu non disponible (fichier Base64 manquant ou format incorrect).</p>;
      }
      break;

    case 'url':
      viewerContent = (
        <iframe
          src={description} // description contient l'URL pour ce type
          title={title}
          className="flex-grow w-full min-h-0 bg-white border-0 rounded-lg shadow-xl"
          allowFullScreen
        ></iframe>
      );
      break;

    case 'texte':
    default:
      viewerContent = (
        <div className="flex-grow p-4 bg-gray-800 rounded-lg overflow-y-auto min-h-0">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-200">{description}</pre>
        </div>
      );
      break;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] bg-gray-900 rounded-xl shadow-2xl flex flex-col">
        {/* En-tête du Visualiseur */}
        <div className="p-4 flex justify-between items-center border-b border-indigo-700/50">
          <h2 className="text-2xl font-bold text-white truncate max-w-[80%]">{title}</h2>
          <div className="flex space-x-2">
            {contentData && type !== 'url' && type !== 'texte' && (
               <button
                onClick={downloadFile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-full transition duration-150 shadow-lg flex items-center text-sm"
              >
                Télécharger
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition duration-150 shadow-lg"
              aria-label="Fermer le visualiseur"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenu du Visualiseur */}
        <div className="flex-grow overflow-hidden p-4">
          {viewerContent}
        </div>
      </div>
    </div>
  );
};


// --- Composant de l'écran de connexion ---

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (USERS[username] && USERS[username].password === password) {
      onLogin(username);
      setError('');
    } else {
      setError('Nom d\'utilisateur ou mot de passe incorrect.');
      setPassword('');
    }
  };

  const themeClasses = "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300";

  return (
    <div className={`flex items-center justify-center h-screen ${themeClasses}`}>
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl space-y-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-black text-center text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <BookOpen size={30} className="mr-2"/> Plateforme d'Étude
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400">Connectez-vous pour accéder à vos ressources.</p>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative text-sm" role="alert">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom d'utilisateur</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="njie, admin ou xav"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition duration-150 shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50"
        >
          Se Connecter
        </button>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t dark:border-gray-700">
            <p>Comptes de test:</p>
            <ul className="mt-1 space-y-0.5">
                <li><span className="font-semibold">Njie:</span> njie / dsPb$et9gz3</li>
                <li><span className="font-semibold">Tuteur:</span> xav / sdFJ=jd$sg7s4</li>
            </ul>
        </div>
      </form>
    </div>
  );
};

// --- Le composant principal de l'application ---

const App = () => {
  const [data, setData] = useState({ subjects: [], notes: [], assignments: [] });
  const [currentSubject, setCurrentSubject] = useState(null);
  const [currentView, setCurrentView] = useState('resources');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [viewedResource, setViewedResource] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // État pour mobile

  // États d'Authentification et Thème
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('dark'); // 'dark' ou 'light'

  // États de Saisie
  const [newSubjectName, setNewSubjectName] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [noteMessage, setNoteMessage] = useState('');
  const [resourceForm, setResourceForm] = useState({
    title: '', type: 'pdf', description: '', file: null, fileData: null, mimeType: '', uploading: false, error: '',
  });

  const currentUserId = currentUser?.id;
  const currentUserRole = currentUser?.role;

  // --- Effet de chargement initial (localStorage) ---
  useEffect(() => {
    try {
      // 1. Charger le thème
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme) setTheme(storedTheme);
      
      // 2. Tenter de charger l'authentification
      const storedAuth = localStorage.getItem(AUTH_KEY);
      if (storedAuth) setCurrentUser(JSON.parse(storedAuth));

      // 3. Charger les données de la plateforme
      const storedData = localStorage.getItem(STORAGE_KEY);
      let parsedData = { subjects: [], notes: [], assignments: [] };
      if (storedData) {
        parsedData = JSON.parse(storedData);
      } else {
        // Initialiser avec un sujet par défaut
        const defaultSubject = { id: Date.now(), name: 'Introduction au React', ownerId: TARGET_STUDENT_ID, resources: [] };
        parsedData.subjects = [defaultSubject];
      }
      setData(parsedData);
      
      // 4. Restaurer le sujet actuel
      const initialSubject = parsedData.subjects.find(s => s.id === localStorage.getItem('currentSubjectId')) || parsedData.subjects[0];
      setCurrentSubject(initialSubject);

    } catch (e) {
      console.error("Erreur de chargement LocalStorage:", e);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // --- Effet de sauvegarde (localStorage) et Thème ---
  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (currentSubject) localStorage.setItem('currentSubjectId', currentSubject.id);
      if (currentUser) localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
      localStorage.setItem(THEME_KEY, theme);

      // Appliquer la classe de thème à l'élément HTML
      document.documentElement.className = theme;
    }
  }, [data, isDataLoaded, currentSubject, currentUser, theme]);

  // --- Handlers Auth et Thème ---

  const handleLogin = (userId) => {
    const user = { id: userId, ...USERS[userId] };
    setCurrentUser(user);
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // --- Filtrage des données (Memoization) ---

  const filteredData = useMemo(() => {
    if (!currentSubject) return { notes: [], assignments: [], resources: [] };

    // Filtre principal : Seulement le contenu créé par l'utilisateur ciblé (njie) ou l'utilisateur actuel
    // Le tuteur 'xav' peut voir tout le contenu de njie (TARGET_STUDENT_ID)
    const contentFilterId = currentUserRole === 'tutor' ? TARGET_STUDENT_ID : currentUserId;

    const notes = data.notes
      .filter(note => note.subjectId === currentSubject.id && (note.ownerId === contentFilterId || note.ownerId === currentUserId))
      .sort((a, b) => b.id - a.id); // Les plus récents en premier

    const assignments = data.assignments
      .filter(assignment => assignment.subjectId === currentSubject.id && (assignment.ownerId === contentFilterId || assignment.ownerId === currentUserId))
      .sort((a, b) => b.id - a.id);

    const resources = data.subjects.find(s => s.id === currentSubject.id)?.resources || [];

    return { notes, assignments, resources };
  }, [data.notes, data.assignments, data.subjects, currentSubject, currentUserId, currentUserRole]);

  const { notes: currentNotes, assignments: currentAssignments, resources: currentResources } = filteredData;


  // --- Handlers Matières (CRUD) ---

  const handleAddSubject = () => {
    const name = newSubjectName.trim();
    if (name && !data.subjects.find(s => s.name === name)) {
      const newSubject = { id: Date.now(), name: name, ownerId: currentUserId, resources: [] };
      setData(prev => ({ ...prev, subjects: [...prev.subjects, newSubject] }));
      setCurrentSubject(newSubject);
      setNewSubjectName('');
    }
  };

  const handleDeleteSubject = (idToDelete) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette matière et toutes ses données associées ?")) {
      const remainingSubjects = data.subjects.filter(s => s.id !== idToDelete);
      setData(prev => ({
        subjects: remainingSubjects,
        notes: prev.notes.filter(n => n.subjectId !== idToDelete),
        assignments: prev.assignments.filter(a => a.subjectId !== idToDelete),
      }));
      if (currentSubject && currentSubject.id === idToDelete) {
        setCurrentSubject(remainingSubjects.length > 0 ? remainingSubjects[0] : null);
      }
    }
  };

  // --- Handlers Notes (Correction du Focus) ---

  const handleSaveNote = () => {
    if (!currentSubject || currentNote.trim() === '') return;

    const newNote = {
      id: Date.now(),
      subjectId: currentSubject.id,
      content: currentNote.trim(),
      timestamp: new Date().toLocaleString('fr-FR'),
      ownerId: currentUserId, // Associer la note à l'utilisateur
      remarks: [], // Nouveau champ pour les remarques
    };

    setData(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
    setCurrentNote(''); // Effacer la zone de saisie
    setNoteMessage('Note enregistrée avec succès !');
    setTimeout(() => setNoteMessage(''), 3000);
  };

  const handleAddNoteRemark = (noteId, remarkContent) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? {
              ...note,
              remarks: [...note.remarks, {
                content: remarkContent,
                authorId: currentUserId,
                timestamp: new Date().toLocaleDateString('fr-FR'),
              }]
            }
          : note
      )
    }));
  };

  const handleDeleteNote = (idToDelete) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== idToDelete)
    }));
  };

  // --- Handlers Devoirs (Correction du Focus) ---

  const handleAddAssignment = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title').trim();
    const details = formData.get('details').trim();
    const fileInput = e.target.elements.assignmentFile;
    const file = fileInput.files[0];

    if (!title) return;

    let fileInfo = null;
    if (file && file.size > MAX_FILE_SIZE) {
        alert(`Le fichier du devoir est trop grand. Max ${MAX_FILE_SIZE / (1024 * 1024)} Mo.`);
        return;
    } else if (file) {
      fileInfo = { name: file.name, type: file.type, size: (file.size / 1024 / 1024).toFixed(2) + ' Mo' };
    }

    const newAssignment = {
      id: Date.now(),
      subjectId: currentSubject.id,
      title,
      details,
      fileInfo,
      date: new Date().toLocaleDateString('fr-FR'),
      ownerId: currentUserId, // Associer le devoir à l'utilisateur
      remarks: [], // Nouveau champ pour les remarques
    };

    setData(prev => ({ ...prev, assignments: [newAssignment, ...prev.assignments] }));
    e.target.reset(); // Réinitialiser le formulaire
  };

  const handleAddAssignmentRemark = (assignmentId, remarkContent) => {
    setData(prev => ({
      ...prev,
      assignments: prev.assignments.map(assignment =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              remarks: [...assignment.remarks, {
                content: remarkContent,
                authorId: currentUserId,
                timestamp: new Date().toLocaleDateString('fr-FR'),
              }]
            }
          : assignment
      )
    }));
  };

  const handleDeleteAssignment = (idToDelete) => {
    setData(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== idToDelete)
    }));
  };

  // --- Handlers Ressources (Ajout/Suppression) ---

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setResourceForm(prev => ({ ...prev, file: null, fileData: null, error: `Le fichier est trop grand. Max ${MAX_FILE_SIZE / (1024 * 1024)} Mo.` }));
        return;
      }

      setResourceForm(prev => ({ ...prev, file, error: '', mimeType: file.type }));

      const reader = new FileReader();
      reader.onloadstart = () => setResourceForm(prev => ({ ...prev, uploading: true }));
      reader.onloadend = () => {
        setResourceForm(prev => ({
          ...prev,
          fileData: reader.result,
          uploading: false,
        }));
      };
      reader.onerror = () => {
        setResourceForm(prev => ({ ...prev, uploading: false, fileData: null, error: "Erreur de lecture du fichier." }));
      };
      reader.readAsDataURL(file);
    } else {
      setResourceForm(prev => ({ ...prev, file: null, fileData: null, mimeType: '' }));
    }
  };

  const handleResourceFormChange = (e) => {
    const { name, value } = e.target;
    setResourceForm(prev => ({ ...prev, [name]: value }));
    if (name === 'type' && (value === 'texte' || value === 'url')) {
        setResourceForm(prev => ({ ...prev, file: null, fileData: null, mimeType: '' }));
    }
  };

  const handleAddResource = (e) => {
    e.preventDefault();
    if (!currentSubject || !resourceForm.title.trim()) return;

    const { title, type, description, fileData, mimeType } = resourceForm;
    let resourceContent = description.trim();

    // Logique de contenu : Le Base64 ou la description deviennent le contenu réel
    if (type !== 'url' && type !== 'texte' && !fileData) {
      setResourceForm(prev => ({ ...prev, error: "Veuillez joindre un fichier ou choisir le type Texte/URL." }));
      return;
    }
    // Pour les fichiers, le contenuData est le Base64
    const contentDataFile = (type !== 'url' && type !== 'texte') ? fileData : null;

    const newResource = {
      id: Date.now(),
      title: title.trim(),
      type: type,
      description: resourceContent, // Contient le texte ou l'URL pour URL/TEXTE
      contentData: contentDataFile, // Contient le Base64 pour les fichiers
      mimeType: mimeType,
      dateAdded: new Date().toLocaleDateString('fr-FR'),
      ownerId: currentSubject.ownerId, // La ressource appartient à la matière (du créateur)
    };

    // Mettre à jour la matière
    setData(prev => ({
      ...prev,
      subjects: prev.subjects.map(subject =>
        subject.id === currentSubject.id
          ? { ...subject, resources: [...subject.resources, newResource] }
          : subject
      )
    }));

    // Réinitialiser le formulaire
    setResourceForm({ title: '', type: 'pdf', description: '', file: null, fileData: null, mimeType: '', uploading: false, error: '' });
  };

  const handleDeleteResource = (resourceId) => {
    setData(prev => ({
      ...prev,
      subjects: prev.subjects.map(subject =>
        subject.id === currentSubject.id
          ? { ...subject, resources: subject.resources.filter(r => r.id !== resourceId) }
          : subject
      )
    }));
  };

  // --- Classes Thématiques (Dark/Light) ---
  const themeClasses = {
    bg: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    sidebarBg: theme === 'dark' ? 'bg-gray-800 border-r border-gray-700' : 'bg-gray-200 border-r border-gray-300',
    headerBg: theme === 'dark' ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200',
    contentBg: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-md border border-gray-200',
    inputBg: theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300',
    tabBg: theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100',
  };

  // --- Rendu conditionnel et principal ---

  if (!isDataLoaded) return <div className="p-8 text-center text-indigo-600">Chargement de la plateforme...</div>;
  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;
  
  // Utilitaire pour trouver l'icône
  const getResourceIcon = (type) => {
      const typeDef = resourceTypes.find(t => t.key === type);
      return typeDef ? typeDef.icon : File;
  };

  // --- Rendu de la vue principale (selon l'onglet) ---

  const renderMainView = () => {
    if (!currentSubject) {
      return (
        <div className={`text-center p-10 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
          Veuillez ajouter une matière pour commencer.
        </div>
      );
    }

    // Le contenu visible est le contenu de l'utilisateur ciblé (njie) ou le contenu de l'utilisateur actuel
    const isTargetView = currentUserRole === 'tutor' && currentUserId !== TARGET_STUDENT_ID;
    const contentOwnerLabel = isTargetView ? USERS[TARGET_STUDENT_ID].name : 'Vous';

    switch (currentView) {
      case 'resources':
        return (
          <div className="space-y-6">
            <h2 className={`text-3xl font-extrabold text-indigo-400 border-b border-indigo-500/50 pb-2`}>Ressources de Cours ({contentOwnerLabel})</h2>

            {/* Formulaire d'ajout de ressources - Non disponible pour la vue Tuteur */}
            {!isTargetView && (
              <form onSubmit={handleAddResource} className={`${themeClasses.cardBg} p-6 rounded-xl shadow-lg space-y-4`}>
                <h3 className={`text-xl font-semibold text-indigo-400 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} pb-2 flex items-center`}>
                  <Plus size={20} className="mr-2"/> Ajouter une Nouvelle Ressource
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="title"
                    placeholder="Titre de la ressource (ex: Chapitre 3 - Modèles)"
                    value={resourceForm.title}
                    onChange={handleResourceFormChange}
                    className={`p-3 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${themeClasses.inputBg}`}
                    required
                  />
                  <select
                    name="type"
                    value={resourceForm.type}
                    onChange={handleResourceFormChange}
                    className={`p-3 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${themeClasses.inputBg}`}
                  >
                    {resourceTypes.map(type => (
                      <option key={type.key} value={type.key}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {(resourceForm.type === 'pdf' || resourceForm.type === 'image' || resourceForm.type === 'audio' || resourceForm.type === 'video') ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <label className={`font-medium whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Fichier (Max 5Mo)</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className={`block w-full text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-500 file:text-white
                        hover:file:bg-indigo-600 cursor-pointer
                      `}
                      required={resourceForm.type !== 'texte' && resourceForm.type !== 'url'}
                    />
                    {resourceForm.uploading && <span className="text-indigo-400 mt-2 sm:mt-0">Lecture en cours...</span>}
                  </div>
                ) : (
                  <textarea
                    name="description"
                    placeholder={resourceForm.type === 'url' ? "Collez l'URL complète ici (ex: https://youtube.com/...)" : "Contenu de la note / du texte"}
                    value={resourceForm.description}
                    onChange={handleResourceFormChange}
                    className={`w-full p-3 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 h-24 resize-none ${themeClasses.inputBg}`}
                    required
                  />
                )}

                {resourceForm.error && (
                  <p className="text-red-400 text-sm font-semibold p-2 bg-red-900/50 rounded-lg">
                    Erreur : {resourceForm.error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition duration-150 shadow-md flex justify-center items-center disabled:opacity-50"
                  disabled={resourceForm.uploading || !resourceForm.title || (resourceForm.type !== 'texte' && resourceForm.type !== 'url' && !resourceForm.file)}
                >
                  <Save size={20} className="mr-2"/> Enregistrer la Ressource
                </button>
              </form>
            )}


            {/* Liste des ressources */}
            <div className="mt-8 space-y-4">
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  Liste des Ressources ({currentResources.length})
              </h3>
              {currentResources.length === 0 ? (
                <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    Aucune ressource pour cette matière.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currentResources.map(resource => {
                    const Icon = getResourceIcon(resource.type);
                    return (
                      <div key={resource.id} className={`${themeClasses.cardBg} p-4 rounded-xl shadow-lg flex flex-col justify-between hover:ring-2 hover:ring-indigo-500 transition duration-200`}>
                        <div className="flex items-center space-x-3 mb-3">
                          <Icon size={24} className="text-indigo-400 flex-shrink-0" />
                          <div className="flex-grow">
                            <h4 className={`text-lg font-semibold ${themeClasses.text} truncate`}>{resource.title}</h4>
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} capitalize`}>
                                {resourceTypes.find(t => t.key === resource.type)?.label || resource.type}
                            </span>
                          </div>
                        </div>

                        <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                           {resource.type === 'url' ? resource.description : (resource.contentData ? 'Contenu stocké (Base64)' : resource.description)}
                        </p>

                        <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-700">
                          <button
                            onClick={() => setViewedResource(resource)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-full text-sm font-medium flex items-center transition duration-150"
                          >
                            <Eye size={16} className="mr-1"/> Voir
                          </button>
                          {!isTargetView && (
                            <button
                              onClick={() => handleDeleteResource(resource.id)}
                              className="text-red-400 hover:text-red-500 transition duration-150 p-1 rounded-full hover:bg-gray-700"
                              aria-label={`Supprimer la ressource ${resource.title}`}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-6">
            <h2 className={`text-3xl font-extrabold text-indigo-400 border-b border-indigo-500/50 pb-2`}>
                Prise de Notes ({contentOwnerLabel})
            </h2>

            {/* Zone de saisie de notes - Non disponible pour la vue Tuteur */}
            {!isTargetView && (
              <div className={`${themeClasses.cardBg} p-6 rounded-xl shadow-lg space-y-3`}>
                <textarea
                  value={currentNote}
                  // FIX DU BUG DE FOCUS: Le state est géré ici dans le composant principal de manière stable.
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder={`Écrivez vos notes pour ${currentSubject.name} ici...`}
                  className={`w-full p-4 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 h-48 resize-none ${themeClasses.inputBg}`}
                />
                <button
                  onClick={handleSaveNote}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition duration-150 shadow-md flex items-center disabled:opacity-50"
                  disabled={currentNote.trim() === ''}
                >
                  <Save size={20} className="mr-2"/> Enregistrer la Note
                </button>
                {noteMessage && <p className="text-green-400 font-semibold mt-2">{noteMessage}</p>}
              </div>
            )}

            {/* Historique des notes */}
            <div className="mt-8 space-y-4">
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>Historique des Notes ({currentNotes.length})</h3>
              {currentNotes.length === 0 ? (
                <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    {isTargetView ? `Aucune note pour ${USERS[TARGET_STUDENT_ID].name}.` : "Aucune note enregistrée pour cette matière."}
                </p>
              ) : (
                <div className="space-y-4">
                  {currentNotes.map(note => (
                    <div key={note.id} className={`${themeClasses.cardBg} p-4 rounded-xl shadow-lg border-l-4 border-indigo-500`}>
                      <div className="flex justify-between items-start">
                        <p className={`whitespace-pre-wrap flex-grow ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>{note.content}</p>
                        {!isTargetView && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-red-400 hover:text-red-500 ml-4 transition duration-150 p-1 rounded-full hover:bg-gray-700 flex-shrink-0"
                            aria-label="Supprimer la note"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      <span className={`text-xs block mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Enregistré le {note.timestamp}</span>
                      
                      {/* Section Remarques */}
                      <RemarkSection
                          remarks={note.remarks}
                          onAddRemark={(content) => handleAddNoteRemark(note.id, content)}
                          currentUserId={currentUserId}
                          contentOwnerId={note.ownerId}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'assignments':
        return (
          <div className="space-y-6">
            <h2 className={`text-3xl font-extrabold text-indigo-400 border-b border-indigo-500/50 pb-2`}>
                Devoirs Rendus ({contentOwnerLabel})
            </h2>

            {/* Formulaire de dépôt de devoir - Non disponible pour la vue Tuteur */}
            {!isTargetView && (
              <form onSubmit={handleAddAssignment} className={`${themeClasses.cardBg} p-6 rounded-xl shadow-lg space-y-4`}>
                <h3 className={`text-xl font-semibold text-indigo-400 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} pb-2 flex items-center`}><Plus size={20} className="mr-2"/> Déposer un Devoir</h3>
                <input
                  type="text"
                  name="title"
                  placeholder="Titre du devoir (ex: Rapport Final)"
                  className={`w-full p-3 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 ${themeClasses.inputBg}`}
                  required
                />
                <textarea
                  name="details"
                  placeholder="Détails ou commentaires..."
                  className={`w-full p-3 rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 h-24 resize-none ${themeClasses.inputBg}`}
                />
                <div className="flex items-center space-x-4">
                  <label className={`font-medium whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Joindre un Fichier (Max 5 Mo)</label>
                  <input
                    type="file"
                    name="assignmentFile"
                    className={`block w-full text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-500 file:text-white
                      hover:file:bg-indigo-600 cursor-pointer
                    `}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition duration-150 shadow-md"
                >
                  Déposer
                </button>
              </form>
            )}

            {/* Liste des devoirs */}
            <div className="mt-8 space-y-4">
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>Devoirs Déposés ({currentAssignments.length})</h3>
              {currentAssignments.length === 0 ? (
                <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    {isTargetView ? `Aucun devoir déposé pour ${USERS[TARGET_STUDENT_ID].name}.` : "Aucun devoir déposé pour cette matière."}
                </p>
              ) : (
                <div className="space-y-4">
                  {currentAssignments.map(assignment => (
                    <div key={assignment.id} className={`${themeClasses.cardBg} p-4 rounded-xl shadow-lg border-l-4 border-green-500`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`text-xl font-semibold ${themeClasses.text}`}>{assignment.title}</h4>
                          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{assignment.details}</p>
                          {assignment.fileInfo && (
                            <div className="text-xs text-green-400 mt-2 bg-gray-700 p-2 rounded-md inline-block">
                              Fichier joint: {assignment.fileInfo.name} ({assignment.fileInfo.size})
                            </div>
                          )}
                        </div>
                        {!isTargetView && (
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="text-red-400 hover:text-red-500 ml-4 transition duration-150 p-1 rounded-full hover:bg-gray-700 flex-shrink-0"
                            aria-label="Supprimer le devoir"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      <span className={`text-xs block mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Déposé le {assignment.date}</span>

                       {/* Section Remarques */}
                       <RemarkSection
                          remarks={assignment.remarks}
                          onAddRemark={(content) => handleAddAssignmentRemark(assignment.id, content)}
                          currentUserId={currentUserId}
                          contentOwnerId={assignment.ownerId}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };


  return (
    <div className={`flex h-screen ${themeClasses.bg} ${themeClasses.text} transition-colors duration-300`}>
      
      {/* Visualiseur de ressources (Modal) */}
      {viewedResource && <ResourceViewer resource={viewedResource} onClose={() => setViewedResource(null)} currentUserId={currentUserId}/>}

      {/* Colonne latérale (Matières) */}
      <div className={`fixed inset-y-0 left-0 w-64 ${themeClasses.sidebarBg} flex-col z-40 transition-transform duration-300 transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <header className={`p-4 border-b ${theme === 'dark' ? 'border-indigo-700' : 'border-indigo-300'} bg-indigo-600 text-white flex justify-between items-center`}>
          <h1 className="text-2xl font-black flex items-center"><BookOpen size={24} className="mr-2"/> Plateforme</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 rounded-full hover:bg-indigo-500" aria-label="Fermer le menu">
            <X size={24} />
          </button>
        </header>

        {/* Formulaire d'ajout de matière - Seulement visible par les étudiants */}
        {currentUserRole !== 'tutor' && (
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} space-y-2`}>
              <h2 className={`text-md font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Ajouter une Matière</h2>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Nom de la matière"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                  className={`w-full text-sm p-2 rounded-l-lg border focus:ring-indigo-500 focus:border-indigo-500 ${themeClasses.inputBg}`}
                />
                <button
                  onClick={handleAddSubject}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-r-lg transition duration-150"
                  aria-label="Ajouter la matière"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
        )}

        {/* Liste des Matières */}
        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Mes Cours</h2>
          {data.subjects.length === 0 ? (
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} text-sm`}>Ajoutez votre premier cours ci-dessus.</p>
          ) : (
            data.subjects.filter(s => currentUserRole === 'tutor' ? s.ownerId === TARGET_STUDENT_ID : s.ownerId === currentUserId).map(subject => (
              <div
                key={subject.id}
                onClick={() => { setCurrentSubject(subject); setIsSidebarOpen(false); }}
                className={`flex justify-between items-center p-3 rounded-lg transition duration-150 cursor-pointer text-left
                  ${currentSubject && currentSubject.id === subject.id
                    ? 'bg-indigo-600 shadow-lg text-white font-semibold'
                    : `hover:bg-indigo-700/50 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-300'}`
                  }`}
              >
                <span className="flex-grow truncate">{subject.name}</span>
                {/* Bouton de suppression - Seulement pour le propriétaire étudiant */}
                {subject.ownerId === currentUserId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                    className={`ml-2 p-1 rounded-full transition duration-150 ${theme === 'dark' ? 'text-gray-500 hover:text-red-400' : 'text-gray-600 hover:text-red-600'}`}
                    aria-label={`Supprimer ${subject.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </nav>

        {/* Pied de page de la colonne latérale */}
        <footer className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} space-y-2`}>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center">
                <User size={18} className="mr-2 text-indigo-400"/>
                <span className="font-semibold">{currentUser?.name}</span>
            </div>
            <button
                onClick={handleLogout}
                className="flex items-center text-red-400 hover:text-red-500 p-1 rounded transition"
            >
                <LogOut size={16} className="mr-1"/> Déconnexion
            </button>
          </div>
          <p>Persistance des données locales (localStorage).</p>
        </footer>
      </div>

      {/* Overlay pour mobile */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"></div>}

      {/* Colonne principale (Contenu) */}
      <main className="flex-grow flex flex-col overflow-hidden">
        {/* En-tête du contenu */}
        <header className={`p-4 sm:p-6 ${themeClasses.headerBg} shadow-md flex justify-between items-center flex-shrink-0`}>
            <div className="flex items-center space-x-3">
                <button onClick={() => setIsSidebarOpen(true)} className={`md:hidden p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} aria-label="Ouvrir le menu">
                    <Menu size={24} className="text-indigo-500"/>
                </button>
                <h2 className="text-xl sm:text-3xl font-extrabold text-indigo-500 truncate max-w-[50vw]">
                  {currentSubject ? currentSubject.name : 'Sélectionnez une Matière'}
                </h2>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Toggle Thème */}
                <button onClick={toggleTheme} className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`} aria-label="Changer de thème">
                    {theme === 'dark' ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-gray-700" />}
                </button>
                <div className="hidden sm:flex items-center space-x-2">
                    <User size={24} className="text-indigo-400"/>
                    <span className={`text-lg font-medium ${themeClasses.text}`}>{currentUser?.name}</span>
                </div>
            </div>
        </header>

        {/* Barre de navigation des vues (Onglets) */}
        <nav className={`flex ${themeClasses.tabBg} p-2 shadow-inner flex-shrink-0`}>
          {['resources', 'notes', 'assignments'].map(view => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`flex-1 py-3 px-2 sm:px-4 text-sm sm:text-lg font-semibold rounded-lg transition duration-200 uppercase tracking-wider whitespace-nowrap
                ${currentView === view
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-200'}`}`
              }
            >
              {view === 'resources' ? 'Ressources' : view === 'notes' ? 'Notes' : 'Devoirs'}
            </button>
          ))}
        </nav>

        {/* Contenu principal de la vue */}
        <section className={`flex-grow p-4 sm:p-8 overflow-y-auto custom-scrollbar ${themeClasses.contentBg}`}>
          {renderMainView()}
        </section>

      </main>
    </div>
  );
};

export default App;
