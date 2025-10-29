import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileText, BookOpen, User, Trash2, Plus, Search, ChevronDown, ChevronUp, File, Video, Mic, Link, Save, X, Eye, LogOut, Moon, Sun, Menu,
  Edit3, Check, Clock, BarChart3, Bell, Settings, Upload, AlertCircle, HelpCircle, Award, Calendar, TrendingUp, Users, FileCheck
} from 'lucide-react';

// --- Constantes et Utilitaires ---

const MAX_FILE_SIZE = 10 * 1024 * 1024; // AUGMENTÉ À 10 MO
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
  'njie': { password: 'dsPb$et9gz3', role: 'student', name: 'Njie (Étudiant)', avatar: null },
  'admin': { password: 'aDmin$', role: 'student', name: 'Admin (Étudiant)', avatar: null },
  'xav': { password: 'sdFJ=jd$sg7s4', role: 'tutor', name: 'Xav (Tuteur)', avatar: null },
};

// Utilisateur cible pour les remarques du tuteur
const TARGET_STUDENT_ID = 'njie';

// Fonction utilitaire pour la conversion Base64 en ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  try {
    if (!base64 || !base64.includes(',')) return new ArrayBuffer(0);
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
  try {
    const arrayBuffer = base64ToArrayBuffer(base64);
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Erreur de création de Blob URL:", e);
    return '';
  }
};

