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
    allineaVersione();
    pianificaAdatta();
});

// ⚠️ Una passata sola all'avvio non basta, e sul telefono si vedeva: la misura
// cadeva prima che il carattere del tema fosse arrivato e prima che la scala
// del testo di sistema fosse applicata, quindi tutto sembrava piu' stretto di
// quello che poi era, e la funzione concludeva che ci stava. Restava "Domenica"
// tagliata. La funzione riparte sempre dai corpi pieni, quindi rifarla non
// costa niente: si rifa' finche' la pagina non si e' assestata.
function pianificaAdatta() {
    [0, 250, 800, 2000].forEach(function (quando) {
        setTimeout(function () { requestAnimationFrame(adattaTesti); }, quando);
    });
}

// I caratteri dei temi arrivano dalla rete: finche' non ci sono, si misura il
// ripiego di sistema e la misura non vale. Si rifa' quando arrivano, e quando
// lo schermo cambia forma.
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(pianificaAdatta);
}
// ⚠️ `fonts.ready` da solo non basta: all'avvio e' gia' risolto, perche' i
// caratteri del tema non sono ancora stati chiesti. Se la rete e' lenta e il
// carattere arriva dopo l'ultima passata, restava la misura fatta col ripiego
// di sistema: sul telefono, nel tema ocean, si leggeva "VEEKSCRAMBLE".
if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', function () {
        clearTimeout(window.__timerCaratteri);
        window.__timerCaratteri = setTimeout(adattaTesti, 60);
    });
}
window.addEventListener('resize', function () {
    clearTimeout(window.__timerAdatta);
    window.__timerAdatta = setTimeout(adattaTesti, 150);
});

