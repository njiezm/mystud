import React, { useState, useEffect, useMemo } from 'react';
// Import des icônes utilisées pour l'interface
import { FileText, Headphones, Video, BookOpen, Edit, Send, Folder, Plus, Trash2, LayoutGrid, AlertTriangle, X, Eye, Download, Info, Zap } from 'lucide-react';

// Taille maximale autorisée pour un fichier en Base64 (5 MB - Limite pratique pour localStorage)
const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 100;

// --- GESTION DE LA PERSISTANCE VIA LOCALSTORAGE ---

/**
 * Charge les données depuis localStorage ou retourne les données par défaut.
 */
const getInitialData = (key, defaultData) => {
    try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
            // Utiliser un reviver pour reconvertir les dates
            return JSON.parse(storedData, (k, value) => {
                // Reconvertit les chaînes de dates ISO en objets Date
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                    return new Date(value);
                }
                return value;
            });
        }
    } catch (error) {
        // Gérer les erreurs de lecture (ex: données corrompues)
        console.error(`Erreur de lecture de la persistance pour ${key}:`, error);
    }
    return defaultData;
};

/**
 * Enregistre les données dans localStorage.
 */
const setPersistentData = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Erreur d'écriture de la persistance pour ${key}:`, error);
        // Alerte si l'espace de stockage est dépassé
        if (error.name === 'QuotaExceededError') {
             console.error("ERREUR CRITIQUE: Le stockage local est plein. Veuillez supprimer des ressources lourdes.");
        }
    }
};

