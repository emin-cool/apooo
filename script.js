// Global değişkenlerin tanımlandığını varsayıyoruz (window.db, window.auth, window.storage, window.firebase)
// Bu değişkenler index.html içindeki <script type="module"> bloğunda tanımlanır.

// --- UI Yönetimi ---
const UI = {
    authPage: document.getElementById('authPage'),
    mainPage: document.getElementById('mainPage'),
    aboutPage: document.getElementById('aboutPage'),
    datesPage: document.getElementById('datesPage'),
    authStatus: document.getElementById('authStatus'),
    authMessage: document.getElementById('authMessage'),
    loggedInControls: document.getElementById('loggedInControls'),
    appFooterControls: document.getElementById('appFooterControls'),

    showSection: function(sectionId) {
        // Tüm ana bölümleri gizle
        this.authPage.classList.add('hidden');
        this.mainPage.classList.add('hidden');
        this.aboutPage.classList.add('hidden');
        this.datesPage.classList.add('hidden');

        // İstenen bölümü göster
        document.getElementById(sectionId).classList.remove('hidden');
    },

    displayAuthMessage: function(message, isSuccess = false) {
        this.authMessage.textContent = message;
        this.authMessage.className = 'auth-message'; // Önceki sınıfları temizle
        if (isSuccess) {
            this.authMessage.classList.add('success');
        } else {
            this.authMessage.classList.add('error');
        }
    },

    clearAuthMessage: function() {
        this.authMessage.textContent = '';
        this.authMessage.className = 'auth-message';
    }
};

// --- Kimlik Doğrulama Yönetimi ---
const AuthManager = {
    emailInput: document.getElementById('authEmail'),
    passwordInput: document.getElementById('authPassword'),

    signUp: async function() {
        UI.clearAuthMessage();
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        if (!email || !password) {
            UI.displayAuthMessage("E-posta ve şifre boş bırakılamaz.");
            return;
        }

        try {
            await window.auth.createUserWithEmailAndPassword(email, password);
            UI.displayAuthMessage("Kayıt başarılı! Giriş yapılıyor...", true);
            // Başarılı kayıttan sonra otomatik giriş onAuthStateChanged tarafından halledilecek
        } catch (error) {
            console.error("Kayıt hatası:", error);
            let errorMessage = "Kayıt sırasında bir hata oluştu.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Bu e-posta adresi zaten kullanılıyor.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Geçersiz e-posta adresi.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Şifre en az 6 karakter olmalı.";
            }
            UI.displayAuthMessage(errorMessage);
        }
    },

    signIn: async function() {
        UI.clearAuthMessage();
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        if (!email || !password) {
            UI.displayAuthMessage("E-posta ve şifre boş bırakılamaz.");
            return;
        }

        try {
            await window.auth.signInWithEmailAndPassword(email, password);
            UI.displayAuthMessage("Giriş başarılı!", true);
            // Başarılı giriş onAuthStateChanged tarafından halledilecek
        } catch (error) {
            console.error("Giriş hatası:", error);
            let errorMessage = "Giriş sırasında bir hata oluştu.";
            if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "Yanlış e-posta veya şifre.";
            }
            UI.displayAuthMessage(errorMessage);
        }
    },

    signOut: async function() {
        try {
            await window.auth.signOut();
            console.log("Çıkış yapıldı.");
            UI.displayAuthMessage("Başarıyla çıkış yaptınız.", true);
            // onAuthStateChanged tetiklenecek ve arayüzü güncelleyecek
        } catch (error) {
            console.error("Çıkış hatası:", error);
            UI.displayAuthMessage("Çıkış sırasında bir hata oluştu.");
        }
    }
};


// --- Kimlik Doğrulama Durumu Değişikliklerini Dinle ---
// Bu blok, sayfa yüklendiğinde veya kullanıcı giriş/çıkış yaptığında tetiklenir.
if (window.auth) { // window.auth'un tanımlı olduğundan emin ol
    window.auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Kullanıcı giriş yaptı:", user.uid);
            UI.authStatus.textContent = `Hoş geldin, ${user.email}!`;
            UI.authPage.classList.add('hidden');
            UI.mainPage.classList.remove('hidden');
            UI.loggedInControls.classList.remove('hidden');
            UI.appFooterControls.classList.remove('hidden');
            
            // Kullanıcıya özel verileri yükle
            Counter.loadMainDate(user.uid);
            StoryManager.loadStory('eda', user.uid);
            StoryManager.loadStory('emin', user.uid);
            DateManager.loadImportantDates(user.uid);
            ThemeManager.loadUserTheme(user.uid);
            ThemeManager.loadUserBackground(user.uid);

        } else {
            console.log("Kullanıcı çıkış yaptı veya giriş yapmadı.");
            UI.authStatus.textContent = "Lütfen giriş yapın veya kayıt olun.";
            UI.authPage.classList.remove('hidden');
            UI.mainPage.classList.add('hidden');
            UI.aboutPage.classList.add('hidden'); // Diğer sayfaları da gizle
            UI.datesPage.classList.add('hidden'); // Diğer sayfaları da gizle
            UI.loggedInControls.classList.add('hidden');
            UI.appFooterControls.classList.add('hidden');
            UI.clearAuthMessage();
            // Varsayılan temaya dön veya boş tema ayarla
            document.body.className = ''; 
            document.body.style.backgroundImage = '';
            document.body.style.backgroundColor = '';
        }
    });
} else {
    console.error("Firebase Auth başlatılamadı. AuthManager çalışmayacak.");
    UI.displayAuthMessage("Uygulama başlatılamadı. Lütfen konsolu kontrol edin.", false);
}


