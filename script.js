// Local Storage Anahtarları - Artık daha çok yedek veya geçici depolama için kullanılabilir, ana veri bulutta.
// Ancak bu örnekte Local Storage yerine doğrudan Firebase'e odaklandık.
const LS_KEYS = {
    MAIN_COUNTER_START_DATE: 'mainCounterStartDate',
    IMPORTANT_DATES: 'importantDates',
    EDA_STORY: 'edaStory',
    EMIN_STORY: 'eminStory',
    SELECTED_THEME: 'selectedTheme',
    BACKGROUND_IMAGE: 'backgroundImage', // Bu artık URL olarak saklanacak
};

let currentUser = null; // Giriş yapan kullanıcı bilgisi

// --- Uygulama Yöneticileri ---

const AuthManager = (() => {
    const authMessage = document.getElementById('authMessage');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authStatus = document.getElementById('authStatus');
    const authPage = document.getElementById('authPage');
    const loggedInControls = document.getElementById('loggedInControls');
    const appFooterControls = document.getElementById('appFooterControls');

    const showMessage = (msg, type = 'info') => {
        authMessage.textContent = msg;
        authMessage.className = `auth-message ${type}`;
    };

    const signIn = async () => {
        const email = authEmail.value;
        const password = authPassword.value;
        if (!email || !password) {
            showMessage("Lütfen e-posta ve şifrenizi girin.", "error");
            return;
        }
        try {
            await window.auth.signInWithEmailAndPassword(email, password);
            showMessage("Giriş başarılı! Yönlendiriliyorsunuz...", "success");
            // onAuthStateChanged tetiklenecek
        } catch (error) {
            console.error("Giriş hatası:", error);
            showMessage("Giriş başarısız: " + error.message, "error");
        }
    };

    const signUp = async () => {
        const email = authEmail.value;
        const password = authPassword.value;
        if (!email || !password) {
            showMessage("Lütfen e-posta ve şifrenizi girin.", "error");
            return;
        }
        if (password.length < 6) {
            showMessage("Şifre en az 6 karakter olmalıdır.", "error");
            return;
        }
        try {
            await window.auth.createUserWithEmailAndPassword(email, password);
            showMessage("Kayıt başarılı! Giriş yapılıyor...", "success");
            // onAuthStateChanged tetiklenecek
        } catch (error) {
            console.error("Kayıt hatası:", error);
            showMessage("Kayıt başarısız: " + error.message, "error");
        }
    };

    const signOut = async () => {
        if (!confirm('Çıkış yapmak istediğinizden emin misiniz?')) return;
        try {
            await window.auth.signOut();
            showMessage("Çıkış yapıldı.", "info");
            // onAuthStateChanged tetiklenecek
        } catch (error) {
            console.error("Çıkış hatası:", error);
            alert("Çıkış yapılırken bir sorun oluştu.");
        }
    };

    const handleAuthStateChange = (user) => {
        currentUser = user;
        if (user) {
            authPage.classList.add('hidden');
            document.getElementById('mainPage').classList.remove('hidden');
            loggedInControls.classList.remove('hidden');
            appFooterControls.classList.remove('hidden');
            authStatus.textContent = `Hoş geldiniz, ${user.email}!`;
            UI.showSection('mainPage'); // Kullanıcı girişi sonrası ana sayfayı göster
            
            // Kullanıcıya özel verileri yükle
            Counter.loadMainStartDate();
            ThemeManager.loadUserPreferences();
            ThemeManager.loadBackgroundImage(); // Kullanıcıya özel arka planı yükle
        } else {
            authPage.classList.remove('hidden');
            document.getElementById('mainPage').classList.add('hidden');
            loggedInControls.classList.add('hidden');
            appFooterControls.classList.add('hidden');
            authStatus.textContent = 'Giriş yapın veya kayıt olun.';
            UI.hideAllSections(); // Tüm uygulama bölümlerini gizle
        }
    };

    // Firebase kimlik doğrulama durumunu dinle
    window.auth.onAuthStateChanged(handleAuthStateChange);

    return {
        signIn,
        signUp,
        signOut,
        getCurrentUser: () => currentUser
    };
})();


