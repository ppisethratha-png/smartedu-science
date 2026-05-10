document.addEventListener('DOMContentLoaded', () => {
    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW failed', err));
        });
    }

    // --- State Management ---
    let state = {
        lang: 'en',
        grade: 'all',
        xp: 350,
        activeSection: 'chat',
        questionsAsked: 12, // Initial from HTML
        quizAttempts: 20,   // Initial simulation
        quizCorrect: 17     // 85% from HTML
    };

    let factIndex = 0;

    const DOM = {
        chatMessages: document.getElementById('chat-messages'),
        userInput: document.getElementById('user-input'),
        sendBtn: document.getElementById('send-btn'),
        micBtn: document.getElementById('mic-btn'),
        quizContainer: document.getElementById('quiz-container'),
        librarySection: document.getElementById('library-section'),
        xpFill: document.getElementById('xp-fill'),
        xpValue: document.querySelector('.xp-value'),
        searchInput: document.getElementById('search-input'),
        achievementToast: document.getElementById('achievement-toast'),
        starsContainer: document.getElementById('stars-container'),
        questionsAsked: document.querySelector('.stat-item:nth-child(1) .value'),
        quizScore: document.querySelector('.stat-item:nth-child(2) .value'),
        factText: document.getElementById('fact-text'),
        libLessonsGrid: document.querySelector('.library-grid-lessons'),
        wsGradeSelect: document.getElementById('ws-grade-select'),
        wsTopicInput: document.getElementById('ws-topic-input'),
        wsGenerateBtn: document.getElementById('generate-ws-btn'),
        wsResult: document.getElementById('worksheet-result')
    };

    // --- Starry Background ---
    const generateStars = () => {
        if (!DOM.starsContainer) return;
        for (let i = 0; i < 120; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            const size = Math.random() * 3 + 'px';
            star.style.width = size; star.style.height = size;
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
            DOM.starsContainer.appendChild(star);
        }
    };
    generateStars();

    // --- UI Update Helpers ---
    const updateXP = (amount) => {
        state.xp += amount;
        if (DOM.xpValue) DOM.xpValue.textContent = `${state.xp} XP`;
        if (DOM.xpFill) DOM.xpFill.style.width = (state.xp % 1000) / 10 + '%';
        if (amount >= 50) showAchievement(state.lang === 'en' ? "Great Job!" : "អស្ចារ្យណាស់!", `+${amount} XP`);
    };

    const updateStats = () => {
        if (DOM.questionsAsked) DOM.questionsAsked.textContent = state.questionsAsked;
        if (DOM.quizScore) {
            const score = state.quizAttempts > 0 ? Math.round((state.quizCorrect / state.quizAttempts) * 100) : 0;
            DOM.quizScore.textContent = `${score}%`;
        }
    };

    const showAchievement = (title, desc) => {
        if (!DOM.achievementToast) return;
        document.getElementById('ach-title').textContent = title;
        document.getElementById('ach-desc').textContent = desc;
        DOM.achievementToast.classList.add('show');
        setTimeout(() => DOM.achievementToast.classList.remove('show'), 4000);
    };

    const updateLanguage = (lang) => {
        state.lang = lang;
        document.querySelectorAll('[data-en]').forEach(el => {
            el.textContent = el.getAttribute(`data-${lang}`);
        });
        if (DOM.userInput) DOM.userInput.placeholder = lang === 'en' ? 'Ask a science question...' : 'សួរសំណួរវិទ្យាសាស្ត្រ...';
        if (DOM.searchInput) DOM.searchInput.placeholder = lang === 'en' ? 'Search science topics...' : 'ស្វែងរកប្រធានបទវិទ្យាសាស្ត្រ...';
        if (DOM.wsTopicInput) DOM.wsTopicInput.placeholder = lang === 'en' ? 'e.g. Photosynthesis' : 'ឧទាហរណ៍៖ រស្មីសំយោគ';
        if (DOM.factText) DOM.factText.textContent = SCIENCE_FACTS[factIndex][state.lang];
        
        document.getElementById('lang-en').classList.toggle('active', lang === 'en');
        document.getElementById('lang-kh').classList.toggle('active', lang === 'kh');
        renderAll();
    };

    // --- Core Rendering ---
    const renderAll = () => {
        const searchTerm = DOM.searchInput ? DOM.searchInput.value.toLowerCase() : "";
        
        // Render Quiz Section
        if (DOM.quizContainer) {
            DOM.quizContainer.innerHTML = '';
            Object.keys(SCIENCE_DATA).forEach(gradeKey => {
                if (state.grade !== 'all' && state.grade !== gradeKey) return;
                const grade = SCIENCE_DATA[gradeKey];
                grade.lessons.forEach(lesson => {
                    if (searchTerm && !lesson.title[state.lang].toLowerCase().includes(searchTerm)) return;
                    
                    const card = document.createElement('div');
                    card.className = 'lesson-card';
                    card.innerHTML = `
                        <div class="lesson-tag">${grade.title[state.lang]}</div>
                        <h3>${lesson.title[state.lang]}</h3>
                        <p>${lesson.content[state.lang].substring(0, 80)}...</p>
                        <button class="read-btn action-quiz" data-grade="${gradeKey}" data-lesson="${lesson.id}">
                            ${state.lang === 'en' ? 'Start Quiz' : 'ចាប់ផ្តើម'}
                        </button>
                    `;
                    DOM.quizContainer.appendChild(card);
                });
            });
        }

        // Render Library Section (Textbooks)
        const libGrid = DOM.librarySection ? DOM.librarySection.querySelector('.library-grid') : null;
        if (libGrid) {
            libGrid.innerHTML = '';
            TEXTBOOKS.forEach(book => {
                if (state.grade !== 'all' && state.grade !== book.grade) return;
                const card = document.createElement('div');
                card.className = 'lesson-card';
                card.style.borderLeft = '4px solid var(--accent-blue)';
                card.innerHTML = `
                    <div class="lesson-tag" style="background:var(--accent-blue)">${state.lang === 'en' ? 'Textbook' : 'សៀវភៅពុម្ព'}</div>
                    <h3>${book.title[state.lang]}</h3>
                    <p>${state.lang === 'en' ? 'Official Ministry Textbook (PDF)' : 'សៀវភៅពុម្ពផ្លូវការពីក្រសួង (PDF)'}</p>
                    <a href="${book.file}" target="_blank" class="read-btn" style="text-decoration:none; text-align:center;">
                        ${state.lang === 'en' ? 'Open PDF' : 'បើកមើល PDF'}
                    </a>
                `;
                libGrid.appendChild(card);
            });
        }

        // Render Library Section (Lessons)
        if (DOM.libLessonsGrid) {
            DOM.libLessonsGrid.innerHTML = '';
            Object.keys(SCIENCE_DATA).forEach(gradeKey => {
                if (state.grade !== 'all' && state.grade !== gradeKey) return;
                SCIENCE_DATA[gradeKey].lessons.forEach(lesson => {
                    if (searchTerm && !lesson.title[state.lang].toLowerCase().includes(searchTerm)) return;
                    const card = document.createElement('div');
                    card.className = 'lesson-card';
                    card.innerHTML = `
                        <div class="lesson-tag" style="background:var(--accent-purple)">${SCIENCE_DATA[gradeKey].title[state.lang]}</div>
                        <h3>${lesson.title[state.lang]}</h3>
                        <p>${lesson.content[state.lang].substring(0, 100)}...</p>
                        <button class="read-btn action-read" data-grade="${gradeKey}" data-lesson="${lesson.id}">
                            ${state.lang === 'en' ? 'Read Lesson' : 'អានមេរៀន'}
                        </button>
                    `;
                    DOM.libLessonsGrid.appendChild(card);
                });
            });
        }
    };

    // --- Global Event Listener (Event Delegation) ---
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Navigation
        const navItem = target.closest('.nav-item');
        if (navItem) {
            const sectionId = navItem.id.replace('btn-', '') + '-section';
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            navItem.classList.add('active');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) targetSection.classList.add('active');
        }

        // Language
        if (target.id === 'lang-en') updateLanguage('en');
        if (target.id === 'lang-kh') updateLanguage('kh');

        // Grade Selection
        if (target.classList.contains('grade-chip')) {
            document.querySelectorAll('.grade-chip').forEach(c => c.classList.remove('active'));
            target.classList.add('active');
            state.grade = target.getAttribute('data-grade');
            renderAll();
        }

        // Quiz Action
        if (target.classList.contains('action-quiz')) {
            const grade = target.dataset.grade;
            const lessonId = target.dataset.lesson;
            const lesson = SCIENCE_DATA[grade].lessons.find(l => l.id === lessonId);
            const quiz = lesson.quizzes[0];
            
            const choice = prompt(`${quiz.question[state.lang]}\n\n${quiz.options.map((o, i) => `${i+1}. ${o}`).join('\n')}`);
            state.quizAttempts++;
            if (choice == (quiz.correct + 1)) {
                state.quizCorrect++;
                updateXP(50);
                alert(state.lang === 'en' ? "Correct! +50 XP" : "ត្រឹមត្រូវ! +50 XP");
            } else if (choice !== null) {
                alert(state.lang === 'en' ? "Try again! 😊" : "ព្យាមយាមម្តងទៀត! 😊");
            }
            updateStats();
        }

        // Read Action
        if (target.classList.contains('action-read')) {
            const grade = target.dataset.grade;
            const lessonId = target.dataset.lesson;
            const lesson = SCIENCE_DATA[grade].lessons.find(l => l.id === lessonId);
            alert(`${lesson.title[state.lang]}\n\n${lesson.content[state.lang]}`);
            updateXP(5);
        }
    });

    // --- Chat Logic ---
    const addMessage = (text, isUser = false) => {
        if (!DOM.chatMessages) return;
        const div = document.createElement('div');
        div.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        div.innerHTML = `<div class="message-content"><p>${text}</p></div>`;
        DOM.chatMessages.appendChild(div);
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    };

    const handleChat = () => {
        if (!DOM.userInput) return;
        const queryText = DOM.userInput.value.trim();
        const query = queryText.toLowerCase();
        if (!query) return;
        
        addMessage(queryText, true);
        DOM.userInput.value = '';
        state.questionsAsked++;
        updateStats();

        setTimeout(() => {
            let res = '';
            let found = false;
            
            // Search in SCIENCE_DATA for relevant keywords
            for (const gradeKey in SCIENCE_DATA) {
                const grade = SCIENCE_DATA[gradeKey];
                for (const lesson of grade.lessons) {
                    if (lesson.title[state.lang].toLowerCase().includes(query) || 
                        lesson.content[state.lang].toLowerCase().includes(query) ||
                        query.includes(lesson.title[state.lang].toLowerCase())) {
                        res = lesson.content[state.lang];
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            if (!found) {
                res = state.lang === 'en' ? 
                    "I'm your Science Assistant! I can help with topics like photosynthesis, plant adaptation, or human senses. Try asking about one of those!" : 
                    "ខ្ញុំជាជំនួយការវិទ្យាសាស្ត្ររបស់អ្នក! ខ្ញុំអាចជួយលើប្រធានបទដូចជា រស្មីសំយោគ ការសម្របខ្លួនរបស់រុក្ខជាតិ ឬវិញ្ញាណរបស់មនុស្ស។ សាកល្បងសួរអំពីចំណុចទាំងនេះ!";
            }
            
            addMessage(res);
            updateXP(10);
        }, 800);
    };

    if (DOM.sendBtn) DOM.sendBtn.addEventListener('click', handleChat);
    if (DOM.userInput) DOM.userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });
    if (DOM.searchInput) DOM.searchInput.addEventListener('input', renderAll);

    // Worksheet Generator Logic
    const generateWorksheet = () => {
        const gradeKey = DOM.wsGradeSelect.value;
        const topic = DOM.wsTopicInput.value.trim().toLowerCase();
        
        if (!topic) {
            alert(state.lang === 'en' ? "Please enter a topic!" : "សូមបញ្ចូលប្រធានបទមេរៀន!");
            return;
        }

        // Show loading state
        DOM.wsResult.innerHTML = `<div class="empty-ws-state"><p>${state.lang === 'en' ? 'Generating...' : 'កំពុងបង្កើត...'}</p></div>`;

        setTimeout(() => {
            let selectedLesson = null;
            // Search for lesson
            const lessons = SCIENCE_DATA[gradeKey].lessons;
            selectedLesson = lessons.find(l => 
                l.title.en.toLowerCase().includes(topic) || 
                l.title.kh.toLowerCase().includes(topic)
            );

            if (!selectedLesson) {
                DOM.wsResult.innerHTML = `<div class="empty-ws-state"><p>${state.lang === 'en' ? 'Lesson not found for this grade. Try another topic!' : 'មិនមានមេរៀននេះសម្រាប់ថ្នាក់នេះទេ។ សាកល្បងប្រធានបទផ្សេង!'}</p></div>`;
                return;
            }

            const wsHTML = `
                <div class="printable-ws" id="printable-worksheet">
                    <div class="ws-header">
                        <h1>${state.lang === 'en' ? 'Science Worksheet' : 'សន្លឹកកិច្ចការវិទ្យាសាស្ត្រ'}</h1>
                        <p>${selectedLesson.title[state.lang]}</p>
                        <div class="ws-info">
                            <span>${state.lang === 'en' ? 'Name:' : 'ឈ្មោះ:'} ____________________</span>
                            <span>${state.lang === 'en' ? 'Grade:' : 'ថ្នាក់:'} ${SCIENCE_DATA[gradeKey].title[state.lang]}</span>
                            <span>${state.lang === 'en' ? 'Date:' : 'កាលបរិច្ឆេទ:'} ___/___/___</span>
                        </div>
                    </div>
                    <div class="ws-body">
                        <h2>I. ${state.lang === 'en' ? 'Lesson Summary' : 'សង្ខេបមេរៀន'}</h2>
                        <p>${selectedLesson.content[state.lang]}</p>
                        
                        <h2>II. ${state.lang === 'en' ? 'Exercise Questions' : 'សំណួរសិក្សា'}</h2>
                        ${selectedLesson.quizzes.map((q, i) => `
                            <div class="ws-question">
                                <p>${i + 1}. ${q.question[state.lang]}</p>
                                <div class="ws-answer-space"></div>
                            </div>
                        `).join('')}
                        
                        <div class="ws-question">
                            <p>${selectedLesson.quizzes.length + 1}. ${state.lang === 'en' ? 'Explain what you learned from this lesson.' : 'ចូរពន្យល់ពីអ្វីដែលអ្នកបានរៀនពីមេរៀននេះ។'}</p>
                            <div class="ws-answer-space" style="height:100px;"></div>
                        </div>
                    </div>
                    <div class="ws-footer">
                        <p>SmartEdu AI | ${state.lang === 'en' ? 'Khmer Science Teaching Assistant' : 'ជំនួយការបង្រៀនវិទ្យាសាស្ត្រខ្មែរ'}</p>
                    </div>
                </div>
                <div class="ws-actions">
                    <button class="print-btn" onclick="window.print()">
                        ${state.lang === 'en' ? 'Print / Save as PDF' : 'បោះពុម្ព / រក្សាទុកជា PDF'}
                    </button>
                </div>
            `;
            DOM.wsResult.innerHTML = wsHTML;
            updateXP(20);
        }, 1500);
    };

    if (DOM.wsGenerateBtn) DOM.wsGenerateBtn.addEventListener('click', generateWorksheet);

    // Voice Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && DOM.micBtn) {
        const recognition = new SpeechRecognition();
        recognition.lang = state.lang === 'en' ? 'en-US' : 'km-KH';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (DOM.userInput) {
                DOM.userInput.value = transcript;
                handleChat();
            }
            DOM.micBtn.classList.remove('active');
        };

        recognition.onend = () => {
            DOM.micBtn.classList.remove('active');
        };

        DOM.micBtn.addEventListener('click', () => {
            if (DOM.micBtn.classList.contains('active')) {
                recognition.stop();
            } else {
                recognition.lang = state.lang === 'en' ? 'en-US' : 'km-KH';
                recognition.start();
                DOM.micBtn.classList.add('active');
            }
        });
    } else if (DOM.micBtn) {
        DOM.micBtn.style.display = 'none'; // Hide if not supported
    }

    // Fact Rotation
    const rotateFact = () => {
        if (!DOM.factText) return;
        factIndex = (factIndex + 1) % SCIENCE_FACTS.length;
        DOM.factText.style.opacity = 0;
        setTimeout(() => {
            DOM.factText.textContent = SCIENCE_FACTS[factIndex][state.lang];
            DOM.factText.style.opacity = 1;
        }, 500);
    };
    setInterval(rotateFact, 10000);

    // Initial Render
    if (DOM.factText) DOM.factText.textContent = SCIENCE_FACTS[factIndex][state.lang];
    renderAll();
    updateStats();
    updateXP(0);
});