// --- Sayaç Yönetimi ---
const Counter = {
    mainDateInput: document.getElementById('mainDateInput'),
    mainCounterTitle: document.getElementById('mainCounterTitle'),
    timerInterval: null,
    
    // Ana sayacı ve başlangıç tarihini yükler
    loadMainDate: async function(userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            const docSnap = await docRef.get();

            if (docSnap.exists && docSnap.data().mainDate) {
                const mainDate = docSnap.data().mainDate.toDate(); // Timestamp'ten Date objesine çevir
                this.mainDateInput.valueAsDate = mainDate;
                this.startCounter(mainDate);
                this.updateMainCounterTitle(mainDate);
            } else {
                console.log("Ana tarih bulunamadı, varsayılanı ayarla.");
                const defaultDate = new Date(); // Bugünün tarihi
                this.mainDateInput.valueAsDate = defaultDate;
                this.startCounter(defaultDate);
                this.updateMainCounterTitle(defaultDate);
            }
        } catch (error) {
            console.error("Ana tarih yüklenirken hata:", error);
        }
    },

    // Ana tarihi günceller ve Firestore'a kaydeder
    saveMainDate: async function(date, userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            await docRef.set({ mainDate: date }, { merge: true }); // Sadece mainDate'i güncelleyin
            console.log("Ana tarih kaydedildi.");
        } catch (error) {
            console.error("Ana tarih kaydedilirken hata:", error);
        }
    },

    // Başlangıç tarihini inputtan alıp sayacı başlatır
    startCounter: function(startDate) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.updateMainCounterTitle(startDate);

        this.timerInterval = setInterval(() => {
            const now = new Date();
            const diff = now.getTime() - startDate.getTime(); // Fark milisaniye cinsinden

            if (diff < 0) { // Gelecek bir tarih seçilirse
                document.getElementById('years').textContent = "0";
                document.getElementById('months').textContent = "0";
                document.getElementById('days').textContent = "0";
                document.getElementById('hours').textContent = "0";
                document.getElementById('minutes').textContent = "0";
                document.getElementById('seconds').textContent = "0";
                this.mainCounterTitle.textContent = "Henüz başlamadı...";
                return;
            }

            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            // Daha doğru yıl ve ay hesaplaması
            let years = 0;
            let months = 0;
            let tempDate = new Date(startDate);
            let totalMonths = 0;

            while (tempDate < now) {
                tempDate.setMonth(tempDate.getMonth() + 1);
                if (tempDate <= now) {
                    totalMonths++;
                } else {
                    tempDate.setMonth(tempDate.getMonth() - 1); // Geri al
                    break;
                }
            }

            years = Math.floor(totalMonths / 12);
            months = totalMonths % 12;

            // Kalan gün, saat, dakika, saniye
            const remainingDays = days - (years * 365 + Math.floor(years / 4)); // Kaba bir tahmin, tam doğru değil
            const remainingHours = hours % 24;
            const remainingMinutes = minutes % 60;
            const remainingSeconds = seconds % 60;

            document.getElementById('years').textContent = years;
            document.getElementById('months').textContent = months;
            document.getElementById('days').textContent = remainingDays < 0 ? 0 : remainingDays; // Negatif olmaması için
            document.getElementById('hours').textContent = remainingHours;
            document.getElementById('minutes').textContent = remainingMinutes;
            document.getElementById('seconds').textContent = remainingSeconds;

        }, 1000);
    },

    updateMainCounterTitle: function(date) {
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
             this.mainCounterTitle.textContent = `${date.toLocaleDateString()} tarihinden beri geçen süre`;
        } else {
            this.mainCounterTitle.textContent = `${date.toLocaleDateString()} tarihine kalan süre`;
        }
       
    }
};

// Ana tarih inputu değiştiğinde
document.getElementById('mainDateInput').addEventListener('change', async function() {
    const selectedDate = this.valueAsDate;
    if (selectedDate && window.auth.currentUser) {
        Counter.startCounter(selectedDate);
        Counter.saveMainDate(selectedDate, window.auth.currentUser.uid);
    }
});


// --- Hikaye Yönetimi ---
const StoryManager = {
    saveStory: async function(person) {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        const textareaId = `${person}Textarea`;
        const storyText = document.getElementById(textareaId).value;

        try {
            const docRef = window.db.collection('users').doc(userId);
            // Sadece ilgili hikaye alanını güncelle
            const updateData = {};
            updateData[`story.${person}`] = storyText;
            await docRef.set(updateData, { merge: true });
            console.log(`${person} hikayesi kaydedildi.`);
            UI.displayAuthMessage(`${person} hikayesi başarıyla kaydedildi!`, true);
            // Hikayeyi hemen güncellenen değeriyle göster
            document.getElementById(`${person}Story`).innerHTML = StoryManager.formatStoryText(storyText);
        } catch (error) {
            console.error(`${person} hikayesi kaydedilirken hata:`, error);
            UI.displayAuthMessage(`${person} hikayesi kaydedilirken hata oluştu.`, false);
        }
    },

    loadStory: async function(person, userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            const docSnap = await docRef.get();
            const storyDiv = document.getElementById(`${person}Story`);
            const textarea = document.getElementById(`${person}Textarea`);

            if (docSnap.exists && docSnap.data().story && docSnap.data().story[person]) {
                const storyText = docSnap.data().story[person];
                storyDiv.innerHTML = this.formatStoryText(storyText);
                textarea.value = storyText;
            } else {
                storyDiv.innerHTML = `<p>Henüz bir hikaye yazılmamış. İlk hikayeni sen yaz!</p>`;
                textarea.value = '';
            }
        } catch (error) {
            console.error(`${person} hikayesi yüklenirken hata:`, error);
            document.getElementById(`${person}Story`).innerHTML = `<p class="error">Hikaye yüklenirken hata oluştu.</p>`;
        }
    },

    // Metinleri <p> etiketlerine bölerek formatlar
    formatStoryText: function(text) {
        if (!text) return '<p>Henüz bir hikaye yazılmamış.</p>';
        return text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }
};