// Composant principal de l'application
const App = () => {
    // États locaux chargés depuis la persistance au démarrage
    const [subjects, setSubjects] = useState(() => getInitialData('subjectsData', []));
    const [notes, setNotes] = useState(() => getInitialData('notesData', []));
    const [assignments, setAssignments] = useState(() => getInitialData('assignmentsData', []));
    const [currentSubject, setCurrentSubject] = useState(null);

    // Initialisation et sélection du premier sujet
    useEffect(() => {
        if (!currentSubject && subjects.length > 0) {
            setCurrentSubject(subjects[0]);
        } else if (currentSubject && !subjects.some(s => s.id === currentSubject.id)) {
            // Si le sujet actuel a été supprimé, sélectionner le premier
            setCurrentSubject(subjects[0] || null);
        }
    }, [subjects, currentSubject]);


    // --- Effets pour la Persistance (Sauvegarde automatique à chaque changement) ---
    useEffect(() => { setPersistentData('subjectsData', subjects); }, [subjects]);
    useEffect(() => { setPersistentData('notesData', notes); }, [notes]);
    useEffect(() => { setPersistentData('assignmentsData', assignments); }, [assignments]);

    // États UI
    const [currentView, setCurrentView] = useState('resources');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [viewingResource, setViewingResource] = useState(null); 
    const [newResource, setNewResource] = useState({
        title: '',
        type: 'pdf',
        file: null, // Pour le dépôt réel
        description: '',
    });
    const [error, setError] = useState(null); // Pour afficher les erreurs de taille de fichier

    // --- UTILITIES & FILTERS ---
    const getResourceTypeIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
            case 'audio': return <Headphones className="w-5 h-5 text-green-500" />;
            case 'video': return <Video className="w-5 h-5 text-blue-500" />;
            case 'texte': return <BookOpen className="w-5 h-5 text-indigo-500" />;
            case 'image': return <LayoutGrid className="w-5 h-5 text-purple-500" />;
            default: return <Folder className="w-5 h-5 text-gray-500" />;
        }
    };
    
    // Filtrer les notes pour le sujet actuel
    const currentSubjectNotes = useMemo(() => {
        if (!currentSubject) return [];
        return notes
            .filter(n => n.subjectId === currentSubject.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [notes, currentSubject]);

    // Obtenir les ressources du sujet actuel
    const currentSubjectResources = useMemo(() => {
        return subjects.find(s => s.id === currentSubject?.id)?.resources || [];
    }, [subjects, currentSubject]);


    // --- CRUD MATIÈRES (SUBJECTS) ---
    const handleAddSubject = () => {
        if (!newSubjectName.trim()) return;
        const newSubjectId = `s-${Date.now()}`;
        const newSubject = { id: newSubjectId, name: newSubjectName.trim(), resources: [] };

        setSubjects(prevSubjects => [...prevSubjects, newSubject]);
        setNewSubjectName('');
        setCurrentSubject(newSubject);
    };

    const handleDeleteSubject = (subjectId) => {
        const remainingSubjects = subjects.filter(s => s.id !== subjectId);
        setSubjects(remainingSubjects);
        setNotes(prevNotes => prevNotes.filter(n => n.subjectId !== subjectId));
        setAssignments(prevAssignments => prevAssignments.filter(a => a.subjectId !== subjectId));
    };


    // --- CRUD NOTES ---
    const handleSaveNote = () => {
        if (!newNoteContent.trim() || !currentSubject) return;
        const newNote = {
            id: `n-${Date.now()}`,
            subjectId: currentSubject.id,
            content: newNoteContent,
            createdAt: new Date(),
        };
        setNotes(prevNotes => [newNote, ...prevNotes]);
        setNewNoteContent('');
    };

    const handleDeleteNote = (noteId) => {
        setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
    };


    // --- CRUD RESSOURCES (FICHIER/CONTENT INPUT) ---

    // Gère le changement de fichier dans l'input
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setError(null);
        if (!file) {
            setNewResource(prev => ({ ...prev, file: null }));
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            // Afficher la taille en Mo pour le message d'erreur
            const maxMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
            setError(`Fichier trop volumineux. Max ${maxMB} Mo. Cette limite est nécessaire pour le stockage local.`);
            setNewResource(prev => ({ ...prev, file: null }));
            return;
        }

        let type = 'doc';
        if (file.type.includes('pdf')) type = 'pdf';
        else if (file.type.includes('image')) type = 'image';
        else if (file.type.includes('video')) type = 'video';
        else if (file.type.includes('audio')) type = 'audio';
        else if (file.type.includes('text')) type = 'texte';
        
        setNewResource(prev => ({ ...prev, file: file, type: type }));
    };
    
    // Ajoute la ressource et gère la conversion en Base64
    const handleAddResource = () => {
        if (!currentSubject || !newResource.title.trim()) return;
        if (newResource.file && newResource.file.size > MAX_FILE_SIZE_BYTES) {
            setError("Veuillez choisir un fichier plus petit.");
            return;
        }

        const resourceToAdd = {
            id: Date.now(),
            title: newResource.title,
            type: newResource.type,
            description: newResource.description,
            createdAt: new Date(),
            contentData: null, // Contient le Base64 si un fichier a été déposé
        };

        if (newResource.file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Le contenu Base64 (Data URL) est stocké ici ! C'est le "vrai dépôt"
                const newResourceWithContent = { ...resourceToAdd, contentData: e.target.result };
                updateSubjectResources(currentSubject.id, newResourceWithContent);
                // Réinitialiser après l'ajout asynchrone
                setNewResource({ title: '', type: 'pdf', file: null, description: '' });
                setError(null);
            };
            // Lecture du fichier en Data URL (Base64)
            reader.readAsDataURL(newResource.file);
        } else {
             // Si pas de fichier, utiliser seulement la description/titre
            updateSubjectResources(currentSubject.id, resourceToAdd);
            setNewResource({ title: '', type: 'pdf', file: null, description: '' });
            setError(null);
        }
    };

    // Fonction d'ajout/mise à jour du tableau de ressources dans le sujet
    const updateSubjectResources = (subjectId, newResourceItem) => {
         setSubjects(prevSubjects =>
            prevSubjects.map(s =>
                s.id === subjectId
                    ? { ...s, resources: [newResourceItem, ...s.resources] }
                    : s
            )
        );
    }

    const handleDeleteResource = (subjectId, resourceId) => {
        setSubjects(prevSubjects =>
            prevSubjects.map(s =>
                s.id === subjectId
                    ? { ...s, resources: s.resources.filter(r => r.id !== resourceId) }
                    : s
            )
        );
        if(viewingResource?.id === resourceId) {
            setViewingResource(null);
        }
    };


    // --- CRUD ASSIGNMENTS (DEVOIRS) ---
    const handleUploadAssignment = () => {
        if (!currentSubject) return;

        const assignmentTitle = `Devoir soumis - ${currentSubject.name} (${new Date().toLocaleTimeString()})`;
        const assignmentType = ['pdf', 'image', 'texte', 'doc'][Math.floor(Math.random() * 4)];

        const newAssignment = {
            id: `a-${Date.now()}`,
            subjectId: currentSubject.id,
            title: assignmentTitle,
            fileType: assignmentType,
            uploadedAt: new Date(),
        };

        setAssignments(prevAssignments => [...prevAssignments, newAssignment]);
    };

    const handleDeleteAssignment = (assignmentId) => {
        setAssignments(prevAssignments => prevAssignments.filter(a => a.id !== assignmentId));
    };


    // ----------------------------------------------------
    // --- VUES PRINCIPALES ---
    // ----------------------------------------------------

    const ResourceViewer = () => {
        if (!currentSubject) return <p className="text-gray-500 p-4">Sélectionnez une matière pour voir les ressources.</p>;

        const resources = currentSubjectResources;
        const resourceTypes = ['pdf', 'texte', 'image', 'video', 'audio', 'doc'];
        
        // Calcul pour afficher la taille Max en Mo
        const maxMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);

        return (
            <div className="p-6">
                <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Ressources pour {currentSubject.name}</h2>
                
                {/* Message d'erreur global */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-3"/>
                        <span className="font-medium">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-red-700 hover:text-red-900"><X className="w-4 h-4"/></button>
                    </div>
                )}

                {/* Formulaire d'Ajout de Ressource */}
                <div className="mb-8 p-4 bg-gray-100 border border-gray-200 rounded-xl shadow-inner">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center"><Plus className="w-5 h-5 mr-2"/> Ajouter/Déposer une Ressource</h3>
                    
                    <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-lg">
                        <Zap className="w-4 h-4 inline mr-2"/>
                        **ATTENTION PERSISTANCE** : Le contenu réel du fichier (Base64) est stocké localement. Taille Max. autorisée : **{maxMB} Mo**.
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Titre de la ressource"
                            value={newResource.title}
                            onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                            className="col-span-2 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <select
                            value={newResource.type}
                            onChange={(e) => setNewResource({...newResource, type: e.target.value})}
                            className="p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {resourceTypes.map(type => (
                                <option key={type} value={type}>{type.toUpperCase()}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddResource}
                            disabled={!newResource.title.trim() || error}
                            className="p-2 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition disabled:bg-indigo-300 flex items-center justify-center"
                        >
                            <Plus className="w-5 h-5 mr-2"/> Déposer (ou Ajouter Lien)
                        </button>

                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="col-span-2 p-2 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        <textarea
                            placeholder="Description ou contenu textuel (Si pas de fichier déposé)"
                            value={newResource.description}
                            onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                            className="col-span-2 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                        />
                    </div>
                </div>

                {/* --- Panneau de Visualisation Intégré --- */}
                {viewingResource && (
                    <div className="mb-8 p-6 bg-white rounded-xl shadow-2xl border-2 border-indigo-500">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h3 className="text-2xl font-extrabold text-indigo-700 flex items-center">
                                {getResourceTypeIcon(viewingResource.type)}
                                <span className="ml-3">{viewingResource.title}</span>
                            </h3>
                            <button onClick={() => setViewingResource(null)} className="p-2 text-gray-500 hover:text-red-500 transition">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="text-gray-700">
                            {viewingResource.contentData ? (
                                <div>
                                    <p className="text-lg font-semibold mb-2 flex items-center text-green-700"><Info className="w-4 h-4 mr-2"/>Contenu (Base64) Affiché Directement :</p>
                                    
                                    {viewingResource.type.includes('image') ? (
                                        <img src={viewingResource.contentData} alt={viewingResource.title} className="max-w-full h-auto rounded-lg shadow-md mt-2"/>
                                    ) : viewingResource.type === 'pdf' ? (
                                        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
                                            <AlertTriangle className="w-5 h-5 inline mr-2 text-yellow-700"/>
                                            **Affichage PDF Limité :** Le navigateur ne peut pas afficher un PDF Base64 dans un iFrame. Le contenu est **bien stocké**, mais pour le voir, vous pouvez le télécharger :
                                            <a href={viewingResource.contentData} download={`${viewingResource.title}.pdf`} className="ml-3 text-blue-600 hover:underline flex items-center mt-2">
                                                <Download className="w-4 h-4 mr-1"/> Télécharger le Fichier Déposé
                                            </a>
                                        </div>
                                    ) : (
                                         <p className="whitespace-pre-wrap leading-relaxed border p-4 bg-gray-50 rounded-lg text-sm text-gray-800">
                                            {/* Pour d'autres types, on affiche un extrait du Base64 ou la description */}
                                            {viewingResource.description || "Contenu Base64 stocké. Non affichable directement dans ce format."}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-lg font-semibold mb-2 flex items-center text-gray-700"><Info className="w-4 h-4 mr-2"/>Contenu (Description) :</p>
                                    <p className="whitespace-pre-wrap leading-relaxed border p-4 bg-gray-50 rounded-lg text-sm">{viewingResource.description || 'Pas de contenu de fichier Base64 stocké. Seulement les métadonnées.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Liste des Ressources */}
                {resources.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-xl shadow-lg">
                        <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
                        <p className="text-lg text-gray-600">Aucune ressource pour le moment. Ajoutez-en une pour la persistance locale.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {resources.map(resource => (
                            <div key={resource.id} className="relative bg-white p-5 rounded-xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100 group">
                                <button
                                    onClick={() => handleDeleteResource(currentSubject.id, resource.id)}
                                    className="absolute top-2 right-2 p-1 text-gray-400 bg-white rounded-full hover:text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Supprimer la ressource (Supprime le Base64 du stockage)"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-start justify-between mb-3 pr-6">
                                    {getResourceTypeIcon(resource.type)}
                                    <span className={`text-xs font-semibold uppercase px-3 py-1 rounded-full ${
                                        resource.contentData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {resource.contentData ? 'DÉPOSÉ' : 'LIEN/MÉTA'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{resource.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 h-10 overflow-hidden">{resource.description || 'Pas de description.'}</p>
                                <div className="flex space-x-2 mt-2">
                                    <button
                                        onClick={() => setViewingResource(resource)}
                                        className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition duration-150 p-2 rounded-lg border border-indigo-200 hover:bg-indigo-50"
                                        title="Voir le contenu Base64 ou la description"
                                    >
                                        <Eye className="w-4 h-4 mr-1"/> Voir le Contenu
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const NotesEditor = () => {
        if (!currentSubject) return <p className="text-gray-500 p-4">Sélectionnez une matière pour prendre des notes.</p>;

        return (
            <div className="p-6">
                <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Notes Personnelles pour {currentSubject.name}</h2>

                <div className="mb-8 p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-inner">
                    <h3 className="text-xl font-semibold text-indigo-800 mb-3 flex items-center"><Edit className="w-5 h-5 mr-2"/> Nouvelles Notes</h3>
                    <textarea
                        className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y min-h-[150px] transition duration-150"
                        placeholder={`Écrivez vos notes pour ${currentSubject.name} ici... Ces notes sont persistantes via LocalStorage.`}
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                    ></textarea>
                    <button
                        onClick={handleSaveNote}
                        disabled={!newNoteContent.trim()}
                        className="mt-3 w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-300 flex items-center justify-center"
                    >
                        <Send className="w-5 h-5 mr-2"/> Enregistrer la Note
                    </button>
                </div>

                <h3 className="text-2xl font-semibold text-gray-700 mb-4">Historique des Notes</h3>
                <div className="space-y-4">
                    {currentSubjectNotes.length === 0 ? (
                        <p className="text-gray-500">Aucune note enregistrée. Elles sont sauvegardées dans le stockage local.</p>
                    ) : (
                        currentSubjectNotes.map(note => (
                            <div key={note.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
                                <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                                    <span className="text-xs text-gray-400">
                                        Créé le: {note.createdAt.toLocaleDateString()} à {note.createdAt.toLocaleTimeString()}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="text-red-500 hover:text-red-700 transition duration-150 p-1 rounded-full hover:bg-red-50"
                                        title="Supprimer la note"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const AssignmentManager = () => {
        if (!currentSubject) return <p className="text-gray-500 p-4">Sélectionnez une matière pour gérer les devoirs.</p>;

        const currentSubjectAssignments = assignments.filter(a => a.subjectId === currentSubject.id);

        return (
            <div className="p-6">
                <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Devoirs Rendu pour {currentSubject.name}</h2>

                <button
                    onClick={handleUploadAssignment}
                    className="mb-8 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-150 flex items-center"
                >
                    <Plus className="w-5 h-5 mr-2"/> Simuler Dépôt de Devoir
                </button>

                <div className="space-y-4">
                    {currentSubjectAssignments.length === 0 ? (
                        <p className="text-gray-500">Aucun devoir enregistré. Les dépôts sont persistants via LocalStorage.</p>
                    ) : (
                        currentSubjectAssignments.map(assignment => (
                            <div key={assignment.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500 flex justify-between items-center group">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{assignment.title}</h3>
                                    <span className="text-sm text-gray-500 flex items-center space-x-1">
                                        {getResourceTypeIcon(assignment.fileType)} <span>{assignment.fileType.toUpperCase()}</span>
                                    </span>
                                    <span className="text-xs text-gray-400 block">
                                        Déposé le: {assignment.uploadedAt.toLocaleDateString()} à {assignment.uploadedAt.toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => handleDeleteAssignment(assignment.id)}
                                        className="p-1 text-gray-400 bg-white rounded-full hover:text-red-600 hover:bg-red-100 transition-colors"
                                        title="Supprimer le devoir"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };


    // --- Rendu Principal ---
    const NavButton = ({ view, icon: Icon, label }) => (
        <button
            onClick={() => { setCurrentView(view); setViewingResource(null); }}
            className={`w-full flex items-center p-3 text-left rounded-lg transition duration-150 ${
                currentView === view
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-indigo-800 hover:bg-indigo-100 hover:text-indigo-900'
            }`}
        >
            <Icon className="w-5 h-5 mr-3" />
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar (Navigation Matières) */}
            <div className="w-72 bg-white shadow-xl flex flex-col p-4">
                <div className="text-2xl font-extrabold text-indigo-700 mb-6 border-b pb-4">Mon Espace Étude</div>

                <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                     <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Ajouter Matière</h3>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Nom de la matière..."
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddSubject();
                            }}
                        />
                        <button
                            onClick={handleAddSubject}
                            disabled={!newSubjectName.trim()}
                            title="Ajouter la Matière"
                            className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300 transition"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="border-b pb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Matières ({subjects.length})</h3>
                </div>

                <div className="space-y-2 flex-grow overflow-y-auto pr-2 pt-4">
                    {subjects.map(subject => (
                        <div key={subject.id} className="group relative">
                            <button
                                onClick={() => { setCurrentSubject(subject); setViewingResource(null); }}
                                className={`w-full text-left p-3 pr-10 rounded-xl transition duration-150 flex items-center ${
                                    currentSubject?.id === subject.id
                                        ? 'bg-indigo-500 text-white shadow-md font-semibold'
                                        : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                                }`}
                            >
                                <Folder className="w-5 h-5 mr-3"/>
                                <span className="truncate">{subject.name}</span>
                            </button>
                            <button
                                onClick={() => handleDeleteSubject(subject.id)}
                                title="Supprimer la matière"
                                className={`absolute right-0 top-1/2 transform -translate-y-1/2 p-2 ${
                                    currentSubject?.id === subject.id
                                        ? 'text-white hover:text-red-300'
                                        : 'text-gray-400 hover:text-red-600'
                                } transition-colors opacity-0 group-hover:opacity-100 ${currentSubject?.id === subject.id && 'opacity-100'}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {subjects.length === 0 && (
                         <p className="text-xs text-gray-400 p-3 text-center">Aucune matière. Ajoutez-en une ci-dessus.</p>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t text-center">
                    <p className="text-xs text-gray-400 font-semibold text-orange-600">Persistance : LocalStorage (Simple)</p>
                </div>
            </div>

            {/* Contenu Principal */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-white shadow-md p-4 flex justify-around">
                    <NavButton view="resources" icon={LayoutGrid} label="Ressources des Cours" />
                    <NavButton view="notes" icon={Edit} label="Notes Personnelles" />
                    <NavButton view="assignments" icon={Send} label="Mes Devoirs Rendus" />
                </div>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                    {currentView === 'resources' && <ResourceViewer />}
                    {currentView === 'notes' && <NotesEditor />}
                    {currentView === 'assignments' && <AssignmentManager />}
                </main>
            </div>
        </div>
    );
};

export default App;
