const EBIRD_API_KEY = "lel5qn20tf0m";
const loadingSpinner = document.getElementById("loading-spinner");

const menuBtn = document.getElementById("menu-btn");
const sidebar = document.getElementById("sidebar");

menuBtn.addEventListener("click", () => {
    sidebar.style.left = sidebar.style.left === "0px" ? "-260px" : "0px";
});

const submenuToggle = document.querySelector(".submenu-toggle");
const submenu = document.querySelector(".submenu");

submenuToggle.addEventListener("click", () => {
    submenu.style.display = submenu.style.display === "block" ? "none" : "block";
});

const inicioSection = document.getElementById("inicio-section");
const birdsSection = document.getElementById("birds-section");

document.querySelector("[data-section='inicio']").addEventListener("click", () => {
    inicioSection.style.display = "block";
    birdsSection.style.display = "none";
    sidebar.style.left = "-260px";
});

async function processBirds(birds) {
    const translationPromises = birds.map(async (bird) => {
        const translatedName = await translate(bird.comName);
        
        return {
            name: translatedName,
            scientific: bird.sciName,
        };
    });

    return await Promise.all(translationPromises);
}

async function getBirdsFromRegion(regionCode) {
    const url = `https://api.ebird.org/v2/data/obs/${regionCode}/recent`;

    const response = await fetch(url, {
        headers: { "X-eBirdApiToken": EBIRD_API_KEY }
    });

    return await response.json();
}

async function getBirdImage(scientificName) {
    const url = `https://api.inaturalist.org/v1/search?q=${encodeURIComponent(scientificName)}&sources=taxa`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results?.length > 0) {
            const bird = data.results[0];
            if (bird.record?.default_photo?.medium_url) {
                return bird.record.default_photo.medium_url;
            }
        }
    } catch {}

    return "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg";
}

function createBirdCard(bird) {
    const container = document.getElementById("birds");

    const card = document.createElement("div");
    card.classList.add("card");
    card.style.cursor = "pointer";

    card.innerHTML = `
        <img src="${bird.image}" alt="${bird.name}">
        <h3>${bird.name}</h3>
        <p>${bird.scientific}</p>
    `;

    card.addEventListener("click", () => openModal(bird));

    container.appendChild(card);
}

async function loadBirds(regionCode, regionName) {
    inicioSection.style.display = "none";
    birdsSection.style.display = "block";
    document.getElementById("region-title").innerText = `Aves – ${regionName}`;

    const container = document.getElementById("birds");
    container.innerHTML = "";
    loadingSpinner.classList.remove("hidden"); 
    
    try {
        const rawBirds = await getBirdsFromRegion(regionCode);

        const translatedBirds = await processBirds(rawBirds);
        
        const birdsWithImage = [];
        const birdsWithoutImage = [];
        
        const imagePromises = translatedBirds.map(bird => getBirdImage(bird.scientific));
        const images = await Promise.all(imagePromises);

        for (let i = 0; i < translatedBirds.length; i++) {
            const bird = translatedBirds[i];
            const image = images[i];
            
            const birdData = {
                name: bird.name,
                scientific: bird.scientific,
                image
            };

            if (image.includes("No-Image-Placeholder.svg")) {
                birdsWithoutImage.push(birdData);
            } else {
                birdsWithImage.push(birdData);
            }
        }
        
        const sortedBirds = [...birdsWithImage, ...birdsWithoutImage];

        for (const bird of sortedBirds) {
            createBirdCard(bird);
        }
    } catch (error) {
        console.error("Erro ao carregar aves:", error);
        container.innerHTML = "<p>Houve um erro ao carregar os dados. Tente novamente mais tarde.</p>";
    } finally {
        loadingSpinner.classList.add("hidden"); 
        sidebar.style.left = "-260px";
    }
}

const continentMap = {
    "br": { region: "BR", name: "América do Sul" },
    "eu": { region: "GR", name: "Europa" },
    "na": { region: "US", name: "América do Norte" },
    "af": { region: "ZA", name: "África" },
    "as": { region: "IN", name: "Ásia" },
    "oc": { region: "AU", name: "Oceania" }
};