// --- Önemli Tarihler Yönetimi ---
const DateManager = {
    descriptionInput: document.getElementById('dateDescription'),
    dateInput: document.getElementById('dateInput'),
    mediaInput: document.getElementById('mediaInput'),
    importantDatesList: document.getElementById('importantDatesList'),
    imagePreview: document.getElementById('imagePreview'),
    videoPreview: document.getElementById('videoPreview'),
    mediaPreviewContainer: document.getElementById('mediaPreviewContainer'),

    addImportantDate: async function() {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        const description = this.descriptionInput.value;
        const date = this.dateInput.valueAsDate;
        const file = this.mediaInput.files[0];

        if (!description || !date) {
            UI.displayAuthMessage("Açıklama ve tarih boş bırakılamaz.", false);
            return;
        }
        UI.clearAuthMessage();

        let mediaUrl = null;
        let mediaType = null;

        if (file) {
            UI.displayAuthMessage("Medya yükleniyor...", true);
            try {
                // Firebase Storage'a yükleme işlemi
                const storageRef = window.storage.ref(window.storage, `user_uploads/${userId}/${Date.now()}_${file.name}`);
                const snapshot = await window.storage.uploadBytes(storageRef, file);
                mediaUrl = await window.storage.getDownloadURL(snapshot.ref);
                mediaType = file.type.startsWith('image/') ? 'image' : 'video';
                UI.displayAuthMessage("Medya başarıyla yüklendi.", true);
            } catch (error) {
                console.error("Medya yükleme hatası:", error);
                UI.displayAuthMessage("Medya yüklenirken hata oluştu.", false);
                return;
            }
        }

        try {
            await window.db.collection('users').doc(userId).collection('importantDates').add({
                description: description,
                date: date,
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                createdAt: new Date() // Server timestamp yerine doğrudan JavaScript Date objesi kullanıyoruz
            });
            console.log("Önemli tarih eklendi.");
            UI.displayAuthMessage("Önemli tarih başarıyla eklendi!", true);
            this.clearDateForm();
            this.loadImportantDates(userId); // Listeyi yeniden yükle
        } catch (error) {
            console.error("Tarih eklenirken hata:", error);
            UI.displayAuthMessage("Tarih eklenirken hata oluştu.", false);
        }
    },

    loadImportantDates: async function(userId) {
        this.importantDatesList.innerHTML = '<p style="text-align: center; opacity: 0.7;">Yükleniyor...</p>';
        try {
            const querySnapshot = await window.db.collection('users').doc(userId).collection('importantDates').orderBy('date', 'desc').get();
            this.importantDatesList.innerHTML = ''; // Temizle
            if (querySnapshot.empty) {
                this.importantDatesList.innerHTML = '<p style="text-align: center;">Henüz önemli bir tarih eklenmemiş. Haydi bir tane ekle!</p>';
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();
                const dateObj = data.date ? data.date.toDate() : null; // Timestamp'i Date objesine çevir
                const dateString = dateObj ? dateObj.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Tarih belirtilmemiş';
                
                let mediaHtml = '';
                if (data.mediaUrl && data.mediaType) {
                    if (data.mediaType === 'image') {
                        mediaHtml = `<div class="date-media"><img src="${data.mediaUrl}" alt="${data.description}"></div>`;
                    } else if (data.mediaType === 'video') {
                        mediaHtml = `<div class="date-media"><video controls src="${data.mediaUrl}"></video></div>`;
                    }
                }

                // Tarihe kalan/geçen süreyi hesapla
                const now = new Date();
                let diffText = '';
                if (dateObj) {
                    const diffMs = now.getTime() - dateObj.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffDays === 0) {
                        diffText = "Bugün!";
                    } else if (diffDays > 0) {
                        diffText = `${diffDays} gün önce`;
                    } else { // Gelecekteki tarih
                        diffText = `${Math.abs(diffDays)} gün sonra`;
                    }
                }

                this.importantDatesList.innerHTML += `
                    <div class="date-item" data-id="${doc.id}" data-media-url="${data.mediaUrl || ''}">
                        <div class="date-title">${data.description}</div>
                        <div class="date-display">${dateString}</div>
                        ${mediaHtml}
                        <div class="date-counter">${diffText}</div>
                        <button class="delete-btn" onclick="DateManager.deleteImportantDate('${doc.id}', '${data.mediaUrl || ''}')">Sil</button>
                    </div>
                `;
            });
        } catch (error) {
            console.error("Önemli tarihler yüklenirken hata:", error);
            this.importantDatesList.innerHTML = '<p class="error">Tarihler yüklenirken hata oluştu.</p>';
        }
    },

    deleteImportantDate: async function(docId, mediaUrl) {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        if (confirm("Bu tarihi silmek istediğinizden emin misiniz?")) {
            try {
                // Medya dosyasını Storage'dan sil (varsa)
                if (mediaUrl) {
                    const fileRef = window.storage.ref(window.storage, mediaUrl);
                    await window.storage.deleteObject(fileRef).catch(e => {
                        if (e.code === 'storage/object-not-found') {
                            console.log("Silinecek eski arka plan dosyası bulunamadı, sorun değil.");
                        } else {
                            throw e; // Başka bir hata varsa tekrar fırlat
                        }
                    });
                    console.log("Medya dosyası silindi (varsa).");
                }

                // Firestore dokümanını sil
                await window.db.collection('users').doc(userId).collection('importantDates').doc(docId).delete();
                console.log("Tarih silindi.");
                UI.displayAuthMessage("Tarih başarıyla silindi.", true);
                this.loadImportantDates(userId); // Listeyi yeniden yükle
            } catch (error) {
                console.error("Tarih silinirken hata:", error);
                UI.displayAuthMessage("Tarih silinirken hata oluştu.", false);
            }
        }
    },

    clearDateForm: function() {
        this.descriptionInput.value = '';
        this.dateInput.value = '';
        this.mediaInput.value = ''; // File inputu temizle
        this.imagePreview.style.display = 'none';
        this.imagePreview.src = '#';
        this.videoPreview.style.display = 'none';
        this.videoPreview.src = '#';
        this.mediaPreviewContainer.style.display = 'none';
    }
};

// Medya önizlemesi için event listener
document.getElementById('mediaInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const fileType = file.type;
        const reader = new FileReader();

        reader.onload = function(e) {
            DateManager.mediaPreviewContainer.style.display = 'block';
            if (fileType.startsWith('image/')) {
                DateManager.imagePreview.src = e.target.result;
                DateManager.imagePreview.style.display = 'block';
                DateManager.videoPreview.style.display = 'none';
            } else if (fileType.startsWith('video/')) {
                DateManager.videoPreview.src = e.target.result;
                DateManager.videoPreview.style.display = 'block';
                DateManager.imagePreview.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    } else {
        DateManager.mediaPreviewContainer.style.display = 'none';
        DateManager.imagePreview.src = '#';
        DateManager.videoPreview.src = '#';
        DateManager.imagePreview.style.display = 'none';
        DateManager.videoPreview.style.display = 'none';
    }
});


