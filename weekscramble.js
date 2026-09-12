// Numero di build, letto dal ?v= sul tag di questo script.
const APP_BUILD = (() => {
    const src = (document.currentScript && document.currentScript.src) || '';
    const m = src.match(/[?&]v=(\d+)/);
    return m ? m[1] : '?';
})();

// Vero solo dentro il guscio Android, mai in una scheda del browser.
function isCapacitorNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

document.addEventListener('DOMContentLoaded', () => {
    if (isCapacitorNative()) document.body.classList.add('capacitor');
    const tag = document.getElementById('build-tag');
    if (tag) tag.textContent = 'v' + APP_BUILD;
});

// Versione dell'app
const APP_VERSION = "1.4";

let activities = [];

// Funzione per cancellare i dati obsoleti
function clearOutdatedData() {
    const savedVersion = localStorage.getItem('appVersion');
    if (savedVersion !== APP_VERSION) {
        localStorage.clear();
        localStorage.setItem('appVersion', APP_VERSION);
    }
}

function saveState() {
    // Salviamo anche lo stato revealed/hidden di ogni attività
    const revealedState = Array.from(document.querySelectorAll('#weekTable input[type="text"]'))
        .map(input => input.getAttribute('data-revealed') === 'true');
    
    const hiddenState = Array.from(document.querySelectorAll('.cover'))
        .map(cover => cover.classList.contains('active'));
    
    const inputValues = Array.from(document.querySelectorAll('#weekTable input[type="text"]'))
        .map(input => input.value);
    
    localStorage.setItem('weeklyActivities', JSON.stringify(activities));
    localStorage.setItem('hiddenState', JSON.stringify(hiddenState));
    localStorage.setItem('revealedState', JSON.stringify(revealedState));
    localStorage.setItem('inputValues', JSON.stringify(inputValues));
    localStorage.setItem('appVersion', APP_VERSION);
}

function loadState() {
    console.log('8. Inizio loadState');
    clearOutdatedData();
    loadTheme();

    const savedActivities = localStorage.getItem('weeklyActivities');
    const savedHiddenState = localStorage.getItem('hiddenState');
    const savedRevealedState = localStorage.getItem('revealedState');
    const savedInputValues = localStorage.getItem('inputValues');
    
    console.log('9. Stato salvato recuperato:', {
        hasActivities: !!savedActivities,
        hasHiddenState: !!savedHiddenState,
        hasRevealedState: !!savedRevealedState,
        hasInputValues: !!savedInputValues
    });

    if (savedActivities) {
        activities = JSON.parse(savedActivities);
        updateActivityList();
    }

    // Impostiamo prima tutti gli input come nascosti
    const inputs = document.querySelectorAll('#weekTable input[type="text"]');
    inputs.forEach(input => {
        input.setAttribute('data-revealed', 'false');
    });

    // Carichiamo i valori degli input
    if (savedInputValues) {
        const inputValues = JSON.parse(savedInputValues);
        inputs.forEach((input, index) => {
            if (inputValues[index]) {
                input.value = inputValues[index];
            }
        });
    }

    // Carichiamo lo stato revealed
    if (savedRevealedState) {
        const revealedState = JSON.parse(savedRevealedState);
        inputs.forEach((input, index) => {
            input.setAttribute('data-revealed', revealedState[index] ? 'true' : 'false');
        });
    }

    // Carichiamo lo stato dei cover
    if (savedHiddenState) {
        const hiddenState = JSON.parse(savedHiddenState);
        const covers = document.querySelectorAll('.cover');
        console.log('10. Numero di rettangoli coprenti:', covers.length);
        covers.forEach((cover, index) => {
            if (hiddenState[index]) {
                cover.classList.add('active');
            } else {
                cover.classList.remove('active');
            }
        });
    }

    updateTableWeights();
    console.log('12. Fine loadState');
}

