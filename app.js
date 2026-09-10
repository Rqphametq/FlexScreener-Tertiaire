// Variable globale pour stocker les données prêtes à être exportées
let leadsData = []; 

// --- 1. MATRICE SECTORIELLE (Hypothèses Métier) ---
function getHypothesesSecteur(secteurStr) {
    const secteur = (secteurStr || "").toLowerCase();
    
    // Application des règles selon le secteur d'activité
    if (secteur.includes("bureaux") || secteur.includes("administration")) return { R_th: 60, T_eff: 0.40 };
    if (secteur.includes("magasin") || secteur.includes("commerce")) return { R_th: 70, T_eff: 0.45 };
    if (secteur.includes("enseignement") || secteur.includes("école")) return { R_th: 50, T_eff: 0.30 };
    if (secteur.includes("restaurant") || secteur.includes("hôtel") || secteur.includes("débits de boisson")) return { R_th: 60, T_eff: 0.20 };
    if (secteur.includes("santé") || secteur.includes("hôpital")) return { R_th: 80, T_eff: 0.05 };
    
    // Valeur par défaut
    return { R_th: 60, T_eff: 0.40 };
}

// --- 2. MOTEUR DE RECHERCHE PRINCIPAL ---
async function lancerFlexScreener() {
    // Récupération des paramètres utilisateur depuis l'interface
    const codePostal = document.getElementById('inputCP').value.trim();
    const surfaceMin = parseInt(document.getElementById('inputSurface').value) || 500;
    const sizeMax = parseInt(document.getElementById('inputSize').value) || 1000;
    
    const statusMessage = document.getElementById('statusMessage');
    const tableBody = document.getElementById('tableBody');
    const btnExport = document.getElementById('btnExport');

    // Réinitialisation
    leadsData = []; 
    btnExport.style.display = 'none';

    // Vérification basique du code postal
    if (!codePostal || codePostal.length !== 5) {
        statusMessage.innerHTML = "❌ Veuillez saisir un code postal valide à 5 chiffres.";
        return;
    }

    // Affichage du statut de chargement
    statusMessage.innerHTML = `⏳ Scan en cours (CP: ${codePostal} | >${surfaceMin}m² | Échantillon: ${sizeMax} DPE)...`;
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Chargement des données ADEME et Sirene...</td></tr>`;

    // Configuration ADEME
    const ademeUrl = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe01tertiaire/lines";
    const paramsAdeme = new URLSearchParams({ size: sizeMax, q: codePostal }); 
    const V_fin = 50; // Constante marché : 50 €/kW/an

    try {
        // Appel API ADEME
        const resAdeme = await fetch(`${ademeUrl}?${paramsAdeme.toString()}`);
        const dataAdeme = await resAdeme.json();
        
        // Filtre de surface dynamique
        const batiments = dataAdeme.results.filter(b => b.surface_utile >= surfaceMin);
        let resultatsHTML = "";

        if(batiments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Aucun bâtiment de plus de ${surfaceMin}m² trouvé.</td></tr>`;
            statusMessage.innerHTML = "✅ Recherche terminée.";
            return;
        }

        // Boucle d'analyse sur les bâtiments trouvés
        for (let i = 0; i < batiments.length; i++) {
            const bat = batiments[i];
            const surface = bat.surface_utile;
            const adresse = bat.adresse_brute || `${bat.numero_voie_ban || ''} ${bat.nom_rue_ban || ''}`.trim();
            const secteur = bat.secteur_activite || "Non renseigné";
            
            if (!adresse) continue;

            // Calculs de puissance et de gain
            const hypotheses = getHypothesesSecteur(secteur);
            const p_cvc = (surface * hypotheses.R_th) / 1000;
            const p_flex = p_cvc * hypotheses.T_eff;
            const gain = Math.round(p_flex * V_fin);

            // Appel API Sirene pour trouver l'entreprise
            const sireneUrl = "https://recherche-entreprises.api.gouv.fr/search";
            const paramsSirene = new URLSearchParams({ q: adresse, code_postal: codePostal, per_page: 1 });
            let nomEntreprise = "⚠️ Nom inconnu";

            try {
                const resSirene = await fetch(`${sireneUrl}?${paramsSirene.toString()}`);
                const dataSirene = await resSirene.json();
                if (dataSirene.results && dataSirene.results.length > 0) {
                    nomEntreprise = dataSirene.results[0].nom_complet;
                }
            } catch (e) {
                console.error("Erreur Sirene", e);
            }

            // Sauvegarde de la donnée brute pour le futur export CSV (nettoyage des points-virgules)
            leadsData.push({
                entreprise: nomEntreprise.replace(/;/g, ","),
                secteur: secteur.replace(/;/g, ","),
                adresse: adresse.replace(/;/g, ","),
                surface: surface,
                p_flex: p_flex.toFixed(1),
                gain: gain
            });

            // Construction de la ligne du tableau HTML
            resultatsHTML += `
                <tr>
                    <td><strong>${nomEntreprise}</strong></td>
                    <td>
                        ${secteur}
                        <span class="address-subtext">📍 ${adresse}</span>
                    </td>
                    <td>${surface} m²</td>
                    <td>⚡ ${p_flex.toFixed(1)} kW</td>
                    <td><span class="badge-gain">💰 ${gain.toLocaleString('fr-FR')} €/an</span></td>
                </tr>
            `;
        }
        
        // Injection du résultat final dans le DOM
        tableBody.innerHTML = resultatsHTML;
        statusMessage.innerHTML = `✅ ${leadsData.length} prospects qualifiés trouvés !`;
        
        // Affichage du bouton d'export s'il y a des résultats
        if (leadsData.length > 0) {
            btnExport.style.display = 'block';
        }

    } catch (error) {
        statusMessage.innerHTML = "❌ Une erreur est survenue lors de la communication avec les API de l'État.";
        console.error("Erreur globale :", error);
    }
}

