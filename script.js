/* ---------------------------
   CONFIG
--------------------------- */
const EBIRD_API_KEY = "lel5qn20tf0m";
// ... no início do script.js
const loadingSpinner = document.getElementById("loading-spinner"); // <-- NOVO: Referência ao spinner
// ...

/* ---------------------------
   MENU SANDUÍCHE
--------------------------- */
const menuBtn = document.getElementById("menu-btn");
const sidebar = document.getElementById("sidebar");

menuBtn.addEventListener("click", () => {
    sidebar.style.left = sidebar.style.left === "0px" ? "-260px" : "0px";
});

/* Expandir submenu */
const submenuToggle = document.querySelector(".submenu-toggle");
const submenu = document.querySelector(".submenu");

submenuToggle.addEventListener("click", () => {
    submenu.style.display = submenu.style.display === "block" ? "none" : "block";
});


/* ---------------------------
   NAVEGAÇÃO ENTRE SEÇÕES
--------------------------- */
const inicioSection = document.getElementById("inicio-section");
const birdsSection = document.getElementById("birds-section");

document.querySelector("[data-section='inicio']").addEventListener("click", () => {
    inicioSection.style.display = "block";
    birdsSection.style.display = "none";
    sidebar.style.left = "-260px";
});

/* ---------------------------
   PROCESSAR LISTA DE AVES (COM TRADUÇÃO)
--------------------------- */
async function processBirds(birds) {
    const translationPromises = birds.map(async (bird) => {
        // Traduz o nome comum
        const translatedName = await translate(bird.comName);
        
        return {
            name: translatedName, // Nome comum traduzido
            scientific: bird.sciName,
            // A imagem será carregada depois
            // As outras propriedades da API eBird não são necessárias aqui
        };
    });

    return await Promise.all(translationPromises);
}

/* ---------------------------
   FUNÇÃO: BUSCAR AVES POR REGIÃO
--------------------------- */
async function getBirdsFromRegion(regionCode) {
    const url = `https://api.ebird.org/v2/data/obs/${regionCode}/recent`;

    const response = await fetch(url, {
        headers: { "X-eBirdApiToken": EBIRD_API_KEY }
    });

    return await response.json();
}


/* ---------------------------
   BUSCAR FOTOS NO iNATURALIST
--------------------------- */
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


/* ---------------------------
   CRIAR CARD
--------------------------- */
function createBirdCard(bird) {
    const container = document.getElementById("birds");

    const card = document.createElement("div");
    card.classList.add("card");
    card.style.cursor = "pointer"; // mostra o dedinho

    card.innerHTML = `
        <img src="${bird.image}" alt="${bird.name}">
        <h3>${bird.name}</h3>
        <p>${bird.scientific}</p>
    `;

    // ABRIR MODAL AO CLICAR
    card.addEventListener("click", () => openModal(bird));

    container.appendChild(card);
}