// Perche' il telefono restava indietro dopo una pubblicazione.
//
// GitHub Pages serve l'HTML con `Cache-Control: max-age=600` e non si possono
// mandare intestazioni proprie: per dieci minuti il guscio continua a mostrare
// la pagina di prima. Il `?v=N` sui fogli non basta, perche' a leggerlo e'
// l'HTML: se arriva dalla cache si porta dietro i riferimenti vecchi. E il
// `<meta http-equiv="Cache-Control">` non serve a niente, e' un equivoco:
// provato sul campo il 7 settembre 2026.
//
// L'unica via e' che sia la pagina a controllarsi. All'avvio legge un manifesto
// senza cache; se la revisione non e' quella con cui e' stata caricata, si
// ricarica UNA VOLTA SOLA con la revisione in coda — un indirizzo mai visto non
// puo' essere in cache. Freno in sessionStorage perche' non diventi un anello,
// e se la rete non c'e' si tiene quello che c'e', che e' la cosa giusta.
function allineaVersione() {
    if (APP_BUILD === '?') return;                 // server locale: niente da allineare
    try {
        if (sessionStorage.getItem('ws-riletta') === '1') return;
    } catch (e) {
        return;
    }
    fetch('versione.json?t=' + Date.now(), { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(m => {
            if (!m || !m.rev || String(m.rev) === String(APP_BUILD)) return;
            sessionStorage.setItem('ws-riletta', '1');
            location.replace(location.pathname + '?v=' + m.rev);
        })
        .catch(() => {});
}

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
    // L'elenco sta nella testa dell'HTML: serve anche allo script che mette il
    // tema prima che la pagina si disegni.
    const themes = window.TEMI;
    const randomIndex = Math.floor(Math.random() * themes.length);
    return themes[randomIndex];
}

// I giorni devono restare leggibili sempre; i nomi delle attivita' possono
// essere tagliati, sono loro a variare.
//
// Perche' non basta il foglio di stile: ogni tema ha il suo carattere, e fra
// "Mountains of Christmas" e "Press Start 2P" la stessa parola cambia larghezza
// del doppio. In piu' la scala del testo di Chrome su Android moltiplica il
// corpo calcolato qualunque unita' si sia scritta, `vw` compresi: un tetto
// fisso non puo' funzionare. Qui si misura il testo vero nel carattere vero e
// si decide di conseguenza: prima si allarga la colonna quanto serve, entro un
// limite; solo se non basta si stringe il corpo.
const GIORNI_SETTIMANA = ['Luned\u00ec', 'Marted\u00ec', 'Mercoled\u00ec',
    'Gioved\u00ec', 'Venerd\u00ec', 'Sabato', 'Domenica'];

// Corpi in rem: quello di partenza, e il piu' piccolo che si accetta.
const CORPO_TITOLO_BASE = 1.75;
const CORPO_TESTA_BASE = 1.6;
const CORPO_GIORNO_BASE = 1.45;
const CORPO_GIORNO_MIN = 0.95;
const CORPO_ATTIVITA_BASE = 1.35;
const CORPO_ATTIVITA_MIN = 0.95;   // il minimo comodo
const CORPO_ATTIVITA_ESTREMO = 0.7; // ci si arriva solo per non ridurre un nome a due lettere
const QUOTA_MIN = 0.24;            // della larghezza della tabella
const QUOTA_MAX = 0.44;

// ⚠️ Misurare con un canvas non va bene: il canvas disegna col corpo dichiarato
// nel foglio, mentre a schermo ci finisce anche la scala del testo di sistema.
// Qui si misura un pezzo di testo vero, messo nella cella, quindi soggetto a
// tutto cio' a cui e' soggetto il testo che si vede.
let metro = null;

function larghezzaTesto(testo, elemento) {
    // Dentro un <input> non si puo' appendere niente: il metro va nel genitore,
    // ma i caratteri li copia dall'input, che sono quelli che contano.
    const dentro = elemento.tagName === 'INPUT' ? elemento.parentNode : elemento;
    if (!metro) {
        metro = document.createElement('span');
        metro.setAttribute('aria-hidden', 'true');
        metro.style.cssText =
            'position:absolute;visibility:hidden;white-space:pre;' +
            'left:-9999px;top:0;padding:0;margin:0;border:0;';
    }
    if (metro.parentNode !== dentro) dentro.appendChild(metro);
    const s = getComputedStyle(elemento);
    metro.style.fontFamily = s.fontFamily;
    metro.style.fontSize = s.fontSize;
    metro.style.fontWeight = s.fontWeight;
    metro.style.fontStyle = s.fontStyle;
    metro.style.letterSpacing = s.letterSpacing;
    metro.style.textTransform = s.textTransform;
    metro.textContent = testo;
    return metro.getBoundingClientRect().width;
}

// Distribuisce la larghezza della riga fra il giorno e il nome dell'attivita'.
//
// Perche' non basta il foglio di stile: ogni tema ha il suo carattere, e fra
// "Mountains of Christmas" e "Press Start 2P" la stessa parola e' larga il
// doppio. Nemmeno un tetto in `vw` regge, perche' la scala del testo di sistema
// moltiplica il corpo calcolato qualunque unita' si sia scritta. L'unica cosa
// che vale su tutti i temi e su tutte le impostazioni e' misurare.
//
// L'ordine e' quello deciso: i giorni interi sempre, i nomi mai troppo piccoli,
// e se lo spazio non basta si stringe prima la colonna dei giorni.
// Un nome lungo nella tabella resta tagliato: la riga non e' elastica e il
// corpo non si stringe oltre un certo punto, che e' quello che si e' scelto.
// Toccandolo pero' si vede per intero, in un fumetto che si chiude da solo.
// Compare solo quando serve davvero, cioe' quando il testo e' piu' largo della
// casella: su un nome che gia' si legge sarebbe un disturbo e basta.
let fumetto = null;
let timerFumetto = null;

function mostraNomeIntero(casella) {
    if (!casella.value) return;
    if (casella.scrollWidth <= casella.clientWidth + 1) return;

    if (!fumetto) {
        fumetto = document.createElement('div');
        fumetto.className = 'fumetto-nome';
        document.body.appendChild(fumetto);
    }
    fumetto.textContent = casella.value;
    fumetto.classList.add('visibile');

    const r = casella.getBoundingClientRect();
    const largo = fumetto.getBoundingClientRect().width;
    let x = r.left + r.width / 2 - largo / 2;
    x = Math.max(6, Math.min(x, window.innerWidth - largo - 6));
    fumetto.style.left = x.toFixed(0) + 'px';

    // Sopra la casella, tranne per le prime righe, dove sopra non c'e' posto.
    const alto = fumetto.getBoundingClientRect().height;
    const sopra = r.top - alto - 8;
    fumetto.style.top = (sopra > 6 ? sopra : r.bottom + 8).toFixed(0) + 'px';

    clearTimeout(timerFumetto);
    timerFumetto = setTimeout(nascondiNome, 2600);
}

function nascondiNome() {
    if (fumetto) fumetto.classList.remove('visibile');
}

// Regola fissa: i pulsanti si vedono senza scorrere, in ogni tema. Con i
// caratteri alti (Pacifico nel tema ocean, Mountains of Christmas) sul
// telefono sette righe non stavano piu' in 832 px e i comandi finivano sotto
// il bordo. Si recupera prima dai margini interni delle celle, che sono aria;
// solo se non basta si stringono i caratteri, tutti nella stessa misura.
const STRINGI_PASSI = [0.75, 0.5, 0.25];
const CORPO_PASSI = [0.94, 0.88, 0.82, 0.76, 0.7];

// Di quanto il fondo dei pulsanti esce dalla pagina (zero o meno: ci sta).
function eccessoVerticale() {
    const pulsanti = document.querySelector('.button-container');
    if (!pulsanti || !pulsanti.getClientRects().length) return 0;
    const fondoPagina = document.body.getBoundingClientRect().bottom
        - parseFloat(getComputedStyle(document.body).paddingBottom);
    return pulsanti.getBoundingClientRect().bottom - fondoPagina;
}

function adattaAltezza() {
    const stile = document.body.style;
    stile.setProperty('--stringi', '1');
    if (eccessoVerticale() <= 0.5) return;
    for (const k of STRINGI_PASSI) {
        stile.setProperty('--stringi', String(k));
        if (eccessoVerticale() <= 0.5) return;
    }
    const corpi = ['--corpo-testa', '--corpo-giorno', '--corpo-attivita']
        .map(v => [v, parseFloat(stile.getPropertyValue(v))]);
    for (const f of CORPO_PASSI) {
        corpi.forEach(([v, rem]) => stile.setProperty(v, (rem * f).toFixed(3) + 'rem'));
        if (eccessoVerticale() <= 0.5) return;
    }
}

function adattaTesti() {
    // ⚠️ Mentre si misura la pagina non deve poter mostrare la barra di
    // scorrimento. Per misurare si rimettono i corpi pieni, la tabella per un
    // attimo sborda, e sul PC la barra compare e ruba una quindicina di px di
    // larghezza: il risultato cambiava a seconda di quanto stringeva il tema di
    // prima, e passando dal pannello la colonna dei giorni veniva larga diversa
    // che a un avvio a freddo (e il titolo, misurato stretto, si riallargava un
    // fotogramma dopo). E' tutto nello stesso giro di codice: a schermo la barra
    // tolta non si vede mai.
    const radice = document.documentElement;
    const corpo = document.body;
    const primaRadice = radice.style.overflowY;
    const primaCorpo = corpo.style.overflowY;
    radice.style.overflowY = 'hidden';
    corpo.style.overflowY = 'hidden';

    adattaTitolo();

    // Con la tabella nascosta (pannello dei temi o lista aperti) non c'e'
    // niente da misurare. Prima i corpi si azzeravano lo stesso, e chiudendo il
    // pannello restavano i corpi di base con la colonna del tema di prima:
    // adesso la rimisura chi la rimostra.
    const tabella = document.getElementById('weekTable');
    if (tabella && tabella.getClientRects().length) {
        adattaLarghezze(tabella);
        adattaAltezza();
    }

    radice.style.overflowY = primaRadice;
    corpo.style.overflowY = primaCorpo;
}

function adattaLarghezze(tabella) {
    const testa = document.querySelector('#weekTable th:first-child');
    const cella = document.querySelector('#weekTable td:first-child');
    const casella = document.querySelector('#weekTable td input[type="text"]');
    if (!testa || !cella || !casella) return;

    const stile = document.body.style;
    stile.setProperty('--corpo-testa', CORPO_TESTA_BASE + 'rem');
    stile.setProperty('--corpo-giorno', CORPO_GIORNO_BASE + 'rem');
    stile.setProperty('--corpo-attivita', CORPO_ATTIVITA_BASE + 'rem');

    const larga = tabella.getBoundingClientRect().width;
    if (!larga) return;

    const sg = getComputedStyle(cella);
    const contorniGiorno = parseFloat(sg.paddingLeft) + parseFloat(sg.paddingRight) + 6;

    const cellaAtt = casella.parentNode;
    const sa = getComputedStyle(cellaAtt);
    const si = getComputedStyle(casella);
    const controllo = cellaAtt.querySelector('.table-weight-control');
    // Il controllo del peso e' largo diverso da tema a tema: si misura e si
    // riserva esattamente quello, se no le frecce escono dalla cella.
    const largoControllo = controllo ? controllo.getBoundingClientRect().width : 70;
    const riserva = Math.ceil(largoControllo + parseFloat(si.marginRight || 0) + 4);
    stile.setProperty('--riserva-peso', riserva + 'px');

    const contorniAtt = parseFloat(sa.paddingLeft) + parseFloat(sa.paddingRight)
        + parseFloat(si.paddingLeft) + parseFloat(si.paddingRight) + 4 + riserva;

    const serveGiorno = Math.max.apply(null, GIORNI_SETTIMANA.map(function (g) {
        return larghezzaTesto(g, cella);
    }));

    const caselle = Array.prototype.slice.call(
        document.querySelectorAll('#weekTable td input[type="text"]'));
    const larghezze = [];
    caselle.forEach(function (c) {
        if (c.value) larghezze.push(larghezzaTesto(c.value, c));
    });

    const utile = larga - contorniGiorno - contorniAtt;
    if (utile <= 0) return;

    // Il bersaglio per i nomi non e' il piu' lungo della settimana: uno solo
    // lunghissimo farebbe rimpicciolire tutti gli altri per niente, visto che
    // tanto verrebbe tagliato lo stesso. Si prende quello al 60esimo
    // percentile, cosi' i nomi corti restano interi e si tagliano solo i lunghi.
    const ordinate = larghezze.slice().sort(function (a, b) { return a - b; });
    const bersaglio = ordinate.length
        ? ordinate[Math.min(ordinate.length - 1, Math.floor(ordinate.length * 0.6))]
        : serveGiorno;

    const minGiorno = CORPO_GIORNO_MIN / CORPO_GIORNO_BASE;
    const minNome = CORPO_ATTIVITA_MIN / CORPO_ATTIVITA_BASE;

    let fattoreGiorno = 1;
    let fattoreNome = 1;

    if (serveGiorno + bersaglio > utile) {
        // Si stringono tutti e due nella stessa misura: e' il riparto piu'
        // onesto. Se uno tocca il suo minimo, quello che avanza va all'altro.
        const k = utile / (serveGiorno + bersaglio);
        fattoreGiorno = Math.max(minGiorno, k);
        fattoreNome = Math.max(minNome, k);
        if (fattoreGiorno * serveGiorno + fattoreNome * bersaglio > utile) {
            // Non bastano nemmeno ai minimi: i giorni hanno la precedenza,
            // devono restare interi; i nomi si tagliano, per questo c'e' il
            // fumetto che li mostra per intero.
            fattoreGiorno = Math.max(minGiorno,
                Math.min(1, (utile - bersaglio * minNome) / serveGiorno));
            fattoreNome = minNome;
        }
    }

    // Con un carattere larghissimo (Press Start 2P del tema gameboy) al minimo
    // comodo restavano due lettere e i puntini. Meglio scendere sotto: un nome
    // piccolo ma intero si legge, "Su..." no.
    const spazioNome = utile - serveGiorno * fattoreGiorno;
    if (bersaglio * fattoreNome > spazioNome && spazioNome > 0) {
        fattoreNome = Math.max(CORPO_ATTIVITA_ESTREMO / CORPO_ATTIVITA_BASE,
                               spazioNome / bersaglio);
    }

    const spazioGiorno = serveGiorno * fattoreGiorno;
    const colonna = Math.min(larga * QUOTA_MAX,
                             Math.max(larga * QUOTA_MIN, spazioGiorno + contorniGiorno));
    testa.style.width = colonna.toFixed(0) + 'px';

    // Deciso quanto e' larga la colonna, il corpo del giorno si adatta a quella
    // (puo' anche crescere un po', se il carattere del tema e' stretto).
    const fattoreFinale = Math.min(1.18, (colonna - contorniGiorno) / serveGiorno);
    if (Math.abs(fattoreFinale - 1) > 0.01) {
        stile.setProperty('--corpo-giorno',
            (CORPO_GIORNO_BASE * fattoreFinale).toFixed(3) + 'rem');
    }
    if (fattoreNome < 0.99) {
        stile.setProperty('--corpo-attivita',
            (CORPO_ATTIVITA_BASE * fattoreNome).toFixed(3) + 'rem');
    }

    // Anche le due intestazioni devono starci: con un carattere largo
    // "ATTIVITA'" usciva dalla cella e si leggeva "ATTIVIT".
    const teste = document.querySelectorAll('#weekTable th');
    if (teste.length > 1) {
        const st = getComputedStyle(teste[0]);
        const bordiT = parseFloat(st.paddingLeft) + parseFloat(st.paddingRight) + 6;
        const serve1 = larghezzaTesto(teste[0].textContent.trim(), teste[0]);
        const serve2 = larghezzaTesto(teste[1].textContent.trim(), teste[1]);
        const fattoreT = Math.min(1,
            (colonna - bordiT) / serve1,
            (larga - colonna - bordiT) / serve2);
        if (fattoreT < 0.99) {
            stile.setProperty('--corpo-testa',
                (CORPO_TESTA_BASE * fattoreT).toFixed(3) + 'rem');
        }
    }
}

// Il titolo: con un carattere largo usciva dal riquadro. Sta fuori dalla
// tabella e resta in vista anche col pannello dei temi aperto: si misura sempre.
function adattaTitolo() {
    const stile = document.body.style;
    stile.setProperty('--corpo-titolo', CORPO_TITOLO_BASE + 'rem');
    const titolo = document.querySelector('.app-header h1');
    const riquadro = document.querySelector('.app-header');
    if (!titolo || !riquadro) return;
    const sr = getComputedStyle(riquadro);
    const spazio = riquadro.getBoundingClientRect().width
        - parseFloat(sr.paddingLeft) - parseFloat(sr.paddingRight) - 4;
    const serve = titolo.scrollWidth;
    if (serve > spazio && spazio > 0) {
        stile.setProperty('--corpo-titolo',
            (CORPO_TITOLO_BASE * (spazio / serve)).toFixed(3) + 'rem');
    }
}

// Il cambio di tema deve succedere tutto in un colpo. Prima arrivava a rate, e
// si vedeva: i colori della tabella subito, i pulsanti che sfumavano per 300 ms
// (hanno una transizione sul fondo), il carattere del tema quando arrivava
// dalla rete, e le misure dei testi rimandate a dei timer: per mezzo secondo
// restavano i corpi e le colonne del tema di prima, poi tutto si ridimensionava.
//
// Adesso setTheme() aspetta i caratteri del tema nuovo lasciando in vista il
// vecchio, e poi applicaTema() fa tutto nello stesso giro di codice: scambia la
// classe a transizioni spente, ridipinge, rimisura. Il browser dipinge una
// volta sola, a lavoro finito.

// Quali caratteri usa ciascun tema lo dice gia' il foglio di stile: si legge da
// li', cosi' un tema nuovo non va registrato anche qui.
let caratteriDeiTemi = null;

function caratteriDelTema(tema) {
    if (!caratteriDeiTemi) {
        caratteriDeiTemi = { base: new Set() };
        const leggi = (regole) => {
            for (const r of regole) {
                if (r.cssRules && !r.style) { leggi(r.cssRules); continue; }   // @media
                if (!r.style || !r.selectorText || !r.style.fontFamily) continue;
                const famiglia = r.style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
                if (/^(inherit|initial|unset|revert)$/.test(famiglia)) continue;
                const temi = r.selectorText.match(/\.[a-z0-9]+-theme\b/g);
                (temi ? temi.map(t => t.slice(1, -'-theme'.length)) : ['base']).forEach(t => {
                    (caratteriDeiTemi[t] = caratteriDeiTemi[t] || new Set()).add(famiglia);
                });
            }
        };
        // I fogli di Google Fonts sono di un'altra origine e non si lasciano
        // leggere: i loro caratteri li trova comunque document.fonts.
        for (const foglio of document.styleSheets) {
            try { leggi(foglio.cssRules); } catch (e) {}
        }
    }
    return [...new Set([...caratteriDeiTemi.base, ...(caratteriDeiTemi[tema] || [])])];
}

const temiPronti = new Set();
const TESTO_CAMPIONE = 'WeekScramble GIORNO ATTIVITÀ Lunedì 0123456789';

// Scarica i caratteri di un tema senza doverlo mostrare. Senza rete non
// arrivano mai: dopo un secondo e mezzo si va avanti lo stesso, col ripiego di
// sistema, e document.fonts.ready fara' rimisurare quando arrivano.
function caricaCaratteriTema(tema) {
    if (temiPronti.has(tema) || !document.fonts || !document.fonts.load) {
        return Promise.resolve();
    }
    const attese = [];
    caratteriDelTema(tema).forEach(famiglia => {
        ['400', '700'].forEach(peso => {
            attese.push(document.fonts
                .load(peso + ' 20px "' + famiglia + '"', TESTO_CAMPIONE)
                .catch(() => {}));
        });
    });
    const tutti = Promise.all(attese).then(() => { temiPronti.add(tema); });
    const tetto = new Promise(ok => setTimeout(ok, 1500));
    return Promise.race([tutti, tetto]);
}

// Mostrata la pagina, i caratteri degli altri temi si scaricano con calma, uno
// alla volta: cosi' uno scramble in modalita' random o un tocco nel pannello
// dei temi non devono aspettare la rete.
function scaldaCaratteri() {
    const coda = window.TEMI.filter(t => !temiPronti.has(t));
    (function prossimo() {
        const tema = coda.shift();
        if (tema) caricaCaratteriTema(tema).then(prossimo);
    })();
}

let temaMostrato = null;
let richiestaTema = 0;

function segnaTemaScelto(scelto) {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === scelto);
    });
}

