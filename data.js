// Hier kannst du alle deine Lebenslauf-Daten anpassen!
// Speichere diese Datei auf GitHub und dein Spiel aktualisiert sich automatisch.
// Nutze die admin.html Seite, um diese Daten komfortabel zu bearbeiten.

const resumeData = {
    intro: "Hallo! Willkommen in meiner interaktiven Welt. Steuere mich mit den Pfeiltasten (oder W/A/S/D) und besuche die Gebäude. Drücke 'E' an einem Gebäude, um mehr über meinen Lebenslauf zu erfahren! (Auf dem Handy nutze die Buttons unten)",
    hobbies: [
        "⚽ Fußball & Sport", 
        "💻 Programmieren & Tech", 
        "🌍 Reisen & Neue Kulturen", 
        "📚 Lesen & Weiterbildung"
    ],
    education: [
        { date: "2018 - 2022", title: "Bachelor of Science: Informatik", detail: "Technische Universität Musterstadt" },
        { date: "2015 - 2018", title: "Fachabitur", detail: "Berufsschule für Technik" }
    ],
    travels: [
        { date: "1988", country: "Reise in die DDR (Meine erste große Reise)" },
        { date: "2012", country: "Spanien, Barcelona" },
        { date: "2016", country: "USA, California Roadtrip" },
        { date: "2019", country: "Japan, Tokyo & Kyoto" },
        { date: "2023", country: "Italien, Rom" }
    ],
    skills: [
        { name: "Webentwicklung (HTML, CSS, JS)", level: "Experte" },
        { name: "Teamführung & Kommunikation", level: "Sehr gut" },
        { name: "Problemlösung", level: "Stark" },
        { name: "Gastro-Stressresistenz", level: "Überragend" }
    ],
    experience: [
        { date: "2022 - Heute", role: "Junior Softwareentwickler", company: "Tech StartUp Berlin" },
        { date: "2020 - 2022", role: "IT-Systemadministrator", company: "Mittelstands GmbH" }
    ],
    minijobs: [
        { date: "2016 - 2018", role: "Kellner & Barista", company: "Café Zentral" },
        { date: "2015 - 2016", role: "Küchenhilfe", company: "Restaurant bella Italia" },
        { date: "2014 - 2015", role: "Aushilfe Catering", company: "Event Gastro" }
    ],
    fairytale: {
        intro: "Es war einmal in einem weit entfernten Code-Königreich, da machte sich ein tapferer Entdecker auf den Weg, um die Welt der Technologie, Gastronomie und fernen Länder zu erobern...",
        hobbies: "Wann immer der Held sein Schwert ruhen ließ, fand er Freude daran, über den grünen Rasen zu rennen, magische Runen (Code) in seine Tastatur zu hämmern und verborgene Bücher nach altem Wissen zu durchforsten.",
        education: "In den Hallen der Gelehrten eignete sich der Held die Künste der Informatik an, wo er lernte, wie die Maschinen von Geisterhand flüsterten.",
        travels: "Mit Siebenmeilenstiefeln bereiste er ferne Welten: Vom fernen Sonnenaufgang in Tokyo bis hin zu den antiken Gladiatoren-Arenen Roms. Jeder Ort hinterließ eine Spur auf seiner Seele.",
        skills: "Durch viele Schlachten schmiedete er wertvolle Fähigkeiten: Er lenkte die Ströme des Webs (HTML/CSS/JS) so meisterhaft wie ein Zauberer und bewahrte selbst im hitzigsten Tavernen-Chaos (Gastro-Stress) stets einen kühlen Kopf.",
        experience: "Im großen Ratszimmer der Gilden bewies er sich als eifriger Software-Entwickler, nachdem er zuvor das Netzwerk der städtischen Kaufmannsgilde am Laufen gehalten hatte.",
        minijobs: "Doch seine Anfänge waren bescheiden: Als Tränke-Mischer (Barista) und fleißiger Helfer in den tiefsten Küchen des Königreichs erlernte er Demut und harte Arbeit."
    }
};

window.resumeData = resumeData;