// --- 3. FONCTION D'EXPORT CSV ---
function exporterCSV() {
    if (leadsData.length === 0) return;

    // Création des en-têtes (séparateur point-virgule)
    let csvContent = "Entreprise;Secteur;Adresse;Surface (m2);Puissance Flexible (kW);Gain Estime (EUR/an)\n";

    // Ajout des données ligne par ligne
    leadsData.forEach(row => {
        csvContent += `${row.entreprise};${row.secteur};${row.adresse};${row.surface};${row.p_flex};${row.gain}\n`;
    });

    // Création du fichier avec l'encodage BOM (\uFEFF) pour préserver les accents dans Excel français
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Déclenchement automatique du téléchargement
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `prospects_tertiaire.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 4. ÉCOUTEURS D'ÉVÉNEMENTS (Déclencheurs) ---
document.getElementById('btnSearch').addEventListener('click', lancerFlexScreener);

document.getElementById('btnExport').addEventListener('click', exporterCSV);

document.getElementById('inputCP').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') lancerFlexScreener();
});

// --- 5. GESTION DE LA FENÊTRE D'AIDE (README.md) ---
const modal = document.getElementById('readmeModal');
const btnHelp = document.getElementById('btnHelp');
const spanClose = document.querySelector('.close-btn');
const readmeBody = document.getElementById('readmeBody');

// Ouvrir la modale
btnHelp.addEventListener('click', async () => {
    modal.style.display = 'block';
    readmeBody.innerHTML = '⏳ Chargement des explications...';
    
    try {
        const response = await fetch('README.md');
        if (!response.ok) throw new Error("Fichier introuvable");
        const text = await response.text();
        
        // On utilise la librairie Marked pour convertir le Markdown en HTML
        readmeBody.innerHTML = marked.parse(text);
    } catch (error) {
        // Fallback de sécurité si le navigateur bloque la lecture locale (file:///)
        readmeBody.innerHTML = `
            <h2>⚠️ Mode Local Détecté</h2>
            <p>Par sécurité, votre navigateur bloque la lecture du fichier <code>README.md</code> en mode local sans serveur.</p>
            <p>Pour lire le fonctionnement, ouvrez simplement le fichier <strong>README.md</strong> avec un éditeur de texte, ou hébergez ce projet en ligne (ex: GitHub Pages).</p>
        `;
        console.error("Erreur de chargement du README:", error);
    }
});

// Fermer la modale au clic sur la croix
spanClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Fermer la modale au clic en dehors de la boîte
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});