const Counter = (() => {
    let mainStartDate = new Date('2025-03-01T00:00:00'); // Varsayılan tarih

    const updateMainCounter = () => {
        if (!AuthManager.getCurrentUser()) {
            document.getElementById('mainCounterTitle').textContent = `Giriş Yapın`;
            document.getElementById('years').textContent = 0;
            document.getElementById('months').textContent = 0;
            document.getElementById('days').textContent = 0;
            document.getElementById('hours').textContent = 0;
            document.getElementById('minutes').textContent = 0;
            document.getElementById('seconds').textContent = 0;
            return;
        }

        const now = new Date();
        const diffTime = now.getTime() - mainStartDate.getTime();

        if (diffTime < 0) {
            document.getElementById('mainCounterTitle').textContent = `Belirtilen Tarihe Kalan Süre:`;
            const remainingDiff = Math.abs(diffTime);
            const rSeconds = Math.floor((remainingDiff / 1000) % 60);
            const rMinutes = Math.floor((remainingDiff / (1000 * 60)) % 60);
            const rHours = Math.floor((remainingDiff / (1000 * 60 * 60)) % 24);
            const rDays = Math.floor(remainingDiff / (1000 * 60 * 60 * 24));
            
            document.getElementById('years').textContent = Math.floor(rDays / 365);
            document.getElementById('months').textContent = Math.floor((rDays % 365) / 30); // Yaklaşık ay
            document.getElementById('days').textContent = rDays % 30; // Kalan günler
            document.getElementById('hours').textContent = rHours;
            document.getElementById('minutes').textContent = rMinutes;
            document.getElementById('seconds').textContent = rSeconds;
            return;
        }

        let years = now.getFullYear() - mainStartDate.getFullYear();
        let months = now.getMonth() - mainStartDate.getMonth();
        let days = now.getDate() - mainStartDate.getDate();
        let hours = now.getHours() - mainStartDate.getHours();
        let minutes = now.getMinutes() - mainStartDate.getMinutes();
        let seconds = now.getSeconds() - mainStartDate.getSeconds();

        if (seconds < 0) { seconds += 60; minutes--; }
        if (minutes < 0) { minutes += 60; hours--; }
        if (hours < 0) { hours += 24; days--; }
        if (days < 0) {
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonth.getDate();
            months--;
        }
        if (months < 0) { months += 12; years--; }

        document.getElementById('mainCounterTitle').textContent = `${mainStartDate.toLocaleDateString('tr-TR')} Tarihinden Bu Yana`;
        document.getElementById('years').textContent = years;
        document.getElementById('months').textContent = months;
        document.getElementById('days').textContent = days;
        document.getElementById('hours').textContent = hours;
        document.getElementById('minutes').textContent = minutes;
        document.getElementById('seconds').textContent = seconds;
    };

    const loadMainStartDate = async () => {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        try {
            const docRef = window.db.collection('users').doc(user.uid);
            const docSnap = await docRef.get();
            if (docSnap.exists() && docSnap.data().mainStartDate) {
                mainStartDate = new Date(docSnap.data().mainStartDate);
                document.getElementById('mainDateInput').value = mainStartDate.toISOString().split('T')[0];
            } else {
                // Varsayılan tarihi Firebase'e kaydet (sadece bir kez)
                const defaultDateISO = mainStartDate.toISOString();
                await docRef.set({ mainStartDate: defaultDateISO }, { merge: true });
                document.getElementById('mainDateInput').value = defaultDateISO.split('T')[0];
            }
        } catch (e) {
            console.error("Başlangıç tarihi yüklenirken hata:", e);
            alert("Başlangıç tarihi yüklenirken bir sorun oluştu.");
        }
        updateMainCounter();
    };

    const setMainStartDate = async (event) => {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        const newDate = event.target.value;
        if (newDate) {
            mainStartDate = new Date(`${newDate}T00:00:00`);
            try {
                await window.db.collection('users').doc(user.uid).set({ mainStartDate: mainStartDate.toISOString() }, { merge: true });
                updateMainCounter();
                alert('Başlangıç tarihi kaydedildi! ✅');
            } catch (e) {
                console.error("Başlangıç tarihi kaydedilirken hata:", e);
                alert("Başlangıç tarihi kaydedilirken bir sorun oluştu.");
            }
        }
    };

    // Her saniye güncellemeyi başlat
    setInterval(updateMainCounter, 1000);

    return {
        loadMainStartDate,
        setMainStartDate,
        updateMainCounter
    };
})();