document.querySelectorAll(".submenu li").forEach(li => {
    li.addEventListener("click", () => {
        const key = li.dataset.continent;
        const info = continentMap[key];

        loadBirds(info.region, info.name);
    });
});

document.getElementById("searchBtn").addEventListener("click", async () => {
    const inputName = document.getElementById("searchInput").value.trim();
    if (!inputName) return;

    inicioSection.style.display = "none";
    birdsSection.style.display = "block";
    
    document.getElementById("region-title").innerText = `Resultados para: ${inputName}`;

    const container = document.getElementById("birds");
    container.innerHTML = "";
    loadingSpinner.classList.remove("hidden");

    try {
        const searchTerm = await translate(inputName, 'pt|en');
        
        const url = `https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json`;
        const response = await fetch(url, {
            headers: { "X-eBirdApiToken": EBIRD_API_KEY }
        });
        const data = await response.json();

        const filtered = data.filter(item =>
            item.comName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const birdsWithImage = [];
        const birdsWithoutImage = [];

        const birdPromises = filtered.map(async (bird) => {
            const translatedName = await translate(bird.comName, 'en|pt');
            const image = await getBirdImage(bird.sciName);
            
            return {
                name: translatedName,
                scientific: bird.sciName,
                image
            };
        });
        
        const processedBirds = await Promise.all(birdPromises);

        for (const bird of processedBirds) {
            if (bird.image.includes("No-Image-Placeholder.svg")) {
                birdsWithoutImage.push(bird);
            } else {
                birdsWithImage.push(bird);
            }
        }
        
        const sortedBirds = [...birdsWithImage, ...birdsWithoutImage];

        for (const bird of sortedBirds) {
            createBirdCard(bird);
        }

    } catch (error) {
        console.error("Erro na busca:", error);
        container.innerHTML = "<p>Houve um erro ao realizar a busca. Por favor, tente novamente.</p>";
    } finally {
        loadingSpinner.classList.add("hidden"); 
    }
});

const modal = document.createElement("div");
modal.id = "modal";
modal.style.display = "none";

modal.innerHTML = `
    <div id="modal-content">
        <span id="close-modal">&times;</span>
        <img id="modal-img">
        <h2 id="modal-title"></h2>
        <h4 id="modal-scientific"></h4>
        <p id="modal-description">Carregando descrição...</p>
    </div>
`;

document.body.appendChild(modal);

async function translate(text, langPair = 'en|pt') {
    const [sourceLang, targetLang] = langPair.split('|');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }
    } catch (e) {
        console.error(`Erro na tradução (${langPair}):`, e);
    }
    
    return text;
}

async function getBirdDescription(scientificName) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.extract) {
            let description = data.extract;
            
            if (description.length > 5000) {
                 description = description.substring(0, 5000) + " [...] (Descrição completa na Wikipedia)";
            }
            
            return await translate(description);
        }
    } catch (e) {
        console.error("Erro ao buscar descrição na Wikipedia:", e);
    }

    return "Sem descrição disponível.";
}

async function openModal(bird) {
    document.getElementById("modal-img").src = bird.image;
    document.getElementById("modal-title").innerText = bird.name;
    document.getElementById("modal-scientific").innerText = bird.scientific;

    const desc = await getBirdDescription(bird.scientific);
    document.getElementById("modal-description").innerText = desc;

    modal.style.display = "flex";

    document.body.classList.add("blur-active");

    document.body.style.overflow = "hidden";
}

function closeModal() {
    modal.style.display = "none";

    document.body.classList.remove("blur-active");

    document.body.style.overflow = "auto";
}

document.getElementById("close-modal").addEventListener("click", closeModal);

modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

document.getElementById("searchInput").addEventListener("keypress", (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); 
        
        document.getElementById("searchBtn").click(); 
    }
});