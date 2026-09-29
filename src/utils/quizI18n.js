// Quiz Localization Dictionary & Utilities

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🚩' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

export const UI_TRANSLATIONS = {
    en: {
        quizTitle: 'Quiz',
        question: 'Question',
        of: 'of',
        course: 'Course',
        timeLeft: 'Time Left',
        noTimeLimit: 'No Time Limit',
        previous: 'Previous',
        next: 'Next',
        submitQuiz: 'Submit Quiz',
        clearAnswer: 'Clear Answer',
        flagForReview: 'Flag for Review',
        flagged: 'Flagged',
        answered: 'Answered',
        unanswered: 'Unanswered',
        quizSummary: 'Quiz Summary',
        confirmSubmit: 'Are you sure you want to submit your quiz answers?',
        answeredCountMsg: (ans, total) => `You have answered ${ans} out of ${total} questions.`,
        unansweredWarning: (count) => `Warning: You have ${count} unanswered questions!`,
        cancel: 'Cancel',
        confirm: 'Confirm & Submit',
        submitting: 'Submitting...',
        quizCompleted: 'Quiz Completed!',
        yourScore: 'Your Score',
        percentage: 'Percentage',
        timeSpent: 'Time Spent',
        passed: 'PASSED 🎉',
        needsImprovement: 'NEEDS IMPROVEMENT 📚',
        reviewAnswers: 'Review Answers',
        backToQuizzes: 'Back to Quizzes',
        correctAnswer: 'Correct Answer',
        yourAnswer: 'Your Answer',
        notAnswered: 'Not Answered',
        explanation: 'Explanation',
        selectLanguage: 'Language',
        autoTranslate: 'Auto Translate',
    },
    hi: {
        quizTitle: 'प्रश्नोत्तरी (क्विज़)',
        question: 'प्रश्न',
        of: 'का',
        course: 'पाठ्यक्रम',
        timeLeft: 'शेष समय',
        noTimeLimit: 'कोई समय सीमा नहीं',
        previous: 'पिछला',
        next: 'अगला',
        submitQuiz: 'क्विज़ जमा करें',
        clearAnswer: 'उत्तर हटाएं',
        flagForReview: 'समीक्षा के लिए चिह्नित करें',
        flagged: 'चिह्नित',
        answered: 'उत्तर दिया गया',
        unanswered: 'अनुत्तरित',
        quizSummary: 'क्विज़ सारांश',
        confirmSubmit: 'क्या आप सुनिश्चित हैं कि आप अपने उत्तर सबमिट करना चाहते हैं?',
        answeredCountMsg: (ans, total) => `आपने ${total} में से ${ans} प्रश्नों का उत्तर दिया है।`,
        unansweredWarning: (count) => `चेतावनी: आपके पास ${count} अनुत्तरित प्रश्न हैं!`,
        cancel: 'रद्द करें',
        confirm: 'पुष्टि करें और सबमिट करें',
        submitting: 'सबमिट किया जा रहा है...',
        quizCompleted: 'क्विज़ पूर्ण!',
        yourScore: 'आपका स्कोर',
        percentage: 'प्रतिशत',
        timeSpent: 'लिया गया समय',
        passed: 'उत्तीर्ण 🎉',
        needsImprovement: 'सुधार की आवश्यकता 📚',
        reviewAnswers: 'उत्तरों की समीक्षा करें',
        backToQuizzes: 'क्विज़ पर वापस जाएँ',
        correctAnswer: 'सही उत्तर',
        yourAnswer: 'आपका उत्तर',
        notAnswered: 'उत्तर नहीं दिया गया',
        explanation: 'व्याख्या',
        selectLanguage: 'भाषा',
        autoTranslate: 'ऑटो अनुवाद',
    },
    mr: {
        quizTitle: 'स्वाध्याय (क्विझ)',
        question: 'प्रश्न',
        of: 'पैकी',
        course: 'अभ्यासक्रम',
        timeLeft: 'उरलेला वेळ',
        noTimeLimit: 'वेळेची मर्यादा नाही',
        previous: 'मागील',
        next: 'पुढील',
        submitQuiz: 'क्विझ सादर करा',
        clearAnswer: 'उत्तर हटवा',
        flagForReview: 'पुनरावलोकनासाठी चिन्हांकित करा',
        flagged: 'चिन्हांकित',
        answered: 'उत्तर दिलेले',
        unanswered: 'अनुत्तरित',
        quizSummary: 'क्विझ सारांश',
        confirmSubmit: 'तुम्ही तुमचे उत्तर सबमिट करू इच्छिता याची खात्री आहे का?',
        answeredCountMsg: (ans, total) => `तुम्ही ${total} पैकी ${ans} प्रश्नांची उत्तरे दिली आहेत.`,
        unansweredWarning: (count) => `तकीद: तुमच्याकडे ${count} अनुत्तरित प्रश्न आहेत!`,
        cancel: 'रद्द करा',
        confirm: 'नक्की सबमिट करा',
        submitting: 'सबमिट करत आहे...',
        quizCompleted: 'क्विझ पूर्ण झाली!',
        yourScore: 'तुमचा गुण',
        percentage: 'टक्केवारी',
        timeSpent: 'घेतलेला वेळ',
        passed: 'उत्तीर्ण 🎉',
        needsImprovement: 'सुधारणेची गरज 📚',
        reviewAnswers: 'उत्तरे तपासा',
        backToQuizzes: 'क्विझवर परत जा',
        correctAnswer: 'योग्य उत्तर',
        yourAnswer: 'तुमचे उत्तर',
        notAnswered: 'उत्तर दिलेले नाही',
        explanation: 'स्पष्टीकरण',
        selectLanguage: 'भाषा',
        autoTranslate: 'स्वयंचलित भाषांतर',
    },
    es: {
        quizTitle: 'Cuestionario',
        question: 'Pregunta',
        of: 'de',
        course: 'Curso',
        timeLeft: 'Tiempo restante',
        noTimeLimit: 'Sin límite de tiempo',
        previous: 'Anterior',
        next: 'Siguiente',
        submitQuiz: 'Enviar Cuestionario',
        clearAnswer: 'Borrar Respuesta',
        flagForReview: 'Marcar para revisar',
        flagged: 'Marcada',
        answered: 'Respondidas',
        unanswered: 'Sin responder',
        quizSummary: 'Resumen del cuestionario',
        confirmSubmit: '¿Estás seguro de que deseas enviar tus respuestas?',
        answeredCountMsg: (ans, total) => `Has respondido ${ans} de ${total} preguntas.`,
        unansweredWarning: (count) => `¡Advertencia: Tienes ${count} preguntas sin responder!`,
        cancel: 'Cancelar',
        confirm: 'Confirmar y Enviar',
        submitting: 'Enviando...',
        quizCompleted: '¡Cuestionario Completado!',
        yourScore: 'Tu Puntuación',
        percentage: 'Porcentaje',
        timeSpent: 'Tiempo Empleado',
        passed: 'APROBADO 🎉',
        needsImprovement: 'NECESITA MEJORAR 📚',
        reviewAnswers: 'Revisar Respuestas',
        backToQuizzes: 'Volver a Cuestionarios',
        correctAnswer: 'Respuesta Correcta',
        yourAnswer: 'Tu Respuesta',
        notAnswered: 'No respondida',
        explanation: 'Explicación',
        selectLanguage: 'Idioma',
        autoTranslate: 'Traducción Automática',
    },
    fr: {
        quizTitle: 'Quiz',
        question: 'Question',
        of: 'sur',
        course: 'Cours',
        timeLeft: 'Temps restant',
        noTimeLimit: 'Pas de limite de temps',
        previous: 'Précédent',
        next: 'Suivant',
        submitQuiz: 'Soumettre le Quiz',
        clearAnswer: 'Effacer la réponse',
        flagForReview: 'Marquer pour révision',
        flagged: 'Marquée',
        answered: 'Répondu',
        unanswered: 'Sans réponse',
        quizSummary: 'Résumé du Quiz',
        confirmSubmit: 'Êtes-vous sûr de vouloir soumettre vos réponses ?',
        answeredCountMsg: (ans, total) => `Vous avez répondu à ${ans} sur ${total} questions.`,
        unansweredWarning: (count) => `Attention : Vous avez ${count} questions sans réponse !`,
        cancel: 'Annuler',
        confirm: 'Confirmer et soumettre',
        submitting: 'Soumission...',
        quizCompleted: 'Quiz Terminé !',
        yourScore: 'Votre Score',
        percentage: 'Pourcentage',
        timeSpent: 'Temps Passé',
        passed: 'RÉUSSI 🎉',
        needsImprovement: 'À AMÉLIORER 📚',
        reviewAnswers: 'Revoir les Réponses',
        backToQuizzes: 'Retour aux Quiz',
        correctAnswer: 'Bonne Réponse',
        yourAnswer: 'Votre Réponse',
        notAnswered: 'Non répondu',
        explanation: 'Explication',
        selectLanguage: 'Langue',
        autoTranslate: 'Traduction Automatique',
    },
    de: {
        quizTitle: 'Quiz',
        question: 'Frage',
        of: 'von',
        course: 'Kurs',
        timeLeft: 'Verbleibende Zeit',
        noTimeLimit: 'Keine Zeitbegrenzung',
        previous: 'Zurück',
        next: 'Weiter',
        submitQuiz: 'Quiz einreichen',
        clearAnswer: 'Antwort löschen',
        flagForReview: 'Zur Überprüfung markieren',
        flagged: 'Markiert',
        answered: 'Beantwortet',
        unanswered: 'Unbeantwortet',
        quizSummary: 'Quiz-Zusammenfassung',
        confirmSubmit: 'Sind Sie sicher, dass Sie Ihre Antworten einreichen möchten?',
        answeredCountMsg: (ans, total) => `Sie haben ${ans} von ${total} Fragen beantwortet.`,
        unansweredWarning: (count) => `Warnung: Sie haben ${count} unbeantwortete Fragen!`,
        cancel: 'Abbrechen',
        confirm: 'Bestätigen & Einreichen',
        submitting: 'Wird eingereicht...',
        quizCompleted: 'Quiz beendet!',
        yourScore: 'Ihre Punktzahl',
        percentage: 'Prozentsatz',
        timeSpent: 'Benötigte Zeit',
        passed: 'BESTANDEN 🎉',
        needsImprovement: 'VERBESSERUNGSBEDÜRFTIG 📚',
        reviewAnswers: 'Antworten überprüfen',
        backToQuizzes: 'Zurück zu den Quizzes',
        correctAnswer: 'Richtige Antwort',
        yourAnswer: 'Ihre Antwort',
        notAnswered: 'Nicht beantwortet',
        explanation: 'Erklärung',
        selectLanguage: 'Sprache',
        autoTranslate: 'Automatische Übersetzung',
    }
};