// --- Tema ve Arka Plan Yönetimi ---
const ThemeManager = {
    customizationPanel: document.getElementById('customizationPanel'),
    overlay: document.getElementById('overlay'),
    themeOptions: document.querySelectorAll('.theme-option'),
    backgroundInput: document.getElementById('backgroundInput'),
    bgPreview: document.getElementById('bgPreview'),

    openCustomizationPanel: function() {
        this.customizationPanel.classList.add('show');
        this.overlay.classList.add('show');
        this.updateThemeActiveStates();
        this.updateBackgroundPreview();
    },

    closeCustomizationPanel: function() {
        this.customizationPanel.classList.remove('show');
        this.overlay.classList.remove('show');
    },

    applyTheme: function(themeName) {
        document.body.className = `theme-${themeName}`; // 'theme-' önekini ekliyoruz
        if (window.auth.currentUser) {
            this.saveUserTheme(themeName, window.auth.currentUser.uid);
        }
        this.updateThemeActiveStates();
    },

    saveUserTheme: async function(themeName, userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            await docRef.set({ theme: themeName }, { merge: true });
            console.log("Tema kaydedildi:", themeName);
        } catch (error) {
            console.error("Tema kaydedilirken hata:", error);
        }
    },

    loadUserTheme: async function(userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            const docSnap = await docRef.get();
            if (docSnap.exists && docSnap.data().theme) {
                const savedTheme = docSnap.data().theme;
                document.body.className = `theme-${savedTheme}`;
                console.log("Tema yüklendi:", savedTheme);
            } else {
                console.log("Kullanıcı teması bulunamadı, varsayılan tema uygulanıyor.");
                document.body.className = `theme-dark`; // Varsayılan tema
            }
            this.updateThemeActiveStates();
        } catch (error) {
            console.error("Tema yüklenirken hata:", error);
        }
    },

    updateThemeActiveStates: function() {
        this.themeOptions.forEach(option => {
            option.classList.remove('active');
            if (document.body.classList.contains(option.dataset.theme)) {
                option.classList.add('active');
            }
        });
    },

    uploadBackground: async function(file) {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        if (!file) {
            console.log("Dosya seçilmedi.");
            return;
        }

        UI.displayAuthMessage("Arka plan yükleniyor...", true);
        try {
            const storageRef = window.storage.ref(window.storage, `user_backgrounds/${userId}/custom_background`);
            const snapshot = await window.storage.uploadBytes(storageRef, file);
            const imageUrl = await window.storage.getDownloadURL(snapshot.ref);
            
            document.body.style.backgroundImage = `url('${imageUrl}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed'; // Eklemeyi unutmayın
            
            this.saveUserBackgroundUrl(imageUrl, userId);
            this.updateBackgroundPreview(imageUrl);
            UI.displayAuthMessage("Arka plan başarıyla yüklendi!", true);
        } catch (error) {
            console.error("Arka plan yükleme hatası:", error);
            UI.displayAuthMessage("Arka plan yüklenirken hata oluştu.", false);
        }
    },

    removeBackground: async function() {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        
        try {
            // Firestore'daki URL'yi kaldır
            const docRef = window.db.collection('users').doc(userId);
            // FieldValue.delete() import edildiği için doğrudan kullanılabilir
            await docRef.set({ backgroundUrl: window.firebase.firestore.FieldValue.delete() }, { merge: true });
            
            // Storage'dan dosyayı sil (eğer daha önce yüklenmişse)
            // Bu kısım biraz karmaşık olabilir çünkü dosyanın tam yolunu bilmemiz gerekiyor.
            // Örnek: user_backgrounds/userId/custom_background
            const fileRef = window.storage.ref(window.storage, `user_backgrounds/${userId}/custom_background`);
            // Dosya yoksa hata vermemesi için catch bloğu ekledik.
            await window.storage.deleteObject(fileRef).catch(e => {
                if (e.code === 'storage/object-not-found') {
                    console.log("Silinecek eski arka plan dosyası bulunamadı, sorun değil.");
                } else {
                    throw e; // Başka bir hata varsa tekrar fırlat
                }
            });

            document.body.style.backgroundImage = ''; // CSS'i temizle
            document.body.style.backgroundColor = ''; // Eğer renk teması varsa geri dönsün
            this.updateBackgroundPreview('');
            UI.displayAuthMessage("Arka plan başarıyla kaldırıldı.", true);
        } catch (error) {
            console.error("Arka plan kaldırılırken hata:", error);
            UI.displayAuthMessage("Arka plan kaldırılırken hata oluştu.", false);
        }
    },

    saveUserBackgroundUrl: async function(url, userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            await docRef.set({ backgroundUrl: url }, { merge: true });
            console.log("Arka plan URL'si kaydedildi.");
        } catch (error) {
            console.error("Arka plan URL'si kaydedilirken hata:", error);
        }
    },

    loadUserBackground: async function(userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            const docSnap = await docRef.get();
            if (docSnap.exists && docSnap.data().backgroundUrl) {
                const imageUrl = docSnap.data().backgroundUrl;
                document.body.style.backgroundImage = `url('${imageUrl}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
                this.updateBackgroundPreview(imageUrl);
                console.log("Arka plan yüklendi.");
            } else {
                document.body.style.backgroundImage = ''; // Temizle
                document.body.style.backgroundColor = ''; // CSS değişkenleri halleder
                this.updateBackgroundPreview('');
                console.log("Kullanıcı arka planı bulunamadı.");
            }
        } catch (error) {
            console.error("Arka plan yüklenirken hata:", error);
        }
    },

    updateBackgroundPreview: function(url = '') {
        if (url) {
            this.bgPreview.style.backgroundImage = `url('${url}')`;
        } else {
            this.bgPreview.style.backgroundImage = '';
            // Varsayılan bir renk veya desen gösterebilirsiniz
            this.bgPreview.style.backgroundColor = '#333'; 
        }
    }
};

// Tema seçenekleri tıklama olayları
ThemeManager.themeOptions.forEach(option => {
    option.addEventListener('click', () => {
        const themeName = option.dataset.theme;
        ThemeManager.applyTheme(themeName);
    });
});

// Arka plan inputu değiştiğinde
ThemeManager.backgroundInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        ThemeManager.uploadBackground(file);
    }
});// Global değişkenlerin tanımlandığını varsayıyoruz (window.db, window.auth, window.storage, window.firebase)
// Bu değişkenler index.html içindeki <script type="module"> bloğunda tanımlanır.

