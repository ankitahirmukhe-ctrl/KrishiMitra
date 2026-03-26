let currentLang = "Marathi";

const sessionId = "session_" + Math.random().toString(36).slice(2, 10);
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
const synth = window.speechSynthesis;

const ui = {
    "English": { 
        title: "Krishi Mitra", 
        status: "Online", 
        greet: "Hello, I am Krishi Mitra. What would you like to ask?", 
        place: "Type or speak...", 
        send: "Send" 
    },
    "Marathi": { 
        title: "कृषी मित्र", 
        status: "सज्ज आहे", 
        greet: "नमस्कार, मी कृषी मित्र आहे. तुम्हाला काय विचारायचे आहे?", 
        place: "येथे बोला किंवा लिहा...", 
        send: "पाठवा" 
    },
    "Hindi": { 
        title: "कृषि मित्र", 
        status: "तैयार", 
        greet: "नमस्ते, मैं कृषि मित्र हूँ। आप क्या पूछना चाहते हैं?", 
        place: "यहाँ बोलें या लिखें...", 
        send: "भेजें" 
    }
};

// 🔢 Number localization
const digitMap = {
    '0': '०','1': '१','2': '२','3': '३','4': '४',
    '5': '५','6': '६','7': '७','8': '८','9': '९'
};

function localizeNumbers(text, lang) {
    if (lang === 'English') return text;
    return text.replace(/[0-9]/g, d => digitMap[d]);
}

// 🧾 Format reply
function formatReply(text) {
    return text
        .split("\n")
        .filter(line => line.trim() !== "")
        .map(line => `<p style="margin-bottom:10px;">${line}</p>`)
        .join("");
}

// 🔊 Speech (FIXED)
function speak(text) {
    if (synth.speaking) synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    let voices = synth.getVoices();

    if (!voices.length) {
        setTimeout(() => speak(text), 200);
        return;
    }

    let voice =
        currentLang === "Marathi"
            ? voices.find(v => v.lang === "mr-IN") || voices.find(v => v.lang.includes("hi")) || voices.find(v => v.lang.includes("en"))
            : currentLang === "Hindi"
            ? voices.find(v => v.lang.includes("hi")) || voices.find(v => v.lang.includes("en"))
            : voices.find(v => v.lang.includes("en"));

    if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
    }

    synth.speak(utter);
}

// 🌐 Language update
function updateLanguage(lang) {
    currentLang = lang;

    document.getElementById("ui-title").innerText = ui[lang].title;
    document.getElementById("ai-status").innerText = ui[lang].status;
    document.getElementById("input").placeholder = ui[lang].place;
    document.getElementById("ui-send").innerText = ui[lang].send;

    const chatBox = document.getElementById("chatBox");
    const greeting = localizeNumbers(ui[lang].greet, lang);

    chatBox.innerHTML += `<div class="bot-msg"><b>${ui[lang].title}:</b><p>${greeting}</p></div>`;
    speak(greeting);
}

// 🎤 Voice
function startVoice() {
    recognition.lang = currentLang === "Marathi" ? "mr-IN" :
                       currentLang === "Hindi" ? "hi-IN" : "en-IN";
    recognition.start();
}

recognition.onresult = (e) => {
    document.getElementById("input").value = e.results[0][0].transcript;
    sendMessage();
};

// 🚀 MAIN FUNCTION (UPDATED - NO LOCATION / NO SHOPS)
async function sendMessage() {
    const input = document.getElementById("input");
    const chatBox = document.getElementById("chatBox");
    const text = input.value.trim();
    if (!text) return;

    chatBox.innerHTML += `<div class="user-msg">${text}</div>`;
    input.value = "";

    try {
        // ✅ FIX: normalize language before sending
        const lang = (currentLang || "English").trim();

        const response = await fetch("http://localhost:3000/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ 
                message: text, 
                language: lang,   // ✅ fixed
                sessionId 
            })
        });

        const data = await response.json();

        const reply = localizeNumbers(data.reply, currentLang);
        chatBox.innerHTML += `<div class="bot-msg"><b>${ui[currentLang].title}:</b>${formatReply(reply)}</div>`;
        speak(reply);

        // 🌦️ WEATHER (ONLY ADVICE)
        const weather = await getWeather(18.5204, 73.8567);

        if (weather) {
            const advice = getWeatherAdvice(weather);

            let title =
                currentLang === "Hindi" ? "🌦️ मौसम सलाह" :
                currentLang === "English" ? "🌦️ Weather Advice" :
                "🌦️ हवामान सल्ला";

            chatBox.innerHTML += `
                <div class="bot-msg">
                    <b>${title}:</b>
                    <p>${advice}</p>
                </div>
            `;
        }

    } catch {
        chatBox.innerHTML += `<div class="bot-msg" style="color:red;">Error</div>`;
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}
// 🌦️ WEATHER API
async function getWeather(lat, lon) {
    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const data = await res.json();
        return data.current_weather;
    } catch {
        return null;
    }
}

// 🌾 WEATHER ADVICE (FIXED LOGIC)
function getWeatherAdvice(w) {
    const t = w.temperature;
    const wind = w.windspeed;

    if (t >= 32) {
        if (currentLang === "Hindi") return "तापमान अधिक है। सुबह या शाम पानी दें।";
        if (currentLang === "English") return "High temperature. Water crops morning/evening.";
        return "तापमान जास्त आहे. सकाळी किंवा संध्याकाळी पाणी द्या.";
    }

    if (t <= 18) {
        if (currentLang === "Hindi") return "तापमान कम है। फसल को सुरक्षित रखें।";
        if (currentLang === "English") return "Low temperature. Protect crops.";
        return "तापमान कमी आहे. पिकांचे संरक्षण करा.";
    }

    if (wind >= 15) {
        if (currentLang === "Hindi") return "हवा तेज है। फवारणी न करें।";
        if (currentLang === "English") return "Strong wind. Avoid spraying.";
        return "वारा जास्त आहे. फवारणी टाळा.";
    }

    if (currentLang === "Hindi") return "मौसम सामान्य है। खेती जारी रखें।";
    if (currentLang === "English") return "Weather is moderate. Continue farming.";
    return "हवामान सामान्य आहे. शेती सुरू ठेवा.";
}

// INIT
window.onload = () => updateLanguage("Marathi");
window.speechSynthesis.onvoiceschanged = () => synth.getVoices();