/* ---------------------------
   CARREGAR LISTA DE AVES
--------------------------- */
/* ---------------------------
   CARREGAR LISTA DE AVES
--------------------------- */
async function loadBirds(regionCode, regionName) {
    inicioSection.style.display = "none";
    birdsSection.style.display = "block";
    document.getElementById("region-title").innerText = `Aves – ${regionName}`;

    const container = document.getElementById("birds");
    container.innerHTML = "";
    loadingSpinner.classList.remove("hidden"); 
    
    try {
        const rawBirds = await getBirdsFromRegion(regionCode);

        // NOVO: Traduz os nomes comuns das aves (Passo 1)
        const translatedBirds = await processBirds(rawBirds);
        
        const birdsWithImage = [];
        const birdsWithoutImage = [];
        
        // Carregar imagens em paralelo (Passo 2)
        const imagePromises = translatedBirds.map(bird => getBirdImage(bird.scientific));
        const images = await Promise.all(imagePromises);

        for (let i = 0; i < translatedBirds.length; i++) {
            const bird = translatedBirds[i];
            const image = images[i];
            
            const birdData = {
                name: bird.name, // Nome já traduzido
                scientific: bird.scientific,
                image
            };

            // Verifica se a imagem é o placeholder
            if (image.includes("No-Image-Placeholder.svg")) {
                birdsWithoutImage.push(birdData);
            } else {
                birdsWithImage.push(birdData);
            }
        }
        
        // Concatena: primeiro as com foto, depois as sem foto
        const sortedBirds = [...birdsWithImage, ...birdsWithoutImage];

        // Cria os cards na ordem priorizada
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


/* ---------------------------
   MAPA DE CONTINENTES
--------------------------- */
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


/* ---------------------------
   BUSCAR POR NOME
--------------------------- */
document.getElementById("searchBtn").addEventListener("click", async () => {
    const inputName = document.getElementById("searchInput").value.trim();
    if (!inputName) return;

    inicioSection.style.display = "none";
    birdsSection.style.display = "block";
    
    // NOVO: Exibe o termo de busca original do usuário
    document.getElementById("region-title").innerText = `Resultados para: ${inputName}`;

    const container = document.getElementById("birds");
    container.innerHTML = "";
    loadingSpinner.classList.remove("hidden"); // Assume que você adicionou o loadingSpinner

    try {
        // PASSO 1: TRADUZIR O TERMO DE BUSCA DO USUÁRIO (Português -> Inglês)
        const searchTerm = await translate(inputName, 'pt|en');
        
        const url = `https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json`;
        const response = await fetch(url, {
            headers: { "X-eBirdApiToken": EBIRD_API_KEY }
        });
        const data = await response.json();

        // PASSO 2: FILTRAGEM: Usa o termo de busca traduzido (searchTerm)
        const filtered = data.filter(item =>
            item.comName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const birdsWithImage = [];
        const birdsWithoutImage = [];

        // PASSO 3: PROCESSAMENTO, IMAGEM E TRADUÇÃO DE VOLTA PARA PORTUGUÊS
        const birdPromises = filtered.map(async (bird) => {
            // Traduz o nome da ave de volta para Português ('en|pt')
            const translatedName = await translate(bird.comName, 'en|pt');
            const image = await getBirdImage(bird.sciName);
            
            return {
                name: translatedName,
                scientific: bird.sciName,
                image
            };
        });
        
        const processedBirds = await Promise.all(birdPromises);

        // PASSO 4: ORDENAÇÃO E CRIAÇÃO DOS CARDS
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


/* ========================================================================
   MODAL COMPLETO (CORRIGIDO)
======================================================================== */

// Criar modal dinamicamente
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


// TRADUTOR
async function translate(text, langPair = 'en|pt') {
    const [sourceLang, targetLang] = langPair.split('|');
    // Usamos 'auto' para a tradução de nomes longos e o par específico para o termo de busca.
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // O endpoint do Google retorna um array complexo.
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }
    } catch (e) {
        console.error(`Erro na tradução (${langPair}):`, e);
    }
    
    // Retorna o texto original como fallback seguro
    return text;
}


/* ---------------------------
   FUNÇÃO: DESCRIÇÃO VIA WIKIPEDIA
   (Garante que a descrição longa não quebre a requisição)
--------------------------- */
async function getBirdDescription(scientificName) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.extract) {
            let description = data.extract;
            
            // Limita o tamanho do texto para garantir que o endpoint do Google não seja sobrecarregado (embora o limite seja maior)
            if (description.length > 5000) { // Um limite mais generoso
                 description = description.substring(0, 5000) + " [...] (Descrição completa na Wikipedia)";
            }
            
            // Tenta traduzir. A função translate agora tem o fallback para inglês embutido.
            return await translate(description);
        }
    } catch (e) {
        console.error("Erro ao buscar descrição na Wikipedia:", e);
    }

    return "Sem descrição disponível.";
}


// ABRIR MODAL
async function openModal(bird) {
    document.getElementById("modal-img").src = bird.image;
    document.getElementById("modal-title").innerText = bird.name;
    document.getElementById("modal-scientific").innerText = bird.scientific;

    // carregar descrição
    const desc = await getBirdDescription(bird.scientific);
    document.getElementById("modal-description").innerText = desc;

    // ativar modal
    modal.style.display = "flex";

    // blur no fundo
    document.body.classList.add("blur-active");

    // bloquear scroll
    document.body.style.overflow = "hidden";
}


// FECHAR MODAL
function closeModal() {
    modal.style.display = "none";

    // remover blur
    document.body.classList.remove("blur-active");

    // liberar scroll
    document.body.style.overflow = "auto";
}

document.getElementById("close-modal").addEventListener("click", closeModal);

// fechar clicando fora
modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

/* ---------------------------
   PESQUISA COM ENTER
--------------------------- */
document.getElementById("searchInput").addEventListener("keypress", (event) => {
    // Verifica se a tecla pressionada é 'Enter' (código 13)
    if (event.key === 'Enter') {
        // Impede o comportamento padrão (como submeter um formulário e recarregar a página)
        event.preventDefault(); 
        
        // Chama o evento de click do botão de busca
        document.getElementById("searchBtn").click(); 
    }
});