function setTheme(themeName) {
    // 'random' resta la preferenza salvata; quello che si vede e' un tema vero.
    const vero = themeName === 'random' ? getRandomTheme() : themeName;
    const questa = ++richiestaTema;
    segnaTemaScelto(themeName);
    return caricaCaratteriTema(vero).then(() => {
        // Toccati due temi di fila vale l'ultimo, anche se il primo arriva dopo.
        if (questa === richiestaTema) applicaTema(themeName, vero);
    });
}

function applicaTema(scelto, vero) {
    const radice = document.documentElement;
    radice.classList.add('senza-transizioni');

    // 'light-theme' un tempo mancava dall'elenco delle classi da togliere, e
    // non veniva mai messa: le regole `.light-theme` del foglio non avevano
    // effetto. Adesso l'elenco e' uno solo, window.TEMI.
    window.TEMI.forEach(t => document.body.classList.remove(t + '-theme'));
    document.body.classList.add(vero + '-theme');
    temaMostrato = vero;

    // Uscendo dal rosa si tolgono i suoi stili in linea prima che
    // adattaTestoPulsanti() legga i colori; entrando si ridipinge anche dopo,
    // perche' adattaTestoPulsanti() toglie il colore in linea della scritta.
    updateRosaPinkButtons();
    // Il colore dei pulsanti lo decide il foglio di stile; qui si controlla
    // soltanto che la scritta sopra si legga.
    adattaTestoPulsanti();
    updateRosaPinkButtons();
    allineaTitoloAllaTabella();
    adattaTesti();

    // Lettura forzata: gli stili del tema nuovo si calcolano adesso, con le
    // transizioni ancora spente. Tolta la classe, non resta niente da sfumare.
    void document.body.offsetWidth;
    radice.classList.remove('senza-transizioni');

    localStorage.setItem('theme', scelto);
    segnaTemaScelto(scelto);
    // Qualche passata di misura in piu': sul telefono la scala del testo di
    // sistema puo' arrivare tardi. Danno lo stesso risultato, se non cambia niente.
    pianificaAdatta();
}