// --- UI Yönetimi ---
const UI = {
    authPage: document.getElementById('authPage'),
    mainPage: document.getElementById('mainPage'),
    aboutPage: document.getElementById('aboutPage'),
    datesPage: document.getElementById('datesPage'),
    authStatus: document.getElementById('authStatus'),
    authMessage: document.getElementById('authMessage'),
    loggedInControls: document.getElementById('loggedInControls'),
    appFooterControls: document.getElementById('appFooterControls'),

    showSection: function(sectionId) {
        // Tüm ana bölümleri gizle
        this.authPage.classList.add('hidden');
        this.mainPage.classList.add('hidden');
        this.aboutPage.classList.add('hidden');
        this.datesPage.classList.add('hidden');

        // İstenen bölümü göster
        document.getElementById(sectionId).classList.remove('hidden');
    },

    displayAuthMessage: function(message, isSuccess = false) {
        this.authMessage.textContent = message;
        this.authMessage.className = 'auth-message'; // Önceki sınıfları temizle
        if (isSuccess) {
            this.authMessage.classList.add('success');
        } else {
            this.authMessage.classList.add('error');
        }
    },

    clearAuthMessage: function() {
        this.authMessage.textContent = '';
        this.authMessage.className = 'auth-message';
    }
};

// --- Kimlik Doğrulama Yönetimi ---
const AuthManager = {
    emailInput: document.getElementById('authEmail'),
    passwordInput: document.getElementById('authPassword'),

    signUp: async function() {
        UI.clearAuthMessage();
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        if (!email || !password) {
            UI.displayAuthMessage("E-posta ve şifre boş bırakılamaz.");
            return;
        }

        try {
            await window.auth.createUserWithEmailAndPassword(email, password);
            UI.displayAuthMessage("Kayıt başarılı! Giriş yapılıyor...", true);
            // Başarılı kayıttan sonra otomatik giriş onAuthStateChanged tarafından halledilecek
        } catch (error) {
            console.error("Kayıt hatası:", error);
            let errorMessage = "Kayıt sırasında bir hata oluştu.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Bu e-posta adresi zaten kullanılıyor.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Geçersiz e-posta adresi.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Şifre en az 6 karakter olmalı.";
            }
            UI.displayAuthMessage(errorMessage);
        }
    },

    signIn: async function() {
        UI.clearAuthMessage();
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        if (!email || !password) {
            UI.displayAuthMessage("E-posta ve şifre boş bırakılamaz.");
            return;
        }

        try {
            await window.auth.signInWithEmailAndPassword(email, password);
            UI.displayAuthMessage("Giriş başarılı!", true);
            // Başarılı giriş onAuthStateChanged tarafından halledilecek
        } catch (error) {
            console.error("Giriş hatası:", error);
            let errorMessage = "Giriş sırasında bir hata oluştu.";
            if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "Yanlış e-posta veya şifre.";
            }
            UI.displayAuthMessage(errorMessage);
        }
    },

    signOut: async function() {
        try {
            await window.auth.signOut();
            console.log("Çıkış yapıldı.");
            UI.displayAuthMessage("Başarıyla çıkış yaptınız.", true);
            // onAuthStateChanged tetiklenecek ve arayüzü güncelleyecek
        } catch (error) {
            console.error("Çıkış hatası:", error);
            UI.displayAuthMessage("Çıkış sırasında bir hata oluştu.");
        }
    }
};


// --- Kimlik Doğrulama Durumu Değişikliklerini Dinle ---
// Bu blok, sayfa yüklendiğinde veya kullanıcı giriş/çıkış yaptığında tetiklenir.
if (window.auth) { // window.auth'un tanımlı olduğundan emin ol
    window.auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Kullanıcı giriş yaptı:", user.uid);
            UI.authStatus.textContent = `Hoş geldin, ${user.email}!`;
            UI.authPage.classList.add('hidden');
            UI.mainPage.classList.remove('hidden');
            UI.loggedInControls.classList.remove('hidden');
            UI.appFooterControls.classList.remove('hidden');
            
            // Kullanıcıya özel verileri yükle
            Counter.loadMainDate(user.uid);
            StoryManager.loadStory('eda', user.uid);
            StoryManager.loadStory('emin', user.uid);
            DateManager.loadImportantDates(user.uid);
            ThemeManager.loadUserTheme(user.uid);
            ThemeManager.loadUserBackground(user.uid);

        } else {
            console.log("Kullanıcı çıkış yaptı veya giriş yapmadı.");
            UI.authStatus.textContent = "Lütfen giriş yapın veya kayıt olun.";
            UI.authPage.classList.remove('hidden');
            UI.mainPage.classList.add('hidden');
            UI.aboutPage.classList.add('hidden'); // Diğer sayfaları da gizle
            UI.datesPage.classList.add('hidden'); // Diğer sayfaları da gizle
            UI.loggedInControls.classList.add('hidden');
            UI.appFooterControls.classList.add('hidden');
            UI.clearAuthMessage();
            // Varsayılan temaya dön veya boş tema ayarla
            document.body.className = ''; 
            document.body.style.backgroundImage = '';
            document.body.style.backgroundColor = '';
        }
    });
} else {
    console.error("Firebase Auth başlatılamadı. AuthManager çalışmayacak.");
    UI.displayAuthMessage("Uygulama başlatılamadı. Lütfen konsolu kontrol edin.", false);
}