const StoryManager = (() => {
    const loadStory = async (person) => {
        const user = AuthManager.getCurrentUser();
        if (!user) {
            document.getElementById(`${person}Story`).innerHTML = `<p style="text-align: center; opacity: 0.7; font-style: italic;">Giriş yapın ve kendi hikayenizi görün.</p>`;
            return;
        }
        
        const storyElement = document.getElementById(`${person}Story`);
        storyElement.innerHTML = `<p style="text-align: center; opacity: 0.7; font-style: italic;">Yükleniyor...</p>`;

        try {
            const docRef = window.db.collection('users').doc(user.uid);
            const docSnap = await docRef.get();
            let storyText = null;
            if (docSnap.exists() && docSnap.data()[`${person}Story`]) {
                storyText = docSnap.data()[`${person}Story`];
            }

            if (storyText) {
                storyElement.innerHTML = `<p>${storyText.replace(/\n/g, '</p><p>')}</p>`;
            } else {
                storyElement.innerHTML = `<p style="text-align: center; opacity: 0.7; font-style: italic;">${person === 'eda' ? 'Eda' : 'Emin'} henüz hikayesini yazmamış...</p>`;
            }
            document.getElementById(`${person}Textarea`).value = storyText || ''; // Textarea'yı da doldur
        } catch (e) {
            console.error(`Hikaye (${person}) yüklenirken hata:`, e);
            storyElement.innerHTML = `<p style="text-align: center; color: var(--error-color);">Hikaye yüklenirken bir hata oluştu.</p>`;
        }
    };

    const saveStory = async (person) => {
        const user = AuthManager.getCurrentUser();
        if (!user) {
            alert("Lütfen önce giriş yapın.");
            return;
        }

        const textarea = document.getElementById(`${person}Textarea`);
        const story = textarea.value.trim();

        if (story) {
            try {
                await window.db.collection('users').doc(user.uid).set({ [`${person}Story`]: story }, { merge: true });
                loadStory(person); // Hikayeyi ekranda güncelle
                alert(`✨ ${person === 'eda' ? 'Eda\'nın' : 'Emin\'in'} hikayesi kaydedildi!`);
            } catch (e) {
                console.error(`Hikaye (${person}) kaydedilirken hata:`, e);
                alert("Hikaye kaydedilirken bir sorun oluştu.");
            }
        } else {
            alert('Lütfen boş bir hikaye kaydetmeyin.');
        }
    };

    return {
        loadStory,
        saveStory
    };
})();