// Il tema rosa i pulsanti se li dipinge con stili in linea, e prima non li
// toglieva mai: passando a un altro tema restavano rosa fino al riavvio.
let rosaDipinto = false;

function updateRosaPinkButtons() {
    const pulsanti = [
        document.getElementById('listButton'),
        document.getElementById('scrambleButton'),
        document.querySelector('.theme-toggle'),
        document.getElementById('addActivity')
    ].filter(Boolean);
    const voci = Array.from(document.querySelectorAll('#activityList li'));

    if (document.body.classList.contains('rosa-theme')) {
        const pinkStyle = {
            backgroundColor: '#ffcdd2',
            color: '#d81b60',
            border: '2px solid #f48fb1'
        };
        pulsanti.forEach(button => Object.assign(button.style, pinkStyle));
        voci.forEach(li => {
            li.style.backgroundColor = '#ffcdd2';
            li.style.border = '1px solid #f48fb1';
            li.style.color = '#d81b60';
        });
        rosaDipinto = true;
    } else if (rosaDipinto) {
        pulsanti.concat(voci).forEach(el => {
            el.style.removeProperty('background-color');
            el.style.removeProperty('color');
            el.style.removeProperty('border');
        });
        rosaDipinto = false;
    }
}

function scrambleActivities() {
    // In modalita' random il tema nuovo si sceglie subito, e intanto se ne
    // scaricano i caratteri, ma si mostra solo insieme alle attivita' nuove.
    // Prima cambiava al tocco, e le misure della tabella lo seguivano a rate.
    const temaNuovo = localStorage.getItem('theme') === 'random' ? getRandomTheme() : null;
    const caratteri = temaNuovo ? caricaCaratteriTema(temaNuovo) : Promise.resolve();
    
    // Aggiorniamo i bonus PRIMA dello scramble
    updateBonus();
    
    // 1. Attiviamo subito tutti i rettangoli coprenti
    activateCovers();
    
    // 2. Le nuove attivita' arrivano dopo 200 ms, il tempo di coprire le
    //    vecchie, o piu' tardi se i caratteri del tema nuovo tardano.
    const attesa = new Promise(ok => setTimeout(ok, 200));
    Promise.all([caratteri, attesa]).then(() => {
        assegnaSettimana();
        // Tema, attivita' e misure nello stesso giro di codice: il browser
        // ridisegna una volta sola, a lavoro finito.
        if (temaNuovo) applicaTema('random', temaNuovo);
        else adattaTesti();
    });
}