// --- Sayaç Yönetimi ---
const Counter = {
    mainDateInput: document.getElementById('mainDateInput'),
    mainCounterTitle: document.getElementById('mainCounterTitle'),
    timerInterval: null,
    
    // Ana sayacı ve başlangıç tarihini yükler
    loadMainDate: async function(userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            const docSnap = await docRef.get();

            if (docSnap.exists && docSnap.data().mainDate) {
                const mainDate = docSnap.data().mainDate.toDate(); // Timestamp'ten Date objesine çevir
                this.mainDateInput.valueAsDate = mainDate;
                this.startCounter(mainDate);
                this.updateMainCounterTitle(mainDate);
            } else {
                console.log("Ana tarih bulunamadı, varsayılanı ayarla.");
                const defaultDate = new Date(); // Bugünün tarihi
                this.mainDateInput.valueAsDate = defaultDate;
                this.startCounter(defaultDate);
                this.updateMainCounterTitle(defaultDate);
            }
        } catch (error) {
            console.error("Ana tarih yüklenirken hata:", error);
        }
    },

    // Ana tarihi günceller ve Firestore'a kaydeder
    saveMainDate: async function(date, userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            await docRef.set({ mainDate: date }, { merge: true }); // Sadece mainDate'i güncelleyin
            console.log("Ana tarih kaydedildi.");
        } catch (error) {
            console.error("Ana tarih kaydedilirken hata:", error);
        }
    },

    // Başlangıç tarihini inputtan alıp sayacı başlatır
    startCounter: function(startDate) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.updateMainCounterTitle(startDate);

        this.timerInterval = setInterval(() => {
            const now = new Date();
            const diff = now.getTime() - startDate.getTime(); // Fark milisaniye cinsinden

            if (diff < 0) { // Gelecek bir tarih seçilirse
                document.getElementById('years').textContent = "0";
                document.getElementById('months').textContent = "0";
                document.getElementById('days').textContent = "0";
                document.getElementById('hours').textContent = "0";
                document.getElementById('minutes').textContent = "0";
                document.getElementById('seconds').textContent = "0";
                this.mainCounterTitle.textContent = "Henüz başlamadı...";
                return;
            }

            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            // Daha doğru yıl ve ay hesaplaması
            let years = 0;
            let months = 0;
            let tempDate = new Date(startDate);
            let totalMonths = 0;

            while (tempDate < now) {
                tempDate.setMonth(tempDate.getMonth() + 1);
                if (tempDate <= now) {
                    totalMonths++;
                } else {
                    tempDate.setMonth(tempDate.getMonth() - 1); // Geri al
                    break;
                }
            }

            years = Math.floor(totalMonths / 12);
            months = totalMonths % 12;

            // Kalan gün, saat, dakika, saniye
            const remainingDays = days - (years * 365 + Math.floor(years / 4)); // Kaba bir tahmin, tam doğru değil
            const remainingHours = hours % 24;
            const remainingMinutes = minutes % 60;
            const remainingSeconds = seconds % 60;

            document.getElementById('years').textContent = years;
            document.getElementById('months').textContent = months;
            document.getElementById('days').textContent = remainingDays < 0 ? 0 : remainingDays; // Negatif olmaması için
            document.getElementById('hours').textContent = remainingHours;
            document.getElementById('minutes').textContent = remainingMinutes;
            document.getElementById('seconds').textContent = remainingSeconds;

        }, 1000);
    },

    updateMainCounterTitle: function(date) {
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
             this.mainCounterTitle.textContent = `${date.toLocaleDateString()} tarihinden beri geçen süre`;
        } else {
            this.mainCounterTitle.textContent = `${date.toLocaleDateString()} tarihine kalan süre`;
        }
       
    }
};

// Ana tarih inputu değiştiğinde
document.getElementById('mainDateInput').addEventListener('change', async function() {
    const selectedDate = this.valueAsDate;
    if (selectedDate && window.auth.currentUser) {
        Counter.startCounter(selectedDate);
        Counter.saveMainDate(selectedDate, window.auth.currentUser.uid);
    }
});


// --- Hikaye Yönetimi ---
const StoryManager = {
    saveStory: async function(person) {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        const textareaId = `${person}Textarea`;
        const storyText = document.getElementById(textareaId).value;

        try {
            const docRef = window.db.collection('users').doc(userId);
            // Sadece ilgili hikaye alanını güncelle
            const updateData = {};
            updateData[`story.${person}`] = storyText;
            await docRef.set(updateData, { merge: true });
            console.log(`${person} hikayesi kaydedildi.`);
            UI.displayAuthMessage(`${person} hikayesi başarıyla kaydedildi!`, true);
            // Hikayeyi hemen güncellenen değeriyle göster
            document.getElementById(`${person}Story`).innerHTML = StoryManager.formatStoryText(storyText);
        } catch (error) {
            console.error(`${person} hikayesi kaydedilirken hata:`, error);
            UI.displayAuthMessage(`${person} hikayesi kaydedilirken hata oluştu.`, false);
        }
    },

    loadStory: async function(person, userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            const docSnap = await docRef.get();
            const storyDiv = document.getElementById(`${person}Story`);
            const textarea = document.getElementById(`${person}Textarea`);

            if (docSnap.exists && docSnap.data().story && docSnap.data().story[person]) {
                const storyText = docSnap.data().story[person];
                storyDiv.innerHTML = this.formatStoryText(storyText);
                textarea.value = storyText;
            } else {
                storyDiv.innerHTML = `<p>Henüz bir hikaye yazılmamış. İlk hikayeni sen yaz!</p>`;
                textarea.value = '';
            }
        } catch (error) {
            console.error(`${person} hikayesi yüklenirken hata:`, error);
            document.getElementById(`${person}Story`).innerHTML = `<p class="error">Hikaye yüklenirken hata oluştu.</p>`;
        }
    },

    // Metinleri <p> etiketlerine bölerek formatlar
    formatStoryText: function(text) {
        if (!text) return '<p>Henüz bir hikaye yazılmamış.</p>';
        return text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }
};