const DateManager = (() => {
    let importantDates = []; // Array to hold important date objects from Firestore

    const calculateTimeDifference = (targetDate) => {
        const now = new Date();
        const target = new Date(targetDate);
        const diffMs = target.getTime() - now.getTime();

        if (isNaN(diffMs)) {
            return "Geçersiz Tarih";
        }

        const isPast = diffMs < 0;
        let absDiffMs = Math.abs(diffMs);

        const minutes = Math.floor((absDiffMs / (1000 * 60)) % 60);
        const hours = Math.floor((absDiffMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));

        let result = [];
        if (days > 0) result.push(`${days} gün`);
        if (hours > 0) result.push(`${hours} saat`);
        if (minutes > 0 || (days === 0 && hours === 0 && minutes === 0 && !isPast)) result.push(`${minutes} dakika`); 
        
        if (result.length === 0) {
            return `0 dakika ${isPast ? 'geçti' : 'kaldı'}`;
        }
        return `${result.join(', ')} ${isPast ? 'geçti' : 'kaldı'}`;
    };

    const loadImportantDates = async () => {
        const user = AuthManager.getCurrentUser();
        if (!user) {
            document.getElementById('importantDatesList').innerHTML = '<p style="text-align: center; opacity: 0.7;">Giriş yapın ve önemli tarihlerinizi görün.</p>';
            return;
        }

        const listContainer = document.getElementById('importantDatesList');
        listContainer.innerHTML = '<p style="text-align: center; opacity: 0.7;">Yükleniyor...</p>';

        try {
            const q = window.db.collection('importantDates').where("userId", "==", user.uid);
            const querySnapshot = await q.get();
            importantDates = [];
            querySnapshot.forEach((doc) => {
                importantDates.push({ id: doc.id, ...doc.data() });
            });
            updateImportantDatesList();
        } catch (e) {
            console.error("Önemli tarihler yüklenirken hata oluştu:", e);
            listContainer.innerHTML = '<p style="text-align: center; color: var(--error-color);">Önemli tarihler yüklenirken bir sorun oluştu.</p>';
        }
    };

    const addImportantDate = async () => {
        const user = AuthManager.getCurrentUser();
        if (!user) {
            alert("Lütfen önce giriş yapın.");
            return;
        }

        const description = document.getElementById('dateDescription').value.trim();
        const date = document.getElementById('dateInput').value;
        const mediaFile = document.getElementById('mediaInput').files[0];

        if (!description || !date) {
            alert('Lütfen açıklama ve tarih girin!');
            return;
        }

        let mediaData = null;
        if (mediaFile) {
            const storageRef = window.storage.ref(`user_media/${user.uid}/${Date.now()}_${mediaFile.name}`);
            try {
                const snapshot = await storageRef.put(mediaFile);
                mediaData = {
                    type: mediaFile.type.startsWith('image/') ? 'image' : 'video',
                    url: await snapshot.ref.getDownloadURL()
                };
            } catch (error) {
                console.error("Medya yüklenirken hata:", error);
                alert("Medya dosyası yüklenirken bir sorun oluştu.");
                return;
            }
        }

        const newDateObj = {
            description: description,
            date: date,
            media: mediaData,
            userId: user.uid,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp() // Firestore'un kendi zaman damgası
        };

        try {
            const docRef = await window.db.collection("importantDates").add(newDateObj);
            importantDates.push({ id: docRef.id, ...newDateObj });
            updateImportantDatesList();
            clearForm();
            alert('Tarih başarıyla buluta eklendi! 🎉');
        } catch (e) {
            console.error("Tarih eklenirken hata:", e);
            alert("Tarih eklenirken bir sorun oluştu.");
        }
    };

    const deleteImportantDate = async (docId, mediaUrl) => {
        const user = AuthManager.getCurrentUser();
        if (!user || !confirm('Bu önemli tarihi silmek istediğinizden emin misiniz?')) {
            return;
        }
        try {
            await window.db.collection("importantDates").doc(docId).delete();
            if (mediaUrl) {
                // Storage'daki dosyayı da sil
                const fileRef = window.storage.refFromURL(mediaUrl);
                await fileRef.delete();
            }
            importantDates = importantDates.filter(date => date.id !== docId);
            updateImportantDatesList();
            alert('Tarih başarıyla silindi. 🗑️');
        } catch (e) {
            console.error("Tarih silinirken hata:", e);
            alert("Tarih silinirken bir sorun oluştu.");
        }
    };

    const updateImportantDatesList = () => {
        const listContainer = document.getElementById('importantDatesList');
        listContainer.innerHTML = '';

        if (importantDates.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; opacity: 0.7;">Henüz önemli tarih eklenmemiş.</p>';
            return;
        }

        const sortedDates = [...importantDates].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            const now = new Date();

            const diffA = dateA.getTime() - now.getTime();
            const diffB = dateB.getTime() - now.getTime();

            if (diffA >= 0 && diffB >= 0) { return diffA - diffB; }
            if (diffA < 0 && diffB < 0) { return diffB - diffA; }
            return diffB - diffA;
        });

        sortedDates.forEach(dateItem => {
            const dateElement = document.createElement('div');
            dateElement.className = 'date-item';

            const formattedDate = new Date(dateItem.date).toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            let mediaHtml = '';
            const mediaUrl = dateItem.media?.url || null; // Accessing nested property safely
            if (mediaUrl) {
                if (dateItem.media.type === 'image') {
                    mediaHtml = `<div class="date-media"><img src="${mediaUrl}" alt="Önemli An"></div>`;
                } else if (dateItem.media.type === 'video') {
                    mediaHtml = `<div class="date-media"><video src="${mediaUrl}" controls></video></div>`;
                }
            }

            dateElement.innerHTML = `
                <div class="date-title">${dateItem.description}</div>
                <div class="date-display">${formattedDate}</div>
                ${mediaHtml}
                <div class="date-counter">${calculateTimeDifference(dateItem.date)}</div>
                <button class="delete-btn" onclick="DateManager.deleteImportantDate('${dateItem.id}', '${mediaUrl || ''}')">🗑️ Sil</button>
            `;

            listContainer.appendChild(dateElement);
        });
    };

    const clearForm = () => {
        document.getElementById('dateDescription').value = '';
        document.getElementById('dateInput').value = '';
        document.getElementById('mediaInput').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('videoPreview').style.display = 'none';
        document.getElementById('imagePreview').src = '';
        document.getElementById('videoPreview').src = '';
    };

    const setupMediaPreview = () => {
        document.getElementById('mediaInput').addEventListener('change', function(event) {
            const file = event.target.files[0];
            const imagePreview = document.getElementById('imagePreview');
            const videoPreview = document.getElementById('videoPreview');

            imagePreview.style.display = 'none';
            videoPreview.style.display = 'none';
            imagePreview.src = '';
            videoPreview.src = '';

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (file.type.startsWith('image/')) {
                        imagePreview.src = e.target.result;
                        imagePreview.style.display = 'block';
                    } else if (file.type.startsWith('video/')) {
                        videoPreview.src = e.target.result;
                        videoPreview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    };

    // Update counters for important dates every minute
    setInterval(updateImportantDatesList, 60 * 1000);

    return {
        loadImportantDates,
        addImportantDate,
        deleteImportantDate,
        setupMediaPreview
    };
})();


const ThemeManager = (() => {
    const applyTheme = (themeName) => {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        if (themeName !== 'dark') {
            document.body.classList.add(`theme-${themeName}`);
        }

        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`.theme-option.${themeName}`).classList.add('active');
        saveUserPreference('selectedTheme', themeName); // Save to Firebase
    };

    const loadUserPreferences = async () => {
        const user = AuthManager.getCurrentUser();
        if (!user) {
            applyTheme('dark'); // Varsayılan tema
            return;
        }

        try {
            const docRef = window.db.collection('users').doc(user.uid);
            const docSnap = await docRef.get();
            if (docSnap.exists() && docSnap.data().selectedTheme) {
                applyTheme(docSnap.data().selectedTheme);
            } else {
                applyTheme('dark'); // Firebase'de yoksa varsayılan
            }
        } catch (e) {
            console.error("Tema yüklenirken hata:", e);
            applyTheme('dark'); // Hata durumunda varsayılan
        }
    };

    const saveUserPreference = async (key, value) => {
        const user = AuthManager.getCurrentUser();
        if (!user) return;
        try {
            await window.db.collection('users').doc(user.uid).set({ [key]: value }, { merge: true });
        } catch (e) {
            console.error(`Kullanıcı tercihi (${key}) kaydedilirken hata:`, e);
            alert("Tema ayarı kaydedilirken bir sorun oluştu.");
        }
    };

    const changeBackgroundImage = async () => {
        const user = AuthManager.getCurrentUser();
        if (!user) {
            alert("Lütfen önce giriş yapın.");
            return;
        }

        const file = document.getElementById('backgroundInput').files[0];
        if (file) {
            const storageRef = window.storage.ref(`user_backgrounds/${user.uid}/${file.name}`);
            try {
                const snapshot = await storageRef.put(file);
                const imageUrl = await snapshot.ref.getDownloadURL();
                document.body.style.backgroundImage = `url(${imageUrl})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
                saveUserPreference('backgroundImage', imageUrl); // Save URL to Firebase
                updateBgPreview(imageUrl);
                alert('Arka plan fotoğrafı yüklendi! 🖼️');
            } catch (error) {
                console.error("Arka plan yüklenirken hata:", error);
                alert("Arka plan fotoğrafı yüklenirken bir sorun oluştu.");
            }
        }
    };

    const removeBackground = async () => {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        try {
            const docRef = window.db.collection('users').doc(user.uid);
            const docSnap = await docRef.get();
            const currentImageUrl = docSnap.exists() ? docSnap.data().backgroundImage : null;

            if (currentImageUrl) {
                const fileRef = window.storage.refFromURL(currentImageUrl);
                await fileRef.delete();
            }

            document.body.style.backgroundImage = '';
            document.body.style.background = 'var(--bg-gradient)';
            await docRef.set({ backgroundImage: null }, { merge: true }); // Remove from Firebase
            updateBgPreview(null);
            alert('Arka plan fotoğrafı kaldırıldı. 🗑️');
        } catch (e) {
            console.error("Arka plan kaldırılırken hata:", e);
            alert("Arka plan fotoğrafı kaldırılırken bir sorun oluştu.");
        }
    };

    const loadBackgroundImage = async () => {
        const user = AuthManager.getCurrentUser();
        if (!user) {
            document.body.style.backgroundImage = '';
            document.body.style.background = 'var(--bg-gradient)';
            updateBgPreview(null);
            return;
        }

        try {
            const docRef = window.db.collection('users').doc(user.uid);
            const docSnap = await docRef.get();
            if (docSnap.exists() && docSnap.data().backgroundImage) {
                const imageUrl = docSnap.data().backgroundImage;
                document.body.style.backgroundImage = `url(${imageUrl})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
                updateBgPreview(imageUrl);
            } else {
                document.body.style.backgroundImage = '';
                document.body.style.background = 'var(--bg-gradient)';
                updateBgPreview(null);
            }
        } catch (e) {
            console.error("Arka plan resmi yüklenirken hata:", e);
            document.body.style.backgroundImage = '';
            document.body.style.background = 'var(--bg-gradient)';
            updateBgPreview(null);
        }
    };

    const updateBgPreview = (imageUrl) => {
        const bgPreview = document.getElementById('bgPreview');
        if (imageUrl) {
            bgPreview.style.backgroundImage = `url(${imageUrl})`;
        } else {
            bgPreview.style.backgroundImage = 'none';
            // Arka plan rengini mevcut temadan alarak daha doğru bir önizleme sağlarız
            bgPreview.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--bg-gradient').includes('gradient') ? 'transparent' : getComputedStyle(document.body).backgroundColor;
        }
    };

    const openCustomizationPanel = () => {
        document.getElementById('customizationPanel').classList.add('show');
        document.getElementById('overlay').classList.add('show');
        ThemeManager.updateBgPreview(AuthManager.getCurrentUser()?.photoURL || null); // Try to get current background URL for preview
    };

    const closeCustomizationPanel = () => {
        document.getElementById('customizationPanel').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    };

    const setupEventListeners = () => {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => applyTheme(option.dataset.theme));
        });
        document.getElementById('backgroundInput').addEventListener('change', changeBackgroundImage);
    };

    return {
        applyTheme,
        loadUserPreferences,
        changeBackgroundImage,
        removeBackground,
        loadBackgroundImage,
        updateBgPreview,
        openCustomizationPanel,
        closeCustomizationPanel,
        setupEventListeners
    };
})();