function assegnaSettimana() {
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
        // Nascosta non si lasciava misurare: si misura adesso, prima che il
        // browser la ridisegni.
        adattaTesti();
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
        // Col pannello aperto il tema puo' essere cambiato, e la tabella
        // nascosta non si lasciava misurare: si misura adesso, prima del disegno.
        adattaTesti();
    }
}

// Funzione per caricare il tema salvato
function loadTheme() {
    const scelto = localStorage.getItem('theme') || 'light';
    // Il tema l'ha gia' messo lo script in cima al <body>, prima che la pagina
    // si disegnasse: qui si riprende la sua scelta invece di rifarla, se no in
    // modalita' random se ne pescherebbe un secondo, diverso dal primo.
    const avvio = window.TEMA_AVVIO;
    const vero = (avvio && avvio.scelto === scelto) ? avvio.vero
        : (scelto === 'random' ? getRandomTheme() : scelto);
    applicaTema(scelto, vero);
}

// Prima questa funzione i pulsanti se li dipingeva da sola, e li sbagliava:
// leggeva --table-header-bg da documentElement, dove nessun tema lo dichiara
// (i temi dichiarano su body), quindi prendeva sempre il pesca del tema chiaro
// e lo scriveva come --button-bg inline sul :root — una dichiarazione inline
// che batte tutto il foglio. Risultato: in quasi ogni tema i pulsanti restavano
// di un colore che non c'entrava niente col tema scelto.
//
// I temi il colore giusto ce l'hanno gia' (--button-bg e --button-text): adesso
// quello vale, e qui non si dipinge piu' niente. Resta solo un controllo di
// leggibilita': dove scritta e fondo finiscono troppo vicini, la scritta va a
// bianco o a nero, quello che stacca di piu'.
// Il riquadro del titolo e' fatto come una riga di intestazione della tabella,
// e qui prende da quella i colori veri, quelli calcolati. Le variabili non
// bastavano: parecchi temi l'intestazione la dipingono con regole proprie, e in
// onepiece, halloween e pikachu il colore del testo coincideva col fondo del
// titolo, che spariva.
function allineaTitoloAllaTabella() {
    const testa = document.querySelector('#weekTable th');
    const titolo = document.querySelector('.app-header');
    if (!testa || !titolo) return;
    const s = getComputedStyle(testa);
    titolo.style.backgroundColor = s.backgroundColor;
    titolo.style.color = s.color;
}