// --- Önemli Tarihler Yönetimi ---
const DateManager = {
    descriptionInput: document.getElementById('dateDescription'),
    dateInput: document.getElementById('dateInput'),
    mediaInput: document.getElementById('mediaInput'),
    importantDatesList: document.getElementById('importantDatesList'),
    imagePreview: document.getElementById('imagePreview'),
    videoPreview: document.getElementById('videoPreview'),
    mediaPreviewContainer: document.getElementById('mediaPreviewContainer'),

    addImportantDate: async function() {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        const description = this.descriptionInput.value;
        const date = this.dateInput.valueAsDate;
        const file = this.mediaInput.files[0];

        if (!description || !date) {
            UI.displayAuthMessage("Açıklama ve tarih boş bırakılamaz.", false);
            return;
        }
        UI.clearAuthMessage();

        let mediaUrl = null;
        let mediaType = null;

        if (file) {
            UI.displayAuthMessage("Medya yükleniyor...", true);
            try {
                // Firebase Storage'a yükleme işlemi
                const storageRef = window.storage.ref(window.storage, `user_uploads/${userId}/${Date.now()}_${file.name}`);
                const snapshot = await window.storage.uploadBytes(storageRef, file);
                mediaUrl = await window.storage.getDownloadURL(snapshot.ref);
                mediaType = file.type.startsWith('image/') ? 'image' : 'video';
                UI.displayAuthMessage("Medya başarıyla yüklendi.", true);
            } catch (error) {
                console.error("Medya yükleme hatası:", error);
                UI.displayAuthMessage("Medya yüklenirken hata oluştu.", false);
                return;
            }
        }

        try {
            await window.db.collection('users').doc(userId).collection('importantDates').add({
                description: description,
                date: date,
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                createdAt: new Date() // Server timestamp yerine doğrudan JavaScript Date objesi kullanıyoruz
            });
            console.log("Önemli tarih eklendi.");
            UI.displayAuthMessage("Önemli tarih başarıyla eklendi!", true);
            this.clearDateForm();
            this.loadImportantDates(userId); // Listeyi yeniden yükle
        } catch (error) {
            console.error("Tarih eklenirken hata:", error);
            UI.displayAuthMessage("Tarih eklenirken hata oluştu.", false);
        }
    },

    loadImportantDates: async function(userId) {
        this.importantDatesList.innerHTML = '<p style="text-align: center; opacity: 0.7;">Yükleniyor...</p>';
        try {
            const querySnapshot = await window.db.collection('users').doc(userId).collection('importantDates').orderBy('date', 'desc').get();
            this.importantDatesList.innerHTML = ''; // Temizle
            if (querySnapshot.empty) {
                this.importantDatesList.innerHTML = '<p style="text-align: center;">Henüz önemli bir tarih eklenmemiş. Haydi bir tane ekle!</p>';
                return;
            }

            querySnapshot.forEach(doc => {
                const data = doc.data();
                const dateObj = data.date ? data.date.toDate() : null; // Timestamp'i Date objesine çevir
                const dateString = dateObj ? dateObj.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Tarih belirtilmemiş';
                
                let mediaHtml = '';
                if (data.mediaUrl && data.mediaType) {
                    if (data.mediaType === 'image') {
                        mediaHtml = `<div class="date-media"><img src="${data.mediaUrl}" alt="${data.description}"></div>`;
                    } else if (data.mediaType === 'video') {
                        mediaHtml = `<div class="date-media"><video controls src="${data.mediaUrl}"></video></div>`;
                    }
                }

                // Tarihe kalan/geçen süreyi hesapla
                const now = new Date();
                let diffText = '';
                if (dateObj) {
                    const diffMs = now.getTime() - dateObj.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffDays === 0) {
                        diffText = "Bugün!";
                    } else if (diffDays > 0) {
                        diffText = `${diffDays} gün önce`;
                    } else { // Gelecekteki tarih
                        diffText = `${Math.abs(diffDays)} gün sonra`;
                    }
                }

                this.importantDatesList.innerHTML += `
                    <div class="date-item" data-id="${doc.id}" data-media-url="${data.mediaUrl || ''}">
                        <div class="date-title">${data.description}</div>
                        <div class="date-display">${dateString}</div>
                        ${mediaHtml}
                        <div class="date-counter">${diffText}</div>
                        <button class="delete-btn" onclick="DateManager.deleteImportantDate('${doc.id}', '${data.mediaUrl || ''}')">Sil</button>
                    </div>
                `;
            });
        } catch (error) {
            console.error("Önemli tarihler yüklenirken hata:", error);
            this.importantDatesList.innerHTML = '<p class="error">Tarihler yüklenirken hata oluştu.</p>';
        }
    },

    deleteImportantDate: async function(docId, mediaUrl) {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        if (confirm("Bu tarihi silmek istediğinizden emin misiniz?")) {
            try {
                // Medya dosyasını Storage'dan sil (varsa)
                if (mediaUrl) {
                    const fileRef = window.storage.ref(window.storage, mediaUrl);
                    await window.storage.deleteObject(fileRef).catch(e => {
                        if (e.code === 'storage/object-not-found') {
                            console.log("Silinecek eski arka plan dosyası bulunamadı, sorun değil.");
                        } else {
                            throw e; // Başka bir hata varsa tekrar fırlat
                        }
                    });
                    console.log("Medya dosyası silindi (varsa).");
                }

                // Firestore dokümanını sil
                await window.db.collection('users').doc(userId).collection('importantDates').doc(docId).delete();
                console.log("Tarih silindi.");
                UI.displayAuthMessage("Tarih başarıyla silindi.", true);
                this.loadImportantDates(userId); // Listeyi yeniden yükle
            } catch (error) {
                console.error("Tarih silinirken hata:", error);
                UI.displayAuthMessage("Tarih silinirken hata oluştu.", false);
            }
        }
    },

    clearDateForm: function() {
        this.descriptionInput.value = '';
        this.dateInput.value = '';
        this.mediaInput.value = ''; // File inputu temizle
        this.imagePreview.style.display = 'none';
        this.imagePreview.src = '#';
        this.videoPreview.style.display = 'none';
        this.videoPreview.src = '#';
        this.mediaPreviewContainer.style.display = 'none';
    }
};

// Medya önizlemesi için event listener
document.getElementById('mediaInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const fileType = file.type;
        const reader = new FileReader();

        reader.onload = function(e) {
            DateManager.mediaPreviewContainer.style.display = 'block';
            if (fileType.startsWith('image/')) {
                DateManager.imagePreview.src = e.target.result;
                DateManager.imagePreview.style.display = 'block';
                DateManager.videoPreview.style.display = 'none';
            } else if (fileType.startsWith('video/')) {
                DateManager.videoPreview.src = e.target.result;
                DateManager.videoPreview.style.display = 'block';
                DateManager.imagePreview.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    } else {
        DateManager.mediaPreviewContainer.style.display = 'none';
        DateManager.imagePreview.src = '#';
        DateManager.videoPreview.src = '#';
        DateManager.imagePreview.style.display = 'none';
        DateManager.videoPreview.style.display = 'none';
    }
});