// Composant pour l'ajout et l'affichage des remarques
const RemarkSection = ({ remarks = [], onAddRemark, currentUserId, contentOwnerId, isMemory = false }) => {
  const [newRemark, setNewRemark] = useState('');
  const isTutor = USERS[currentUserId]?.role === 'tutor';
  const isTargetContent = contentOwnerId === TARGET_STUDENT_ID;
  const showRemarkForm = isTutor && isTargetContent;
  const primaryColor = isMemory ? 'purple' : 'red';

  return (
    <div className="mt-4 pt-4 border-t border-gray-600">
      <h5 className={`text-lg font-bold text-${primaryColor}-400 mb-2`}>
        Remarques du Tuteur ({remarks.length})
      </h5>

      {/* Afficher les remarques existantes */}
      <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
        {remarks.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Aucune remarque pour l'instant.</p>
        ) : (
          remarks.map((remark, index) => (
            <div key={index} className={`bg-${primaryColor}-900/40 p-3 rounded-lg border-l-4 border-${primaryColor}-500`}>
              <p className={`text-${primaryColor}-200 text-sm`}>{remark.content}</p>
              <span className={`text-xs text-${primaryColor}-400/70 block mt-1`}>
                Par {USERS[remark.authorId]?.name} le {remark.timestamp}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Formulaire d'ajout de remarque */}
      {showRemarkForm && (
        <div className="space-y-2">
          <textarea
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
            placeholder="Ajouter une remarque en tant que Tuteur..."
            className={`w-full bg-gray-700 text-white p-3 rounded-lg border border-${primaryColor}-600 focus:ring-${primaryColor}-500 focus:border-${primaryColor}-500 h-20 resize-none`}
          />
          <button
            onClick={() => { 
              if (newRemark.trim()) {
                onAddRemark(newRemark); 
                setNewRemark(''); 
              }
            }}
            disabled={newRemark.trim() === ''}
            className={`bg-${primaryColor}-600 hover:bg-${primaryColor}-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 text-sm`}
          >
            Ajouter Remarque
          </button>
        </div>
      )}
      {!isTargetContent && isTutor && (
        <p className="text-yellow-500 text-sm italic">
          Vous ne pouvez ajouter des remarques qu'au contenu de {USERS[TARGET_STUDENT_ID].name}.
        </p>
      )}
    </div>
  );
};

// --- Composant d'Affichage des Ressources ---

const ResourceViewer = ({ resource, onClose, currentUserId }) => {
  if (!resource) return null;

  const { title, type, contentData, mimeType, description, ownerId } = resource;
  let viewerContent;

  const downloadFile = () => {
    try {
      if (contentData) {
        const link = document.createElement('a');
        link.href = contentData;
        link.download = title || 'resource_file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error("Erreur de téléchargement:", e);
      alert("Erreur lors du téléchargement du fichier");
    }
  };

  // Affichage basé sur le type de ressource
  try {
    switch (type) {
      case 'pdf':
      case 'image':
      case 'audio':
      case 'video':
        if (contentData && contentData.startsWith('data:')) {
          const url = type === 'pdf' ? createBlobUrl(contentData, 'application/pdf') : contentData;
          const mediaClasses = "max-w-full max-h-[80vh] mx-auto rounded-lg shadow-xl";
          
          if (type === 'pdf') {
            viewerContent = (
              <object data={url} type="application/pdf" className="flex-grow min-h-0 w-full rounded-lg shadow-xl" aria-label={`Visualiseur de ${title}`}>
                <p className="text-white text-center p-4">
                  Votre navigateur ne peut pas afficher ce PDF. 
                  <button onClick={downloadFile} className="text-indigo-400 underline">Télécharger le fichier</button>.
                </p>
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
          viewerContent = <p className="text-yellow-400 text-center">Contenu non disponible (fichier manquant ou format incorrect).</p>;
        }
        break;

      case 'url':
        viewerContent = (
          <iframe
            src={description}
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
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-200">{description || 'Aucun contenu'}</pre>
          </div>
        );
        break;
    }
  } catch (e) {
    console.error("Erreur d'affichage de la ressource:", e);
    viewerContent = <p className="text-red-400 text-center">Erreur lors de l'affichage de la ressource</p>;
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
    try {
      if (USERS[username] && USERS[username].password === password) {
        onLogin(username);
        setError('');
      } else {
        setError('Nom d\'utilisateur ou mot de passe incorrect.');
        setPassword('');
      }
    } catch (e) {
      console.error("Erreur de connexion:", e);
      setError('Une erreur est survenue lors de la connexion.');
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

// --- Composant pour la gestion des quizz ---

const QuizManager = ({ quizzes = [], onCreateQuiz, onUpdateQuiz, onDeleteQuiz, onTakeQuiz, currentUserId, currentUserRole }) => {
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [quizResults, setQuizResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [quizEndTime, setQuizEndTime] = useState(null);

  const isTutor = currentUserRole === 'tutor';
  const isStudent = currentUserRole === 'student';

  const resetQuizForm = () => {
    setQuizTitle('');
    setQuizQuestions([]);
    setCurrentQuestion('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
    setIsCreatingQuiz(false);
  };

  const addQuestionToQuiz = () => {
    if (currentQuestion.trim() && options.some(opt => opt.trim())) {
      const newQuestion = {
        id: Date.now(),
        question: currentQuestion,
        options: [...options],
        correctAnswer
      };
      setQuizQuestions([...quizQuestions, newQuestion]);
      setCurrentQuestion('');
      setOptions(['', '', '', '']);
      setCorrectAnswer(0);
    }
  };

  const removeQuestionFromQuiz = (questionId) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== questionId));
  };

  const saveQuiz = () => {
    try {
      if (quizTitle.trim() && quizQuestions.length > 0) {
        const newQuiz = {
          id: Date.now(),
          title: quizTitle,
          questions: quizQuestions,
          createdBy: currentUserId,
          createdAt: new Date().toLocaleDateString('fr-FR'),
          results: []
        };
        onCreateQuiz(newQuiz);
        resetQuizForm();
      }
    } catch (e) {
      console.error("Erreur de sauvegarde du quiz:", e);
      alert("Erreur lors de la sauvegarde du quiz");
    }
  };

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setSelectedAnswers({});
    setQuizStartTime(new Date());
    setShowResults(false);
  };

  const submitQuiz = () => {
    if (!activeQuiz) return;
    
    try {
      setQuizEndTime(new Date());
      const timeTaken = Math.floor((quizEndTime - quizStartTime) / 1000);
      
      let score = 0;
      const results = activeQuiz.questions.map((question, index) => {
        const isCorrect = selectedAnswers[index] === question.correctAnswer;
        if (isCorrect) score++;
        return {
          questionId: question.id,
          selectedAnswer: selectedAnswers[index],
          isCorrect
        };
      });
      
      const percentage = Math.round((score / activeQuiz.questions.length) * 100);
      
      const quizResult = {
        quizId: activeQuiz.id,
        userId: currentUserId,
        score,
        totalQuestions: activeQuiz.questions.length,
        percentage,
        timeTaken,
        completedAt: new Date().toLocaleDateString('fr-FR'),
        answers: results
      };
      
      setQuizResults([...quizResults, quizResult]);
      setShowResults(true);
      
      onTakeQuiz(activeQuiz.id, quizResult);
    } catch (e) {
      console.error("Erreur de soumission du quiz:", e);
      alert("Erreur lors de la soumission du quiz");
    }
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answerIndex
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (activeQuiz && isStudent) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-indigo-400">{activeQuiz.title}</h2>
          <button
            onClick={() => setActiveQuiz(null)}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        {!showResults ? (
          <div>
            <div className="mb-4 text-sm text-gray-400">
              Temps écoulé: {quizStartTime ? formatTime(Math.floor((new Date() - quizStartTime) / 1000)) : '0:00'}
            </div>
            
            {activeQuiz.questions.map((question, qIndex) => (
              <div key={question.id} className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-white">
                  Question {qIndex + 1}: {question.question}
                </h3>
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => (
                    <label key={oIndex} className="flex items-center p-2 rounded hover:bg-gray-600 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        checked={selectedAnswers[qIndex] === oIndex}
                        onChange={() => handleAnswerSelect(qIndex, oIndex)}
                        className="mr-3"
                      />
                      <span className="text-gray-200">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            
            <button
              onClick={submitQuiz}
              disabled={Object.keys(selectedAnswers).length < activeQuiz.questions.length}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition duration-150"
            >
              Soumettre le Quiz
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <div className="text-5xl font-bold text-indigo-400 mb-2">
                {quizResults[quizResults.length - 1]?.percentage}%
              </div>
              <p className="text-xl text-gray-300">
                Vous avez obtenu {quizResults[quizResults.length - 1]?.score} sur {activeQuiz.questions.length} questions
              </p>
              <p className="text-gray-400 mt-2">
                Temps: {formatTime(quizResults[quizResults.length - 1]?.timeTaken)}
              </p>
            </div>
            
            <div className="mb-6 text-left">
              <h3 className="text-lg font-semibold mb-3 text-indigo-300">Révision des réponses:</h3>
              {activeQuiz.questions.map((question, qIndex) => {
                const result = quizResults[quizResults.length - 1]?.answers.find(a => a.questionId === question.id);
                const isCorrect = result?.isCorrect;
                
                return (
                  <div key={question.id} className={`mb-4 p-3 rounded-lg ${isCorrect ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                    <p className="font-medium text-white mb-2">{question.question}</p>
                    <p className="text-sm text-gray-300">
                      Votre réponse: {question.options[result?.selectedAnswer]}
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-green-400">
                        Réponse correcte: {question.options[question.correctAnswer]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => setActiveQuiz(null)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition duration-150"
            >
              Retour aux Quizz
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isTutor) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-extrabold text-indigo-400">Gestion des Quizz</h2>
          <button
            onClick={() => setIsCreatingQuiz(!isCreatingQuiz)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 flex items-center"
          >
            {isCreatingQuiz ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
            {isCreatingQuiz ? 'Annuler' : 'Créer un Quiz'}
          </button>
        </div>

        {isCreatingQuiz && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-300 mb-4">Créer un nouveau Quiz</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Titre du Quiz</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Titre du quiz"
              />
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-300 mb-2">Questions</h4>
              
              {quizQuestions.map((question, index) => (
                <div key={question.id} className="mb-3 p-3 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <p className="font-medium text-white">{index + 1}. {question.question}</p>
                      <div className="mt-2 text-sm text-gray-400">
                        {question.options.map((option, oIndex) => (
                          <p key={oIndex} className={oIndex === question.correctAnswer ? 'text-green-400' : ''}>
                            {oIndex === question.correctAnswer ? '✓' : '○'} {option}
                          </p>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeQuestionFromQuiz(question.id)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-3 bg-gray-700 rounded-lg">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Question</label>
                  <input
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Entrez votre question"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Options</label>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={correctAnswer === index}
                        onChange={() => setCorrectAnswer(index)}
                        className="mr-2"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[index] = e.target.value;
                          setOptions(newOptions);
                        }}
                        className="flex-grow p-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder={`Option ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={addQuestionToQuiz}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition duration-150"
                >
                  Ajouter la question
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={resetQuizForm}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition duration-150"
              >
                Annuler
              </button>
              <button
                onClick={saveQuiz}
                disabled={!quizTitle.trim() || quizQuestions.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded transition duration-150"
              >
                Enregistrer le Quiz
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-indigo-300">Quizz existants</h3>
          {quizzes.length === 0 ? (
            <p className="text-gray-400">Aucun quiz disponible. Créez votre premier quiz!</p>
          ) : (
            quizzes.map(quiz => (
              <div key={quiz.id} className="bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{quiz.title}</h4>
                    <p className="text-sm text-gray-400">
                      Créé le {quiz.createdAt} • {quiz.questions.length} questions
                    </p>
                    {quiz.results && quiz.results.length > 0 && (
                      <p className="text-sm text-gray-400 mt-1">
                        {quiz.results.length} tentative{quiz.results.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveQuiz(quiz)}
                      className="text-indigo-400 hover:text-indigo-300"
                      title="Voir les détails"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => onDeleteQuiz(quiz.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {activeQuiz && activeQuiz.id === quiz.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h5 className="text-md font-medium text-indigo-300 mb-2">Questions:</h5>
                    {quiz.questions.map((question, index) => (
                      <div key={question.id} className="mb-2 p-2 bg-gray-700 rounded">
                        <p className="text-white">{index + 1}. {question.question}</p>
                        <p className="text-sm text-green-400">
                          Réponse: {question.options[question.correctAnswer]}
                        </p>
                      </div>
                    ))}
                    
                    {quiz.results && quiz.results.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-md font-medium text-indigo-300 mb-2">Résultats:</h5>
                        <div className="space-y-2">
                          {quiz.results.map((result, index) => (
                            <div key={index} className="p-2 bg-gray-700 rounded text-sm">
                              <p className="text-white">
                                {USERS[result.userId]?.name}: {result.score}/{result.totalQuestions} ({result.percentage}%)
                              </p>
                              <p className="text-gray-400">
                                Temps: {formatTime(result.timeTaken)} • {result.completedAt}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (isStudent) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-extrabold text-indigo-400">Quizz d'Auto-évaluation</h2>
        
        {quizzes.length === 0 ? (
          <p className="text-gray-400">Aucun quiz disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map(quiz => {
              const userResults = quiz.results?.filter(r => r.userId === currentUserId) || [];
              const bestResult = userResults.length > 0 
                ? userResults.reduce((best, current) => current.percentage > best.percentage ? current : best)
                : null;
              
              return (
                <div key={quiz.id} className="bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-white mb-2">{quiz.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {quiz.questions.length} questions • Créé le {quiz.createdAt}
                  </p>
                  
                  {bestResult && (
                    <div className="mb-3 p-2 bg-gray-700 rounded">
                      <p className="text-sm text-indigo-300">
                        Meilleur score: {bestResult.percentage}% ({bestResult.score}/{bestResult.totalQuestions})
                      </p>
                      <p className="text-xs text-gray-400">
                        Tentatives: {userResults.length}
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => startQuiz(quiz)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition duration-150"
                  >
                    {userResults.length > 0 ? 'Recommencer' : 'Commencer'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
};

// --- Composant pour les statistiques ---

const StatisticsDashboard = ({ data, currentUserId, currentUserRole }) => {
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'all'
  
  // Calculer les statistiques
  const calculateStats = () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      let startDate;
      if (timeRange === 'week') startDate = weekAgo;
      else if (timeRange === 'month') startDate = monthAgo;
      else startDate = new Date(0); // Début des temps
      
      // Filtrer les données selon la plage de temps
      const filteredNotes = data.notes?.filter(note => 
        new Date(note.timestamp) >= startDate
      ) || [];
      
      const filteredAssignments = data.assignments?.filter(assignment => 
        new Date(assignment.date) >= startDate
      ) || [];
      
      const filteredQuizzes = data.quizzes ? data.quizzes.flatMap(quiz => 
        (quiz.results || []).filter(result => 
          new Date(result.completedAt) >= startDate
        )
      ) : [];
      
      // Ressources les plus consultées (simulé)
      const resourceViews = {};
      data.subjects?.forEach(subject => {
        subject.resources?.forEach(resource => {
          const key = `${resource.title} (${subject.name})`;
          resourceViews[key] = (resourceViews[key] || 0) + Math.floor(Math.random() * 20) + 1;
        });
      });
      
      const sortedResources = Object.entries(resourceViews)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, views]) => ({ name, views }));
      
      // Statistiques de connexion (simulé)
      const connectionStats = {};
      Object.keys(USERS).forEach(userId => {
        connectionStats[userId] = {
          name: USERS[userId].name,
          connections: Math.floor(Math.random() * 30) + 5,
          totalTime: Math.floor(Math.random() * 5000) + 1000, // en minutes
          lastConnection: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
        };
      });
      
      return {
        notesCount: filteredNotes.length,
        assignmentsCount: filteredAssignments.length,
        quizzesTaken: filteredQuizzes.length,
        averageQuizScore: filteredQuizzes.length > 0 
          ? Math.round(filteredQuizzes.reduce((sum, q) => sum + q.percentage, 0) / filteredQuizzes.length)
          : 0,
        topResources: sortedResources,
        connectionStats
      };
    } catch (e) {
      console.error("Erreur de calcul des statistiques:", e);
      return {
        notesCount: 0,
        assignmentsCount: 0,
        quizzesTaken: 0,
        averageQuizScore: 0,
        topResources: [],
        connectionStats: {}
      };
    }
  };
  
  const stats = calculateStats();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold text-indigo-400">Tableau de Bord Statistiques</h2>
        <div className="flex space-x-2">
          {['week', 'month', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition duration-150 ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range === 'week' ? 'Semaine' : range === 'month' ? 'Mois' : 'Tout'}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Notes créées</p>
              <p className="text-2xl font-bold text-white">{stats.notesCount}</p>
            </div>
            <FileText className="text-indigo-400" size={24} />
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Devoirs rendus</p>
              <p className="text-2xl font-bold text-white">{stats.assignmentsCount}</p>
            </div>
            <FileCheck className="text-green-400" size={24} />
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Quizz complétés</p>
              <p className="text-2xl font-bold text-white">{stats.quizzesTaken}</p>
            </div>
            <HelpCircle className="text-purple-400" size={24} />
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Score moyen</p>
              <p className="text-2xl font-bold text-white">{stats.averageQuizScore}%</p>
            </div>
            <Award className="text-yellow-400" size={24} />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-indigo-300 mb-4">Ressources les plus consultées</h3>
          {stats.topResources.length === 0 ? (
            <p className="text-gray-400">Aucune ressource consultée récemment.</p>
          ) : (
            <div className="space-y-3">
              {stats.topResources.map((resource, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg font-medium text-white mr-3">{index + 1}.</span>
                    <span className="text-gray-300">{resource.name}</span>
                  </div>
                  <span className="text-indigo-400 font-medium">{resource.views} vues</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-indigo-300 mb-4">Statistiques de connexion</h3>
          <div className="space-y-3">
            {Object.entries(stats.connectionStats).map(([userId, userStats]) => (
              <div key={userId} className="p-3 bg-gray-700 rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-white">{userStats.name}</span>
                  <span className="text-sm text-gray-400">{userStats.lastConnection}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">{userStats.connections} connexions</span>
                  <span className="text-indigo-400">{Math.floor(userStats.totalTime / 60)}h {userStats.totalTime % 60}min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Composant pour la section Mémoire ---

const MemorySection = ({ memory, onSaveMemory, onAddRemark, currentUserId, currentUserRole }) => {
  const [content, setContent] = useState(memory?.content || '');
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(memory?.title || 'Mon Mémoire');
  const editorRef = useRef(null);
  
  const isTutor = currentUserRole === 'tutor';
  const isStudent = currentUserRole === 'student';
  
  const handleSave = () => {
    try {
      onSaveMemory({
        title,
        content,
        lastModified: new Date().toLocaleDateString('fr-FR'),
        modifiedBy: currentUserId
      });
      setIsEditing(false);
    } catch (e) {
      console.error("Erreur de sauvegarde du mémoire:", e);
      alert("Erreur lors de la sauvegarde du mémoire");
    }
  };
  
  const insertText = (text) => {
    try {
      if (editorRef.current) {
        const start = editorRef.current.selectionStart;
        const end = editorRef.current.selectionEnd;
        const newText = content.substring(0, start) + text + content.substring(end);
        setContent(newText);
        
        // Remettre le focus après un court délai
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
            editorRef.current.selectionStart = editorRef.current.selectionEnd = start + text.length;
          }
        }, 0);
      }
    } catch (e) {
      console.error("Erreur d'insertion de texte:", e);
    }
  };
  
  const insertHeading = (level) => {
    insertText('\n' + '#'.repeat(level) + ' ');
  };
  
  const insertList = (ordered) => {
    insertText('\n' + (ordered ? '1. ' : '- '));
  };
  
  const insertLink = () => {
    const url = prompt('URL du lien:');
    if (url) {
      insertText(`[${url}](${url})`);
    }
  };
  
  const insertBold = () => {
    insertText('**texte en gras**');
  };
  
  const insertItalic = () => {
    insertText('*texte en italique*');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold text-purple-400">Section Mémoire</h2>
        {isStudent && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 flex items-center"
          >
            {isEditing ? <Save size={20} className="mr-2" /> : <Edit3 size={20} className="mr-2" />}
            {isEditing ? 'Sauvegarder' : 'Modifier'}
          </button>
        )}
      </div>
      
      {isEditing && isStudent ? (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Titre du mémoire</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => insertHeading(1)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Titre 1
              </button>
              <button
                onClick={() => insertHeading(2)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Titre 2
              </button>
              <button
                onClick={() => insertHeading(3)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Titre 3
              </button>
              <button
                onClick={insertBold}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-bold"
              >
                Gras
              </button>
              <button
                onClick={insertItalic}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm italic"
              >
                Italique
              </button>
              <button
                onClick={() => insertList(false)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Liste
              </button>
              <button
                onClick={() => insertList(true)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Liste num.
              </button>
              <button
                onClick={insertLink}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Lien
              </button>
            </div>
            
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 p-4 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-purple-500 font-mono text-sm"
              placeholder="Rédigez votre mémoire ici..."
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition duration-150"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition duration-150"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
          
          {memory?.lastModified && (
            <p className="text-sm text-gray-400 mb-4">
              Dernière modification: {memory.lastModified} par {USERS[memory.modifiedBy]?.name}
            </p>
          )}
          
          <div className="prose prose-invert max-w-none">
            {content ? (
              <div className="whitespace-pre-wrap text-gray-200">{content}</div>
            ) : (
              <p className="text-gray-400 italic">Aucun contenu pour le moment.</p>
            )}
          </div>
          
          {/* Section Remarques pour le mémoire */}
          {memory && (
            <RemarkSection
              remarks={memory.remarks || []}
              onAddRemark={(content) => onAddRemark(content)}
              currentUserId={currentUserId}
              contentOwnerId={TARGET_STUDENT_ID}
              isMemory={true}
            />
          )}
        </div>
      )}
    </div>
  );
};

// --- Composant pour les notifications ---

const NotificationCenter = ({ notifications = [], onMarkAsRead, onClearAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-700 transition-colors"
      >
        <Bell size={20} className="text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <button
              onClick={onClearAll}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Tout marquer comme lu
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-400 text-center p-4">Aucune notification</p>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-700 cursor-pointer ${!notification.read ? 'bg-gray-700/50' : ''}`}
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className={`mr-3 mt-1 ${notification.type === 'success' ? 'text-green-400' : notification.type === 'warning' ? 'text-yellow-400' : notification.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                        {notification.type === 'success' ? <Check size={16} /> : notification.type === 'warning' ? <AlertCircle size={16} /> : notification.type === 'error' ? <AlertCircle size={16} /> : <Bell size={16} />}
                      </div>
                      <div className="flex-grow">
                        <p className="text-white text-sm">{notification.message}</p>
                        <p className="text-gray-400 text-xs mt-1">{notification.timestamp}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Composant pour la gestion du compte ---

const AccountSettings = ({ currentUser, onUpdateUser, onLogout }) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || null);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  const handleAvatarChange = (e) => {
    try {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatar(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } catch (e) {
      console.error("Erreur de chargement de l'avatar:", e);
      alert("Erreur lors du chargement de l'avatar");
    }
  };
  
  const handleSaveProfile = () => {
    try {
      onUpdateUser({
        ...currentUser,
        name,
        email,
        bio,
        avatar
      });
      setIsEditing(false);
    } catch (e) {
      console.error("Erreur de sauvegarde du profil:", e);
      alert("Erreur lors de la sauvegarde du profil");
    }
  };
  
  const handleChangePassword = (e) => {
    e.preventDefault();
    
    try {
      // Vérifier que le mot de passe actuel est correct
      if (USERS[currentUser.id].password !== password) {
        alert('Mot de passe actuel incorrect');
        return;
      }
      
      // Vérifier que les nouveaux mots de passe correspondent
      if (newPassword !== confirmPassword) {
        alert('Les nouveaux mots de passe ne correspondent pas');
        return;
      }
      
      // Mettre à jour le mot de passe
      USERS[currentUser.id].password = newPassword;
      alert('Mot de passe mis à jour avec succès');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (e) {
      console.error("Erreur de changement de mot de passe:", e);
      alert("Erreur lors du changement de mot de passe");
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-extrabold text-indigo-400">Paramètres du Compte</h2>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-indigo-300">Profil</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition duration-150"
          >
            {isEditing ? 'Annuler' : 'Modifier'}
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 mb-4">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={48} className="text-gray-500" />
                </div>
              )}
            </div>
            
            {isEditing && (
              <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition duration-150 text-sm">
                <Upload size={16} className="inline mr-1" />
                Changer l'avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          <div className="flex-grow space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className={`w-full p-3 rounded-lg border ${isEditing ? 'bg-gray-700 text-white border-gray-600 focus:border-indigo-500 focus:ring-indigo-500' : 'bg-gray-700/50 text-gray-300 border-gray-600'}`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className={`w-full p-3 rounded-lg border ${isEditing ? 'bg-gray-700 text-white border-gray-600 focus:border-indigo-500 focus:ring-indigo-500' : 'bg-gray-700/50 text-gray-300 border-gray-600'}`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!isEditing}
                rows={4}
                className={`w-full p-3 rounded-lg border ${isEditing ? 'bg-gray-700 text-white border-gray-600 focus:border-indigo-500 focus:ring-indigo-500' : 'bg-gray-700/50 text-gray-300 border-gray-600'}`}
              />
            </div>
            
            {isEditing && (
              <button
                onClick={handleSaveProfile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition duration-150"
              >
                Sauvegarder les modifications
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-indigo-300">Sécurité</h3>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition duration-150"
          >
            {showPasswordForm ? 'Annuler' : 'Changer le mot de passe'}
          </button>
        </div>
        
        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition duration-150"
            >
              Mettre à jour le mot de passe
            </button>
          </form>
        )}
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-indigo-300 mb-4">Actions du compte</h3>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition duration-150 flex items-center"
        >
          <LogOut size={18} className="mr-2" />
          Déconnexion
        </button>
      </div>
    </div>
  );
};

// --- Le composant principal de l'application ---

const App = () => {
  const [data, setData] = useState({ 
    subjects: [], 
    notes: [], 
    assignments: [], 
    quizzes: [],
    memory: null,
    notifications: []
  });
  const [currentSubject, setCurrentSubject] = useState(null);
  const [currentView, setCurrentView] = useState('resources');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [viewedResource, setViewedResource] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // États d'Authentification et Thème
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('dark');

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
      let parsedData = { 
        subjects: [], 
        notes: [], 
        assignments: [], 
        quizzes: [],
        memory: null,
        notifications: []
      };
      
      if (storedData) {
        try {
          parsedData = JSON.parse(storedData);
        } catch (e) {
          console.error("Erreur de parsing des données:", e);
        }
      } else {
        // Initialiser avec un sujet par défaut
        const defaultSubject = { id: Date.now(), name: 'Introduction au React', ownerId: TARGET_STUDENT_ID, resources: [] };
        parsedData.subjects = [defaultSubject];
        
        // Ajouter des notifications par défaut
        parsedData.notifications = [
          {
            id: Date.now(),
            type: 'info',
            message: 'Bienvenue sur la plateforme d\'étude!',
            timestamp: new Date().toLocaleDateString('fr-FR'),
            read: false
          }
        ];
      }
      
      // S'assurer que toutes les propriétés existent
      parsedData.subjects = parsedData.subjects || [];
      parsedData.notes = parsedData.notes || [];
      parsedData.assignments = parsedData.assignments || [];
      parsedData.quizzes = parsedData.quizzes || [];
      parsedData.memory = parsedData.memory || null;
      parsedData.notifications = parsedData.notifications || [];
      
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        if (currentSubject) localStorage.setItem('currentSubjectId', currentSubject.id);
        if (currentUser) localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
        localStorage.setItem(THEME_KEY, theme);

        // Appliquer la classe de thème à l'élément HTML
        document.documentElement.className = theme;
      } catch (e) {
        console.error("Erreur de sauvegarde:", e);
      }
    }
  }, [data, isDataLoaded, currentSubject, currentUser, theme]);

  // --- Handlers Auth et Thème ---

  const handleLogin = (userId) => {
    try {
      const user = { id: userId, ...USERS[userId] };
      setCurrentUser(user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      
      // Ajouter une notification de connexion
      const newNotification = {
        id: Date.now(),
        type: 'success',
        message: `${user.name} s'est connecté`,
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de connexion:", e);
    }
  };

  const handleLogout = () => {
    try {
      // Ajouter une notification de déconnexion
      const newNotification = {
        id: Date.now(),
        type: 'info',
        message: `${currentUser.name} s'est déconnecté`,
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
      
      setCurrentUser(null);
      localStorage.removeItem(AUTH_KEY);
    } catch (e) {
      console.error("Erreur de déconnexion:", e);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // --- Filtrage des données (Memoization) ---

  const filteredData = useMemo(() => {
    if (!currentSubject) return { notes: [], assignments: [], resources: [] };

    // Filtre principal : Seulement le contenu créé par l'utilisateur ciblé (njie) ou l'utilisateur actuel
    const contentFilterId = currentUserRole === 'tutor' ? TARGET_STUDENT_ID : currentUserId;

    const notes = (data.notes || [])
      .filter(note => note.subjectId === currentSubject.id && (note.ownerId === contentFilterId || note.ownerId === currentUserId))
      .sort((a, b) => b.id - a.id);

    const assignments = (data.assignments || [])
      .filter(assignment => assignment.subjectId === currentSubject.id && (assignment.ownerId === contentFilterId || assignment.ownerId === currentUserId))
      .sort((a, b) => b.id - a.id);

    const resources = data.subjects?.find(s => s.id === currentSubject.id)?.resources || [];

    return { notes, assignments, resources };
  }, [data.notes, data.assignments, data.subjects, currentSubject, currentUserId, currentUserRole]);

  const { notes: currentNotes, assignments: currentAssignments, resources: currentResources } = filteredData;

  // --- Handlers Quizz ---

  const handleCreateQuiz = (quiz) => {
    try {
      setData(prev => ({
        ...prev,
        quizzes: [...(prev.quizzes || []), quiz]
      }));
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'success',
        message: `Nouveau quiz créé: ${quiz.title}`,
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de création du quiz:", e);
    }
  };

  const handleUpdateQuiz = (quizId, updatedQuiz) => {
    try {
      setData(prev => ({
        ...prev,
        quizzes: (prev.quizzes || []).map(quiz => 
          quiz.id === quizId ? { ...quiz, ...updatedQuiz } : quiz
        )
      }));
    } catch (e) {
      console.error("Erreur de mise à jour du quiz:", e);
    }
  };

  const handleDeleteQuiz = (quizId) => {
    try {
      const quiz = data.quizzes?.find(q => q.id === quizId);
      setData(prev => ({
        ...prev,
        quizzes: (prev.quizzes || []).filter(quiz => quiz.id !== quizId)
      }));
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'warning',
        message: `Quiz supprimé: ${quiz?.title}`,
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de suppression du quiz:", e);
    }
  };

  const handleTakeQuiz = (quizId, result) => {
    try {
      setData(prev => ({
        ...prev,
        quizzes: (prev.quizzes || []).map(quiz => 
          quiz.id === quizId 
            ? { ...quiz, results: [...(quiz.results || []), result] }
            : quiz
        )
      }));
      
      // Ajouter une notification
      const quiz = data.quizzes?.find(q => q.id === quizId);
      const newNotification = {
        id: Date.now(),
        type: 'info',
        message: `Quiz complété: ${quiz?.title} - Score: ${result.percentage}%`,
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de soumission du quiz:", e);
    }
  };

  // --- Handlers Mémoire ---

  const handleSaveMemory = (memoryData) => {
    try {
      setData(prev => ({
        ...prev,
        memory: { ...(prev.memory || {}), ...memoryData }
      }));
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'success',
        message: 'Mémoire sauvegardé avec succès',
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de sauvegarde du mémoire:", e);
    }
  };

  const handleAddMemoryRemark = (remarkContent) => {
    try {
      if (!data.memory) {
        // Créer le mémoire s'il n'existe pas
        setData(prev => ({
          ...prev,
          memory: {
            title: 'Mon Mémoire',
            content: '',
            remarks: [{
              content: remarkContent,
              authorId: currentUserId,
              timestamp: new Date().toLocaleDateString('fr-FR'),
            }]
          }
        }));
      } else {
        setData(prev => ({
          ...prev,
          memory: {
            ...prev.memory,
            remarks: [...(prev.memory.remarks || []), {
              content: remarkContent,
              authorId: currentUserId,
              timestamp: new Date().toLocaleDateString('fr-FR'),
            }]
          }
        }));
      }
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'info',
        message: 'Nouvelle remarque ajoutée au mémoire',
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur d'ajout de remarque au mémoire:", e);
    }
  };

  // --- Handlers Notifications ---

  const handleMarkNotificationAsRead = (notificationId) => {
    try {
      setData(prev => ({
        ...prev,
        notifications: (prev.notifications || []).map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      }));
    } catch (e) {
      console.error("Erreur de marquage de notification:", e);
    }
  };

  const handleClearAllNotifications = () => {
    try {
      setData(prev => ({
        ...prev,
        notifications: (prev.notifications || []).map(notification => ({
          ...notification,
          read: true
        }))
      }));
    } catch (e) {
      console.error("Erreur de nettoyage des notifications:", e);
    }
  };

  // --- Handlers Compte ---

  const handleUpdateUser = (userData) => {
    try {
      setCurrentUser(userData);
      USERS[currentUserId] = { ...USERS[currentUserId], ...userData };
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'success',
        message: 'Profil mis à jour avec succès',
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de mise à jour du profil:", e);
    }
  };

  // --- Handlers Matières (CRUD) ---

  const handleAddSubject = () => {
    try {
      const name = newSubjectName.trim();
      if (name && !data.subjects?.find(s => s.name === name)) {
        const newSubject = { id: Date.now(), name: name, ownerId: currentUserId, resources: [] };
        setData(prev => ({ ...prev, subjects: [...(prev.subjects || []), newSubject] }));
        setCurrentSubject(newSubject);
        setNewSubjectName('');
        
        // Ajouter une notification
        const newNotification = {
          id: Date.now(),
          type: 'success',
          message: `Nouvelle matière ajoutée: ${name}`,
          timestamp: new Date().toLocaleDateString('fr-FR'),
          read: false
        };
        
        setData(prev => ({
          ...prev,
          notifications: [newNotification, ...(prev.notifications || [])]
        }));
      }
    } catch (e) {
      console.error("Erreur d'ajout de matière:", e);
    }
  };

  const handleDeleteSubject = (idToDelete) => {
    try {
      if (window.confirm("Êtes-vous sûr de vouloir supprimer cette matière et toutes ses données associées ?")) {
        const subject = data.subjects?.find(s => s.id === idToDelete);
        const remainingSubjects = (data.subjects || []).filter(s => s.id !== idToDelete);
        setData(prev => ({
          subjects: remainingSubjects,
          notes: (prev.notes || []).filter(n => n.subjectId !== idToDelete),
          assignments: (prev.assignments || []).filter(a => a.subjectId !== idToDelete),
        }));
        if (currentSubject && currentSubject.id === idToDelete) {
          setCurrentSubject(remainingSubjects.length > 0 ? remainingSubjects[0] : null);
        }
        
        // Ajouter une notification
        const newNotification = {
          id: Date.now(),
          type: 'warning',
          message: `Matière supprimée: ${subject?.name}`,
          timestamp: new Date().toLocaleDateString('fr-FR'),
          read: false
        };
        
        setData(prev => ({
          ...prev,
          notifications: [newNotification, ...(prev.notifications || [])]
        }));
      }
    } catch (e) {
      console.error("Erreur de suppression de matière:", e);
    }
  };

  // --- Handlers Notes ---

  const handleSaveNote = () => {
    try {
      if (!currentSubject || currentNote.trim() === '') return;

      const newNote = {
        id: Date.now(),
        subjectId: currentSubject.id,
        content: currentNote.trim(),
        timestamp: new Date().toLocaleString('fr-FR'),
        ownerId: currentUserId,
        remarks: [],
      };

      setData(prev => ({ ...prev, notes: [newNote, ...(prev.notes || [])] }));
      setCurrentNote('');
      setNoteMessage('Note enregistrée avec succès !');
      setTimeout(() => setNoteMessage(''), 3000);
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'success',
        message: 'Nouvelle note enregistrée',
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de sauvegarde de note:", e);
    }
  };

  const handleAddNoteRemark = (noteId, remarkContent) => {
    try {
      setData(prev => ({
        ...prev,
        notes: (prev.notes || []).map(note =>
          note.id === noteId
            ? {
                ...note,
                remarks: [...(note.remarks || []), {
                  content: remarkContent,
                  authorId: currentUserId,
                  timestamp: new Date().toLocaleDateString('fr-FR'),
                }]
              }
            : note
        )
      }));
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'info',
        message: 'Nouvelle remarque ajoutée à une note',
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur d'ajout de remarque à note:", e);
    }
  };

  const handleDeleteNote = (idToDelete) => {
    try {
      setData(prev => ({
        ...prev,
        notes: (prev.notes || []).filter(n => n.id !== idToDelete)
      }));
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'warning',
        message: 'Note supprimée',
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de suppression de note:", e);
    }
  };

  // --- Handlers Devoirs ---

  const handleAddAssignment = (e) => {
    try {
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
        ownerId: currentUserId,
        remarks: [],
      };

      setData(prev => ({ ...prev, assignments: [newAssignment, ...(prev.assignments || [])] }));
      e.target.reset();
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'success',
        message: `Nouveau devoir rendu: ${title}`,
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur d'ajout de devoir:", e);
    }
  };

  const handleAddAssignmentRemark = (assignmentId, remarkContent) => {
    try {
      setData(prev => ({
        ...prev,
        assignments: (prev.assignments || []).map(assignment =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                remarks: [...(assignment.remarks || []), {
                  content: remarkContent,
                  authorId: currentUserId,
                  timestamp: new Date().toLocaleDateString('fr-FR'),
                }]
              }
            : assignment
        )
      }));
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'info',
        message: 'Nouvelle remarque ajoutée à un devoir',
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur d'ajout de remarque à devoir:", e);
    }
  };

  const handleDeleteAssignment = (idToDelete) => {
    try {
      setData(prev => ({
        ...prev,
        assignments: (prev.assignments || []).filter(a => a.id !== idToDelete)
      }));
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'warning',
        message: 'Devoir supprimé',
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de suppression de devoir:", e);
    }
  };

  // --- Handlers Ressources ---

  const handleFileChange = (e) => {
    try {
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
    } catch (e) {
      console.error("Erreur de changement de fichier:", e);
      setResourceForm(prev => ({ ...prev, uploading: false, error: "Erreur lors du traitement du fichier." }));
    }
  };

  const handleResourceFormChange = (e) => {
    try {
      const { name, value } = e.target;
      setResourceForm(prev => ({ ...prev, [name]: value }));
      if (name === 'type' && (value === 'texte' || value === 'url')) {
          setResourceForm(prev => ({ ...prev, file: null, fileData: null, mimeType: '' }));
      }
    } catch (e) {
      console.error("Erreur de changement de formulaire:", e);
    }
  };

  const handleAddResource = (e) => {
    try {
      e.preventDefault();
      if (!currentSubject || !resourceForm.title.trim()) return;

      const { title, type, description, fileData, mimeType } = resourceForm;
      let resourceContent = description.trim();

      if (type !== 'url' && type !== 'texte' && !fileData) {
        setResourceForm(prev => ({ ...prev, error: "Veuillez joindre un fichier ou choisir le type Texte/URL." }));
        return;
      }
      
      const contentDataFile = (type !== 'url' && type !== 'texte') ? fileData : null;

      const newResource = {
        id: Date.now(),
        title: title.trim(),
        type: type,
        description: resourceContent,
        contentData: contentDataFile,
        mimeType: mimeType,
        dateAdded: new Date().toLocaleDateString('fr-FR'),
        ownerId: currentSubject.ownerId,
      };

      // Mettre à jour la matière
      setData(prev => ({
        ...prev,
        subjects: (prev.subjects || []).map(subject =>
          subject.id === currentSubject.id
            ? { ...subject, resources: [...(subject.resources || []), newResource] }
            : subject
        )
      }));

      // Réinitialiser le formulaire
      setResourceForm({ title: '', type: 'pdf', description: '', file: null, fileData: null, mimeType: '', uploading: false, error: '' });
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'success',
        message: `Nouvelle ressource ajoutée: ${title}`,
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur d'ajout de ressource:", e);
      setResourceForm(prev => ({ ...prev, error: "Erreur lors de l'ajout de la ressource." }));
    }
  };

  const handleDeleteResource = (resourceId) => {
    try {
      const resource = currentResources.find(r => r.id === resourceId);
      setData(prev => ({
        ...prev,
        subjects: (prev.subjects || []).map(subject =>
          subject.id === currentSubject.id
            ? { ...subject, resources: (subject.resources || []).filter(r => r.id !== resourceId) }
            : subject
        )
      }));
      
      // Ajouter une notification
      const newNotification = {
        id: Date.now(),
        type: 'warning',
        message: `Ressource supprimée: ${resource?.title}`,
        timestamp: new Date().toLocaleDateString('fr-FR'),
        read: false
      };
      
      setData(prev => ({
        ...prev,
        notifications: [newNotification, ...(prev.notifications || [])]
      }));
    } catch (e) {
      console.error("Erreur de suppression de ressource:", e);
    }
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
    if (!currentSubject && currentView !== 'quizz' && currentView !== 'statistics' && currentView !== 'memory' && currentView !== 'account') {
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
                    <label className={`font-medium whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Fichier (Max 10Mo)</label>
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
                          remarks={note.remarks || []}
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
                  <label className={`font-medium whitespace-nowrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Joindre un Fichier (Max 10 Mo)</label>
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
                          remarks={assignment.remarks || []}
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

      case 'quizz':
        return (
          <QuizManager
            quizzes={data.quizzes || []}
            onCreateQuiz={handleCreateQuiz}
            onUpdateQuiz={handleUpdateQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onTakeQuiz={handleTakeQuiz}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        );

      case 'statistics':
        return (
          <StatisticsDashboard
            data={data}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        );

      case 'memory':
        return (
          <MemorySection
            memory={data.memory}
            onSaveMemory={handleSaveMemory}
            onAddRemark={handleAddMemoryRemark}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        );

      case 'account':
        return (
          <AccountSettings
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
          />
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
          {data.subjects?.length === 0 ? (
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
                  {currentView === 'quizz' ? 'Quizz' : 
                   currentView === 'statistics' ? 'Statistiques' : 
                   currentView === 'memory' ? 'Mémoire' : 
                   currentView === 'account' ? 'Mon Compte' :
                   currentSubject ? currentSubject.name : 'Sélectionnez une Matière'}
                </h2>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Centre de notifications */}
                <NotificationCenter
                  notifications={data.notifications || []}
                  onMarkAsRead={handleMarkNotificationAsRead}
                  onClearAll={handleClearAllNotifications}
                />
                
                {/* Toggle Thème */}
                <button onClick={toggleTheme} className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`} aria-label="Changer de thème">
                    {theme === 'dark' ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-gray-700" />}
                </button>
                <div className="hidden sm:flex items-center space-x-2">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                    ) : (
                      <User size={24} className="text-indigo-400"/>
                    )}
                    <span className={`text-lg font-medium ${themeClasses.text}`}>{currentUser?.name}</span>
                </div>
            </div>
        </header>

        {/* Barre de navigation des vues (Onglets) */}
        <nav className={`flex ${themeClasses.tabBg} p-2 shadow-inner flex-shrink-0 overflow-x-auto`}>
          {['resources', 'notes', 'assignments', 'quizz', 'statistics', 'memory', 'account'].map(view => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`flex-1 py-3 px-2 sm:px-4 text-sm sm:text-lg font-semibold rounded-lg transition duration-200 uppercase tracking-wider whitespace-nowrap
                ${currentView === view
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : `${theme === 'dark' ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-200'}`}`
              }
            >
              {view === 'resources' ? 'Ressources' : 
               view === 'notes' ? 'Notes' : 
               view === 'assignments' ? 'Devoirs' : 
               view === 'quizz' ? 'Quizz' : 
               view === 'statistics' ? 'Stats' : 
               view === 'memory' ? 'Mémoire' : 
               'Compte'}
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