function getRandomTheme() {
    const themes = [
        'light', 'dark', 'ocean', 'forest', 'lavender', 
        'autumn', 'mono', 'pastel', 'retro', 'vintage',
        'gold', 'starry', 'christmas', 'dragonball', 
        'onepiece', 'pikachu', 'halloween', 'gameboy', 'rosa'
    ];
    const randomIndex = Math.floor(Math.random() * themes.length);
    return themes[randomIndex];
}

function setTheme(themeName) {
    // Rimuoviamo tutte le classi di tema precedenti
    document.body.classList.remove(
        'dark-theme', 
        'ocean-theme', 
        'forest-theme', 
        'lavender-theme', 
        'autumn-theme', 
        'mono-theme', 
        'pastel-theme', 
        'retro-theme',
        'vintage-theme',
        'gold-theme',
        'starry-theme',
        'christmas-theme',
        'dragonball-theme',
        'onepiece-theme',
        'pikachu-theme',
        'halloween-theme',
        'gameboy-theme',
        'rosa-theme'
    );
    
    // Salviamo la preferenza originale (per mantenere 'random' se selezionato)
    const originalTheme = themeName;
    
    // Se è il tema random, scegliamo un tema casuale
    if (themeName === 'random') {
        themeName = getRandomTheme();
    }
    
    // Aggiungiamo la classe del nuovo tema (se non è il tema chiaro)
    if (themeName !== 'light') {
        document.body.classList.add(`${themeName}-theme`);
    }
    
    // Salviamo la preferenza originale (salviamo 'random' se è stato selezionato random)
    localStorage.setItem('theme', originalTheme);
    
    // Aggiorniamo l'elemento attivo nel selettore
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        if (option.dataset.theme === originalTheme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

function scrambleActivities() {
    // Se il tema corrente è random, cambiamo il tema
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'random') {
        setTheme('random');
    }
    
    // Aggiorniamo i bonus PRIMA dello scramble
    updateBonus();
    
    // 1. Attiviamo subito tutti i rettangoli coprenti
    activateCovers();
    
    // 2. Ritardiamo l'assegnazione delle nuove attività e l'aggiornamento dello stato
    setTimeout(() => {
        // Creiamo il mazzo completo con tutte le carte
        let deck = [];
        activities.forEach(activity => {
            const totalWeight = activity.weight + (activity.important ? activity.bonus : 0);
            for (let i = 0; i < totalWeight; i++) {
                deck.push(activity.name);
            }
        });
        
        const inputs = document.querySelectorAll('#weekTable input[type="text"]');
        
        // Se il mazzo è completamente vuoto, assegniamo FREE DAY a tutti i giorni
        if (deck.length === 0) {
            inputs.forEach(input => {
                input.value = "FREE DAY";
                input.setAttribute('data-revealed', 'false'); // Assicuriamoci che sia nascosto
            });
            saveState(); // Salviamo lo stato dopo aver aggiornato input e cover
            return; // Usciamo dalla funzione
        }
        
        // Creiamo un array con i 7 giorni della settimana
        let weekActivities = new Array(7).fill(null);
        
        // Determiniamo quanti FREE DAY avremo bisogno
        const numFreeDays = Math.max(0, 7 - deck.length);
        
        // Generiamo le posizioni casuali per i FREE DAY
        let freeDayPositions = [];
        if (numFreeDays > 0) {
            const positions = Array.from({length: 7}, (_, i) => i);
            for (let i = 0; i < numFreeDays; i++) {
                const randomIndex = Math.floor(Math.random() * positions.length);
                freeDayPositions.push(positions[randomIndex]);
                positions.splice(randomIndex, 1);
            }
            freeDayPositions.forEach(position => {
                weekActivities[position] = "FREE DAY";
            });
        }
        
        // Riempiamo le posizioni rimanenti con le attività dal mazzo
        for (let i = 0; i < 7; i++) {
            if (weekActivities[i] === null) {
                const randomIndex = Math.floor(Math.random() * deck.length);
                weekActivities[i] = deck[randomIndex];
                deck.splice(randomIndex, 1);
            }
        }

        // Assegniamo le attività agli input e impostiamo data-revealed a false
        inputs.forEach((input, index) => {
            input.value = weekActivities[index];
            input.setAttribute('data-revealed', 'false'); // Nascondi la nuova attività
        });
        
        // Aggiorniamo i pesi e salviamo lo stato solo dopo aver assegnato i nuovi valori
        updateTableWeights();
        saveState();
        
    }, 200); // Ritardo aumentato a 200ms
}

function activateCovers() {
    const covers = document.querySelectorAll('.cover');
    covers.forEach(cover => {
        cover.classList.add('active');
    });
}

function revealActivity(cover) {
    const cell = cover.parentElement;
    const input = cell.querySelector('input[type="text"]');
    // Impostiamo esplicitamente data-revealed a true
    input.setAttribute('data-revealed', 'true');
    cover.classList.remove('active');
    saveState();
}

function hideAllActivities() {
    const inputs = document.querySelectorAll('#weekTable input[type="text"]');
    inputs.forEach(input => {
        // Impostiamo esplicitamente data-revealed a false
        input.setAttribute('data-revealed', 'false');
    });
}

function toggleListArea() {
    const listArea = document.getElementById('listArea');
    const container = document.querySelector('.container');
    
    // Alterniamo la visualizzazione tra tabella e lista
    if (listArea.classList.contains('hidden')) {
        // Mostriamo la lista e nascondiamo la tabella
        listArea.classList.remove('hidden');
        container.classList.add('hidden');
    } else {
        // Nascondiamo la lista e mostriamo la tabella
        listArea.classList.add('hidden');
        container.classList.remove('hidden');
    }
}

function updateActivityList() {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';
    
    // Calcoliamo le statistiche del mazzo
    const uniqueActivities = activities.length;
    const totalActivities = activities.reduce((sum, activity) => sum + activity.weight, 0);
    
    // Aggiorniamo o creiamo l'elemento per le statistiche
    let statsDiv = document.querySelector('.deck-stats');
    if (!statsDiv) {
        statsDiv = document.createElement('div');
        statsDiv.className = 'deck-stats';
        const header = document.querySelector('#listArea h2');
        header.insertAdjacentElement('afterend', statsDiv);
    }
    
    statsDiv.innerHTML = `
        <span>Attività singole: ${uniqueActivities}</span>
        <span>Attività totali: ${totalActivities}</span>
    `;
    
    const sortedActivities = [...activities].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    
    sortedActivities.forEach((activity) => {
        const li = document.createElement('li');
        const originalIndex = activities.findIndex(a => a.name === activity.name);
        
        // Creiamo il contenitore tabella
        const container = document.createElement('div');
        container.className = 'activity-item-container';
        
        // Cella stella
        const starCell = document.createElement('div');
        starCell.className = 'star-cell';
        const starButton = document.createElement('button');
        starButton.innerHTML = '⭐'; // Usiamo sempre la stella, l'opacità farà la differenza
        starButton.className = 'star-button' + (activity.important ? ' active' : '');
        starButton.onclick = () => toggleImportant(originalIndex);
        starCell.appendChild(starButton);
        
        // Cella peso
        const weightCell = document.createElement('div');
        weightCell.className = 'weight-cell';
        const weightControl = document.createElement('div');
        weightControl.className = 'weight-control';
        
        const decreaseButton = document.createElement('button');
        decreaseButton.textContent = '<';
        decreaseButton.className = 'weight-button';
        decreaseButton.onclick = () => updateWeight(originalIndex, -1);
        
        const weightDisplay = document.createElement('span');
        weightDisplay.className = 'weight-display';
        if (activity.important) {
            weightDisplay.innerHTML = activity.weight + '<span>+' + activity.bonus + '</span>';
        } else {
            weightDisplay.innerHTML = activity.weight + '<span class="invisible-bonus">+0</span>';
        }
        
        const increaseButton = document.createElement('button');
        increaseButton.textContent = '>';
        increaseButton.className = 'weight-button';
        increaseButton.onclick = () => updateWeight(originalIndex, 1);
        
        weightControl.appendChild(decreaseButton);
        weightControl.appendChild(weightDisplay);
        weightControl.appendChild(increaseButton);
        weightCell.appendChild(weightControl);
        
        // Cella testo
        const textCell = document.createElement('div');
        textCell.className = 'text-cell';
        const activityText = document.createElement('span');
        activityText.className = 'activity-text' + (activity.important ? ' important' : '');
        activityText.textContent = activity.name;
        textCell.appendChild(activityText);
        
        // Cella elimina
        const deleteCell = document.createElement('div');
        deleteCell.className = 'delete-cell';
        const deleteButton = createDeleteButton();
        deleteButton.onclick = () => deleteActivity(originalIndex);
        deleteCell.appendChild(deleteButton);
        
        // Assembliamo tutto
        container.appendChild(starCell);
        container.appendChild(weightCell);
        container.appendChild(textCell);
        container.appendChild(deleteCell);
        li.appendChild(container);
        activityList.appendChild(li);
    });
}

function createDeleteButton() {
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '&times;'; // Simbolo × (crocetta)
    deleteButton.className = 'delete-button';
    
    // Rimuovi eventuali stili inline
    deleteButton.style = ''; // Assicurati che non ci siano stili inline

    // Aggiungi la classe per applicare gli stili corretti
    deleteButton.classList.add('delete-button');

    // Aggiungi un event listener per gestire il click
    deleteButton.addEventListener('click', function() {
        const li = this.parentNode;
        const activityText = li.querySelector('.activity-text').textContent;
        const index = findActivityByName(activityText);
        if (index !== -1) {
            deleteActivity(index);
        }
    });
    
    return deleteButton;
}

function addActivity() {
    const newActivityInput = document.getElementById('newActivity');
    const activity = newActivityInput.value.trim();
    if (activity) {
        // Ora ogni attività è un oggetto con nome, peso e proprietà per l'importanza
        activities.push({
            name: activity,
            weight: 1,
            important: false,
            bonus: 0
        });
        newActivityInput.value = '';
        updateActivityList();
        saveState();
    }
}

function deleteActivity(index) {
    activities.splice(index, 1);
    updateActivityList();
    saveState();
}

function updateWeight(index, change) {
    // Limitiamo il peso a un massimo di 9
    const newWeight = Math.min(9, Math.max(0, activities[index].weight + change));
    activities[index].weight = newWeight;
    updateActivityList();
    updateTableWeights();
    saveState();
}

function toggleImportant(index) {
    const activity = activities[index];
    activity.important = !activity.important;
    if (activity.important) {
        activity.bonus = 0;
    }
    updateActivityList();
    updateTableWeights();
    saveState();
}

function updateBonus() {
    // Ottieni tutte le attività visibili nella tabella
    const visibleActivities = new Set();
    const inputs = document.querySelectorAll('#weekTable input[type="text"]');
    inputs.forEach(input => {
        // const cover = input.parentElement.querySelector('.cover'); // Rimuovere o commentare questa riga
        // Modificato per usare l'attributo data-revealed
        if (input.getAttribute('data-revealed') === 'true') {
            visibleActivities.add(input.value);
        }
    });

    // Aggiorna i bonus con un limite massimo di 9
    activities.forEach(activity => {
        if (activity.important) {
            if (visibleActivities.has(activity.name)) {
                activity.bonus = 0;
            } else {
                // Limitiamo il bonus a un massimo di 9
                activity.bonus = Math.min(9, activity.bonus + 1);
            }
        }
    });
    
    saveState(); // Salva lo stato aggiornato dei bonus
    // Aggiorniamo la UI per riflettere i nuovi bonus
    updateTableWeights(); 
    updateActivityList(); 
}

function findActivityByName(name) {
    return activities.findIndex(activity => activity.name === name);
}

function updateTableWeights() {
    const tableCells = document.querySelectorAll('#weekTable td:not(:first-child)');
    tableCells.forEach(cell => {
        const input = cell.querySelector('input');
        const value = input.value.trim();
        const weightControl = cell.querySelector('.table-weight-control');
        
        if (weightControl) {
            const weightDisplay = weightControl.querySelector('.weight-display');
            if (value && value !== "FREE DAY") {
                const activity = activities.find(a => a.name === value);
                
                if (activity) {
                    // Modifichiamo il testo visualizzato per mantenere l'allineamento
                    if (activity.important) {
                        weightDisplay.innerHTML = activity.weight + '<span>+' + activity.bonus + '</span>';
                    } else {
                        weightDisplay.innerHTML = activity.weight + '<span class="invisible-bonus">+0</span>';
                    }
                    input.className = activity.important ? 'important' : '';
                } else {
                    weightDisplay.innerHTML = '0<span class="invisible-bonus">+0</span>';
                    input.className = '';
                }
            } else {
                weightDisplay.innerHTML = '0<span class="invisible-bonus">+0</span>';
                input.className = '';
            }
        }
    });
}

function createTableWeightControl(input) {
    const controlDiv = document.createElement('div');
    controlDiv.className = 'table-weight-control';
    
    const decreaseButton = document.createElement('button');
    decreaseButton.textContent = '<';
    decreaseButton.className = 'weight-button';
    
    const weightDisplay = document.createElement('span');
    weightDisplay.className = 'weight-display';
    // Inizializziamo con il peso corretto
    const value = input.value.trim();
    // Modifichiamo questa condizione per verificare solo "FREE DAY" (non "Free")
    if (value && value !== "FREE DAY") {
        const activityIndex = findActivityByName(value);
        if (activityIndex !== -1) {
            weightDisplay.textContent = activities[activityIndex].weight;
        } else {
            weightDisplay.textContent = '0';
        }
    } else {
        weightDisplay.textContent = '0';
    }
    
    const increaseButton = document.createElement('button');
    increaseButton.textContent = '>';
    increaseButton.className = 'weight-button';
    
    controlDiv.appendChild(decreaseButton);
    controlDiv.appendChild(weightDisplay);
    controlDiv.appendChild(increaseButton);
    
    // Aggiungiamo gli event listener
    decreaseButton.onclick = () => {
        const activityIndex = findActivityByName(input.value);
        if (activityIndex !== -1) {
            updateWeight(activityIndex, -1);
        }
    };
    
    increaseButton.onclick = () => {
        const activityIndex = findActivityByName(input.value);
        if (activityIndex !== -1) {
            updateWeight(activityIndex, 1);
        }
    };
    
    return controlDiv;
}

// Save input values when they change
function setupInputListeners() {
    const inputs = document.querySelectorAll('#weekTable input[type="text"]');
    inputs.forEach(input => {
        input.addEventListener('change', saveState);
        input.addEventListener('blur', saveState);
    });
}

// Funzione per gestire la visualizzazione del selettore temi
function toggleThemeArea() {
    const themeArea = document.getElementById('themeArea');
    const container = document.querySelector('.container');
    const listArea = document.getElementById('listArea');
    
    // Alterniamo la visualizzazione tra tabella e selettore temi
    if (themeArea.classList.contains('hidden')) {
        // Mostriamo il selettore temi e nascondiamo tabella e lista
        themeArea.classList.remove('hidden');
        container.classList.add('hidden');
        listArea.classList.add('hidden');
    } else {
        // Nascondiamo il selettore temi e mostriamo la tabella
        themeArea.classList.add('hidden');
        container.classList.remove('hidden');
    }
}

// Funzione per caricare il tema salvato
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// Modifica della funzione per aggiornare lo stile dei pulsanti con azzurro per il tema light
function updateButtonStyles() {
    // Verifichiamo se siamo nel tema light
    const isLightTheme = !document.body.className || document.body.className === 'light-theme';
    
    // Colori per il tema light (azzurro)
    const lightThemeButtonBg = '#b3e5fc'; // Azzurro chiaro
    const lightThemeButtonHover = '#81d4fa'; // Azzurro più scuro
    const lightThemeTextColor = '#01579b'; // Blu scuro
    
    // Otteniamo i colori per gli altri temi
    const tableHeaderColor = getComputedStyle(document.documentElement).getPropertyValue('--table-header-bg').trim();
    const tableCellColor = getComputedStyle(document.documentElement).getPropertyValue('--table-cell-bg').trim();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
    
    // Aggiorniamo le variabili CSS per i pulsanti
    if (isLightTheme) {
        // Tema light: usiamo l'azzurro
        document.documentElement.style.setProperty('--button-bg', lightThemeButtonBg);
        document.documentElement.style.setProperty('--button-hover', lightThemeButtonHover);
        document.documentElement.style.setProperty('--button-text', lightThemeTextColor);
        document.documentElement.style.setProperty('--delete-button-bg', lightThemeButtonBg);
        document.documentElement.style.setProperty('--delete-button-hover', lightThemeButtonHover);
        document.documentElement.style.setProperty('--delete-button-text', lightThemeTextColor);
    } else {
        // Altri temi: usiamo i colori della tabella
        document.documentElement.style.setProperty('--button-bg', tableHeaderColor);
        document.documentElement.style.setProperty('--button-hover', tableCellColor);
    }
    
    // Aggiorniamo solo i pulsanti principali
    const mainButtons = document.querySelectorAll('#listButton, #scrambleButton, #themeButton, #addActivity');
    mainButtons.forEach(button => {
        if (isLightTheme) {
            // Tema light: usiamo l'azzurro
            button.style.backgroundColor = lightThemeButtonBg;
            button.style.color = lightThemeTextColor;
        } else {
            // Altri temi: usiamo i colori della tabella
            button.style.backgroundColor = tableHeaderColor;
            button.style.color = textColor;
        }
        button.style.border = '2px solid #000';
        button.style.fontWeight = 'bold';
        button.style.padding = '5px 10px';
        button.style.borderRadius = '5px';
    });
    
    // Aggiorniamo anche i pulsanti elimina in tutti i temi
    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach(button => {
        if (isLightTheme) {
            // Tema light: usiamo l'azzurro
            button.style.backgroundColor = lightThemeButtonBg;
            button.style.color = lightThemeTextColor;
        } else if (document.body.classList.contains('dark-theme')) {
            // Tema dark: usiamo lo stesso colore degli altri pulsanti
            button.style.backgroundColor = tableHeaderColor;
            button.style.color = textColor;
        }
        // Per gli altri temi, lasciamo che il CSS gestisca i colori
        button.style.border = '2px solid #000';
        button.style.fontWeight = 'bold';
        button.style.padding = '5px 10px';
        button.style.borderRadius = '5px';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('1. DOMContentLoaded iniziato');
    
    // Prima di loadState
    console.log('2. Prima di loadState');
    loadState();
    console.log('3. Dopo loadState');
    
    // Prima di setupInputListeners
    console.log('4. Prima di setupInputListeners');
    setupInputListeners();
    console.log('5. Dopo setupInputListeners');
    
    // Prima di updateTableWeights
    console.log('6. Prima di updateTableWeights');
    updateTableWeights();
    console.log('7. Dopo updateTableWeights');

    const scrambleButton = document.getElementById('scrambleButton');
    scrambleButton.addEventListener('click', scrambleActivities);

    const listButton = document.getElementById('listButton');
    listButton.addEventListener('click', toggleListArea);

    const addActivityButton = document.getElementById('addActivity');
    addActivityButton.addEventListener('click', addActivity);

    const covers = document.querySelectorAll('.cover');
    covers.forEach(cover => {
        cover.addEventListener('click', () => revealActivity(cover));
    });

    document.getElementById('newActivity').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addActivity();
        }
    });

    // Aggiungiamo i controlli del peso alle celle della tabella
    const tableCells = document.querySelectorAll('#weekTable td:not(:first-child)');
    tableCells.forEach(cell => {
        const input = cell.querySelector('input');
        const weightControl = createTableWeightControl(input);
        cell.appendChild(weightControl);
        
        // Aggiorniamo i controlli quando cambia il valore dell'input
        input.addEventListener('change', () => {
            const value = input.value.trim();
            if (value && value !== 'Free') {
                const activityIndex = findActivityByName(value);
                if (activityIndex !== -1) {
                    const weightDisplay = weightControl.querySelector('.weight-display');
                    weightDisplay.textContent = activities[activityIndex].weight;
                }
            }
        });
    });

    // Correggiamo il selettore per il pulsante di chiusura della lista attività
    const listCloseButton = document.querySelector('#listArea .close-button');
    listCloseButton.addEventListener('click', toggleListArea);

    // Aggiorniamo il listener per il pulsante della tavolozza
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', toggleThemeArea);
    
    // Selettore corretto per la crocetta del tema
    const themeCloseButton = document.querySelector('.theme-close');
    themeCloseButton.addEventListener('click', toggleThemeArea);
    
    // Aggiorniamo il listener per le opzioni tema
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            setTheme(this.dataset.theme);
            // Non chiudiamo più automaticamente il selettore
        });
    });

    // Funzione per aggiornare i pulsanti elimina
    function updateDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.delete-button');
        deleteButtons.forEach(button => {
            // Rimuovi tutti gli stili inline
            button.removeAttribute('style');
            
            // Aggiungi la classe per applicare gli stili corretti
            button.classList.add('delete-button');
        });
    }
    
    // Aggiorna i pulsanti all'avvio
    updateDeleteButtons();
    
    // Aggiorna i pulsanti ogni volta che viene aggiunta una nuova attività
    // Questo richiede di conoscere quando vengono aggiunte nuove attività
    // Puoi aggiungere un observer o modificare la funzione che aggiunge attività
    
    // Esempio con MutationObserver
    const observer = new MutationObserver(function(mutations) {
        updateDeleteButtons();
    });
    
    // Osserva le modifiche alla lista delle attività
    const activityList = document.getElementById('activityList');
    if (activityList) {
        observer.observe(activityList, { childList: true, subtree: true });
    }

    // Chiamiamo la funzione all'avvio
    updateButtonStyles();
    
    // Chiamiamo la funzione ogni volta che cambia il tema
    // Utilizziamo un nome di variabile diverso per evitare conflitti
    const allThemeSelectors = document.querySelectorAll('.theme-option, [data-theme]');
    allThemeSelectors.forEach(option => {
        option.addEventListener('click', function() {
            // Attendiamo che il tema sia cambiato
            setTimeout(updateButtonStyles, 100);
        });
    });

    // Soluzione definitiva per il colore del selettore temi in Halloween
    document.addEventListener('DOMContentLoaded', function() {
        // Funzione per applicare il colore arancione al selettore
        function forceOrangeThemeSelector() {
            if (document.body.classList.contains('halloween-theme')) {
                // Selezioniamo direttamente l'elemento
                const themeSelector = document.querySelector('.theme-selector');
                if (themeSelector) {
                    // Rimuovi tutti gli stili inline che potrebbero interferire
                    themeSelector.setAttribute('style', 'background-color: #ff6b00 !important; border: 2px solid #000000 !important');
                }
            }
        }

        // 1. Applichiamo al caricamento della pagina
        forceOrangeThemeSelector();
        
        // 2. Applichiamo quando si apre il selettore dei temi
        document.getElementById('themeToggle').addEventListener('click', function() {
            setTimeout(forceOrangeThemeSelector, 10);
        });
        
        // 3. Applichiamo quando cambia il tema
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', function() {
                // Se è stato selezionato il tema Halloween
                if (this.classList.contains('halloween-option')) {
                    setTimeout(forceOrangeThemeSelector, 10);
                }
            });
        });
        
        // 4. Applichiamo continuamente finché il selettore è visibile (ultima risorsa)
        setInterval(function() {
            const themeArea = document.getElementById('themeArea');
            if (!themeArea.classList.contains('hidden') && document.body.classList.contains('halloween-theme')) {
                forceOrangeThemeSelector();
            }
        }, 100);
    });

    // Soluzione per il colore del selettore temi nel tema Rosa
    document.addEventListener('DOMContentLoaded', function() {
        // Funzione per applicare il colore rosa chiaro al selettore
        function forceLightPinkThemeSelector() {
            if (document.body.classList.contains('rosa-theme')) {
                // Selezioniamo direttamente l'elemento
                const themeSelector = document.querySelector('.theme-selector');
                if (themeSelector) {
                    // Rimuovi tutti gli stili inline che potrebbero interferire
                    themeSelector.setAttribute('style', 'background-color: #ffcdd2 !important; border: 2px solid #f48fb1 !important');
                }
            }
        }

        // 1. Applichiamo al caricamento della pagina
        forceLightPinkThemeSelector();
        
        // 2. Applichiamo quando si apre il selettore dei temi
        document.getElementById('themeToggle').addEventListener('click', function() {
            setTimeout(forceLightPinkThemeSelector, 10);
        });
        
        // 3. Applichiamo quando cambia il tema
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', function() {
                // Se è stato selezionato il tema Rosa
                if (this.classList.contains('rosa-option')) {
                    setTimeout(forceLightPinkThemeSelector, 10);
                }
            });
        });
        
        // 4. Applichiamo continuamente finché il selettore è visibile
        setInterval(function() {
            const themeArea = document.getElementById('themeArea');
            if (!themeArea.classList.contains('hidden') && document.body.classList.contains('rosa-theme')) {
                forceLightPinkThemeSelector();
            }
        }, 100);
    });

    // Modifica la funzione updateRosaPinkButtons per includere anche il pulsante Aggiungi
    function updateRosaPinkButtons() {
        if (document.body.classList.contains('rosa-theme')) {
            // Seleziona i pulsanti principali
            const listButton = document.getElementById('listButton');
            const scrambleButton = document.getElementById('scrambleButton');
            const themeToggle = document.querySelector('.theme-toggle');
            const addActivityButton = document.getElementById('addActivity');
            
            // Stile comune da applicare
            const pinkStyle = {
                backgroundColor: '#ffcdd2',
                color: '#d81b60',
                border: '2px solid #f48fb1'
            };
            
            // Applica lo stile ai pulsanti
            [listButton, scrambleButton, themeToggle, addActivityButton].forEach(button => {
                if (button) {
                    Object.assign(button.style, pinkStyle);
                }
            });
            
            // Seleziona tutti gli elementi li nella lista attività
            document.querySelectorAll('.rosa-theme #activityList li').forEach(li => {
                li.style.backgroundColor = '#ffcdd2';
                li.style.border = '1px solid #f48fb1';
                li.style.color = '#d81b60';
            });
        }
    }

    // Assicurati di chiamare questa funzione insieme all'altra per il tema Rosa
    // Aggiungi questa chiamata nelle stesse posizioni in cui chiami forceLightPinkThemeSelector
    updateRosaPinkButtons();

    // Aggiungila anche ai listener di eventi esistenti
    document.getElementById('themeToggle').addEventListener('click', function() {
        setTimeout(function() {
            updateRosaPinkButtons();
        }, 10);
    });

    // E all'intervallo periodico
    setInterval(function() {
        const themeArea = document.getElementById('themeArea');
        if (document.body.classList.contains('rosa-theme')) {
            updateRosaPinkButtons();
        }
    }, 100);
});