function adattaTestoPulsanti() {
    const pezzi = (c) => (c || '').match(/[\d.]+/g);

    const luminanza = (c) => {
        const m = pezzi(c);
        if (!m) return 255;
        return 0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2];
    };

    // Un fondo trasparente non e' il nero: il colore vero e' quello di chi sta
    // sotto. Senza questo, ogni pulsante senza fondo proprio riceverebbe la
    // scritta bianca.
    const fondoVero = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
            const c = getComputedStyle(n).backgroundColor;
            const m = pezzi(c);
            if (m && (m.length < 4 || +m[3] > 0.15)) return c;
            n = n.parentElement;
        }
        return getComputedStyle(document.body).backgroundColor;
    };

    const pulsanti = document.querySelectorAll(
        '#listButton, #scrambleButton, #addActivity, .theme-toggle, ' +
        '.delete-button, .weight-button'
    );
    pulsanti.forEach((b) => {
        b.style.removeProperty('color');
        const s = getComputedStyle(b);
        const fondo = luminanza(fondoVero(b));
        if (Math.abs(fondo - luminanza(s.color)) < 60) {
            b.style.color = fondo > 140 ? '#111111' : '#ffffff';
        }
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

    // Toccando un nome tagliato lo si vede per intero.
    document.querySelectorAll('#weekTable td input[type="text"]').forEach(casella => {
        casella.addEventListener('click', () => mostraNomeIntero(casella));
    });
    document.addEventListener('scroll', nascondiNome, true);

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
    // Il pannello dimensiona i cerchi sulle file che deve far stare in altezza
    // (vedi #themeSelector nel foglio): un tema nuovo non va contato a mano.
    document.getElementById('themeSelector')
        .style.setProperty('--file-temi', Math.ceil(themeOptions.length / 4));
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
    adattaTestoPulsanti();
    
    // Al cambio di tema la chiama gia' applicaTema(), nel momento giusto. Qui
    // c'era anche un setTimeout di 100 ms sui dischetti: nel tema rosa toglieva
    // il colore della scritta dei pulsanti un attimo dopo il tocco, e un altro
    // timer lo rimetteva, quindi la scritta lampeggiava.

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

    // updateRosaPinkButtons() adesso sta fuori, accanto ad applicaTema(), che
    // la chiama anche per togliere gli stili in linea uscendo dal rosa.

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

    // La pagina e' nata invisibile (vedi la testa dell'HTML). Si mostra quando i
    // caratteri del tema sono arrivati e le misure sono state rifatte con quelli:
    // prima si vedeva il ripiego di sistema, e poi tutto si ridimensionava.
    caricaCaratteriTema(temaMostrato).then(() => {
        adattaTesti();
        document.documentElement.classList.remove('ws-avvio');
        scaldaCaratteri();
    });
});