/**
 * Get localized UI text string
 */
export const t = (key, lang = 'en', ...args) => {
    const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS['en'];
    const val = dict[key] || UI_TRANSLATIONS['en'][key] || key;
    if (typeof val === 'function') {
        return val(...args);
    }
    return val;
};

/**
 * Get localized question text with fallback to standard question prompt
 */
export const getLocalizedQuestionText = (questionObj, lang = 'en') => {
    if (!questionObj) return '';
    const defaultText = questionObj.q || questionObj.question || '';
    if (lang === 'en' || !questionObj.translations || !questionObj.translations[lang]) {
        return defaultText;
    }
    return questionObj.translations[lang].q || questionObj.translations[lang].question || defaultText;
};

/**
 * Get localized option text for a given key ('a', 'b', 'c', 'd') with fallback
 */
export const getLocalizedOptionText = (questionObj, optKey, lang = 'en') => {
    if (!questionObj || !questionObj.options) return '';
    const defaultText = questionObj.options[optKey] || '';
    if (lang === 'en' || !questionObj.translations || !questionObj.translations[lang]) {
        return defaultText;
    }
    const langOpts = questionObj.translations[lang].options;
    return (langOpts && langOpts[optKey]) ? langOpts[optKey] : defaultText;
};

/**
 * Get localized explanation text with fallback
 */
export const getLocalizedExplanationText = (questionObj, lang = 'en') => {
    if (!questionObj) return '';
    if (lang === 'en' || !questionObj.translations || !questionObj.translations[lang]) {
        return questionObj.explanation || '';
    }
    return questionObj.translations[lang].explanation || questionObj.explanation || '';
};

/**
 * Auto-translate single text via client fetch API
 */
export const autoTranslateText = async (text, targetLang) => {
    if (!text || !targetLang || targetLang === 'en') return text;
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
        const data = await res.json();
        if (data && data[0]) {
            return data[0].map(item => item[0]).join('');
        }
    } catch (err) {
        console.warn('Auto translation failed:', err);
    }
    return text;
};