const UI = (() => {
    const showSection = (sectionId) => {
        const sections = ['mainPage', 'aboutPage', 'datesPage', 'authPage'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (id === sectionId) {
                section.classList.remove('hidden');
                // Belirli bölümler yüklendiğinde verilerini çek
                if (id === 'datesPage') {
                    DateManager.loadImportantDates();
                } else if (id === 'aboutPage') {
                    StoryManager.loadStory('eda');
                    StoryManager.loadStory('emin');
                }
            } else {
                section.classList.add('hidden');
            }
        });
    };

    const hideAllSections = () => {
        const sections = ['mainPage', 'aboutPage', 'datesPage', 'authPage'];
        sections.forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
    };

    const initialize = () => {
        ThemeManager.setupEventListeners();
        DateManager.setupMediaPreview();
        // AuthManager zaten onAuthStateChanged ile başlangıç durumunu yönetecek.
        // UI.showSection('authPage'); // Başlangıçta Auth sayfasını göster
    };

    return {
        showSection,
        hideAllSections,
        initialize
    };
})();


// --- Uygulama Başlangıcı ---
document.addEventListener('DOMContentLoaded', () => {
    UI.initialize();
    document.getElementById('mainDateInput').addEventListener('change', Counter.setMainStartDate);
    // İlk yüklemede, Firebase'in Auth durumu değişince UI otomatik güncellenecek
});