// --- Tema ve Arka Plan Yönetimi ---
const ThemeManager = {
    customizationPanel: document.getElementById('customizationPanel'),
    overlay: document.getElementById('overlay'),
    themeOptions: document.querySelectorAll('.theme-option'),
    backgroundInput: document.getElementById('backgroundInput'),
    bgPreview: document.getElementById('bgPreview'),

    openCustomizationPanel: function() {
        this.customizationPanel.classList.add('show');
        this.overlay.classList.add('show');
        this.updateThemeActiveStates();
        this.updateBackgroundPreview();
    },

    closeCustomizationPanel: function() {
        this.customizationPanel.classList.remove('show');
        this.overlay.classList.remove('show');
    },

    applyTheme: function(themeName) {
        document.body.className = `theme-${themeName}`; // 'theme-' önekini ekliyoruz
        if (window.auth.currentUser) {
            this.saveUserTheme(themeName, window.auth.currentUser.uid);
        }
        this.updateThemeActiveStates();
    },

    saveUserTheme: async function(themeName, userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            await docRef.set({ theme: themeName }, { merge: true });
            console.log("Tema kaydedildi:", themeName);
        } catch (error) {
            console.error("Tema kaydedilirken hata:", error);
        }
    },

    loadUserTheme: async function(userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            const docSnap = await docRef.get();
            if (docSnap.exists && docSnap.data().theme) {
                const savedTheme = docSnap.data().theme;
                document.body.className = `theme-${savedTheme}`;
                console.log("Tema yüklendi:", savedTheme);
            } else {
                console.log("Kullanıcı teması bulunamadı, varsayılan tema uygulanıyor.");
                document.body.className = `theme-dark`; // Varsayılan tema
            }
            this.updateThemeActiveStates();
        } catch (error) {
            console.error("Tema yüklenirken hata:", error);
        }
    },

    updateThemeActiveStates: function() {
        this.themeOptions.forEach(option => {
            option.classList.remove('active');
            if (document.body.classList.contains(option.dataset.theme)) {
                option.classList.add('active');
            }
        });
    },

    uploadBackground: async function(file) {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        if (!file) {
            console.log("Dosya seçilmedi.");
            return;
        }

        UI.displayAuthMessage("Arka plan yükleniyor...", true);
        try {
            const storageRef = window.storage.ref(window.storage, `user_backgrounds/${userId}/custom_background`);
            const snapshot = await window.storage.uploadBytes(storageRef, file);
            const imageUrl = await window.storage.getDownloadURL(snapshot.ref);
            
            document.body.style.backgroundImage = `url('${imageUrl}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed'; // Eklemeyi unutmayın
            
            this.saveUserBackgroundUrl(imageUrl, userId);
            this.updateBackgroundPreview(imageUrl);
            UI.displayAuthMessage("Arka plan başarıyla yüklendi!", true);
        } catch (error) {
            console.error("Arka plan yükleme hatası:", error);
            UI.displayAuthMessage("Arka plan yüklenirken hata oluştu.", false);
        }
    },

    removeBackground: async function() {
        if (!window.auth.currentUser) {
            console.error("Kullanıcı girişi yapılmamış.");
            return;
        }
        const userId = window.auth.currentUser.uid;
        
        try {
            // Firestore'daki URL'yi kaldır
            const docRef = window.db.collection('users').doc(userId);
            // FieldValue.delete() import edildiği için doğrudan kullanılabilir
            await docRef.set({ backgroundUrl: window.firebase.firestore.FieldValue.delete() }, { merge: true });
            
            // Storage'dan dosyayı sil (eğer daha önce yüklenmişse)
            // Bu kısım biraz karmaşık olabilir çünkü dosyanın tam yolunu bilmemiz gerekiyor.
            // Örnek: user_backgrounds/userId/custom_background
            const fileRef = window.storage.ref(window.storage, `user_backgrounds/${userId}/custom_background`);
            // Dosya yoksa hata vermemesi için catch bloğu ekledik.
            await window.storage.deleteObject(fileRef).catch(e => {
                if (e.code === 'storage/object-not-found') {
                    console.log("Silinecek eski arka plan dosyası bulunamadı, sorun değil.");
                } else {
                    throw e; // Başka bir hata varsa tekrar fırlat
                }
            });

            document.body.style.backgroundImage = ''; // CSS'i temizle
            document.body.style.backgroundColor = ''; // Eğer renk teması varsa geri dönsün
            this.updateBackgroundPreview('');
            UI.displayAuthMessage("Arka plan başarıyla kaldırıldı.", true);
        } catch (error) {
            console.error("Arka plan kaldırılırken hata:", error);
            UI.displayAuthMessage("Arka plan kaldırılırken hata oluştu.", false);
        }
    },

    saveUserBackgroundUrl: async function(url, userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            await docRef.set({ backgroundUrl: url }, { merge: true });
            console.log("Arka plan URL'si kaydedildi.");
        } catch (error) {
            console.error("Arka plan URL'si kaydedilirken hata:", error);
        }
    },

    loadUserBackground: async function(userId) {
        try {
            const docRef = window.db.collection('users').doc(userId);
            const docSnap = await docRef.get();
            if (docSnap.exists && docSnap.data().backgroundUrl) {
                const imageUrl = docSnap.data().backgroundUrl;
                document.body.style.backgroundImage = `url('${imageUrl}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
                this.updateBackgroundPreview(imageUrl);
                console.log("Arka plan yüklendi.");
            } else {
                document.body.style.backgroundImage = ''; // Temizle
                document.body.style.backgroundColor = ''; // CSS değişkenleri halleder
                this.updateBackgroundPreview('');
                console.log("Kullanıcı arka planı bulunamadı.");
            }
        } catch (error) {
            console.error("Arka plan yüklenirken hata:", error);
        }
    },

    updateBackgroundPreview: function(url = '') {
        if (url) {
            this.bgPreview.style.backgroundImage = `url('${url}')`;
        } else {
            this.bgPreview.style.backgroundImage = '';
            // Varsayılan bir renk veya desen gösterebilirsiniz
            this.bgPreview.style.backgroundColor = '#333'; 
        }
    }
};

// Tema seçenekleri tıklama olayları
ThemeManager.themeOptions.forEach(option => {
    option.addEventListener('click', () => {
        const themeName = option.dataset.theme;
        ThemeManager.applyTheme(themeName);
    });
});

// Arka plan inputu değiştiğinde
ThemeManager.backgroundInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        ThemeManager.uploadBackground(file);
    }
});
