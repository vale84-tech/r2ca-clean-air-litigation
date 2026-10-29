# Clean Air Litigation Database — istruzioni per Claude

Sito statico del database del contenzioso sulla qualità dell'aria del progetto R2CA “The Right to Clean Air” dell'Università di Torino (https://hubtolaw.it/projects/r2ca-the-right-to-clean-air/). Il sito è in inglese; i contenuti sono della redazione del progetto, che scrive gli abstract in italiano e li pubblica in traduzione inglese. Il sito è in fase di anteprima.

## Struttura del repository

- `site/` — la pagina e i suoi file:
  - `index.html`: testi della pagina (presentazione, About, Methodology, piè di pagina) e struttura dell'interfaccia;
  - `assets/style.css`, `assets/app.js`: stile e logica (mappa con d3 7.9.0 e topojson 3.0.2 da cdnjs, filtri, elenco, scheda di dettaglio, bandiere circle-flags da jsDelivr);
  - `data/countries-110m.json` (mappa world-atlas 110m) e `data/iso-a2.json` (codici ISO numerici → alpha-2, per le bandiere);
  - `admin/`: pannello redazionale Decap CMS (`index.html` + `config.yml`).
- `cases/` — un file JSON per caso. È l'unica cartella che i redattori modificano, dal pannello `/admin`.
- `scripts/build.py` — valida ogni caso, li unisce in `data/cases.json` e copia `site/` in `_site/`. Se un caso non è valido la build si ferma e online resta l'ultima versione pubblicata.
- `.github/workflows/deploy.yml` — a ogni push su `main` esegue la build e pubblica `_site/` su GitHub Pages; si può avviare anche a mano (`workflow_dispatch`).
- `docs/` — guida per i redattori (in italiano) e tabella dei codici paese.
- `_site/` è generata: non si modifica e non si committa (è in `.gitignore`).

Anteprima locale:

```bash
python3 scripts/build.py
python3 -m http.server 8766 -d _site
```

## Formato di un caso (`cases/<slug>.json`)

```json
{
 "slug": "commission-v-romania-c-638-18-pm10",
 "name": "Commission v Romania (C-638/18) (PM10)",
 "year": 2020,
 "date": "30 April 2020",
 "status": "Decided",
 "geography": { "country": "Romania", "iso_n3": "642" },
 "jurisdiction": { "type": "CJEU", "court": "Court of Justice of the European Union (CJEU) – Seventh Chamber" },
 "docket": "C-638/18",
 "description": "…",
 "outcome": "…",
 "topics": [],
 "sources": [ { "label": "eur-lex.europa.eu", "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62018CJ0638" } ]
}
```

Regole dei campi:

- `slug`: minuscolo, cifre e trattini; coincide con il nome del file. Non si cambia dopo la pubblicazione, perché è nell'indirizzo della scheda.
- `year`: anno della prima data riportata nella scheda; serve a ordinare l'elenco.
- `date`: date come vanno mostrate, nella forma “31 May 2021”; più date separate da punto e virgola.
- `status`: solo uno di questi valori: `Decided`, `Decided — appeal pending`, `Decided — merits pending`, `Decided — enforcement ongoing`, `Pending`, `Inadmissible`. Il filtro per stato del sito si basa sulle parole “pending” ed “enforcement”.
- `geography`: paese dei fatti. Per i ricorsi contro più Stati davanti a corti od organi internazionali, il primo Stato convenuto (regola dichiarata nella pagina Methodology). `iso_n3` è il codice ISO 3166-1 numerico a tre cifre che aggancia il caso alla mappa (tabella in `docs/codici-paesi.md`).
- `jurisdiction.type`: `Domestic`, `CJEU`, `ECtHR` oppure `UN`; `court` è testo libero.
- `docket`: facoltativo; numero di causa o di ricorso.
- `description` (di che cosa tratta il caso) e `outcome` (che cosa è stato deciso e stato del procedimento): obbligatori.
- `topics`: facoltativo, oggi vuoto.
- `sources`: elenco di `{label, url}`; `url` può mancare se la fonte non è online.

Se si cambia lo schema, vanno allineati insieme `scripts/build.py` (validazione), `site/assets/app.js` (resa) e `site/admin/config.yml` (campi del modulo).

## Regole sui contenuti

- I testi sono della redazione. Si traducono fedelmente dall'italiano, senza aggiunte, omissioni o correzioni nel merito. Una correzione di fatto si fa solo se la redazione la chiede, dopo averla verificata su una fonte primaria, e aggiungendo quella fonte tra le `sources`.
- Inglese britannico e registro accademico neutro. Virgolette curve “ ” (quelle interne ‘ ’). Forme societarie italiane in minuscolo con i punti (s.p.a., s.r.l.); quelle estere restano invariate.
- Nei nomi dei casi si usa “v” senza punto; i nomi delle parti restano in lingua originale; per i casi della Corte di giustizia UE e della Corte EDU si usa la forma inglese consolidata.
- Gli indirizzi web si riportano esattamente come sono, senza reindirizzamenti (per esempio di Google).

## Pannello redazionale (`site/admin/config.yml`)

Il backend è `git-gateway` con l'autenticazione PKCE di DecapBridge. Quattro righe dipendono dall'account: `repo` (proprietario/nome del repository), `auth_endpoint` e `auth_token_endpoint` (contengono l'identificativo del sito su DecapBridge) e `site_url`. Il file è sensibile all'indentazione: dopo ogni modifica va controllato che sia YAML valido.

## Pubblicazione e controlli

- Dopo ogni push, si segue l'esecuzione con `gh run watch` e si controlla il sito online (per esempio con `curl` su `data/cases.json`). GitHub Pages tiene le pagine in cache fino a circa 10 minuti.
- In anteprima `site/index.html` contiene `<meta name="robots" content="noindex">`: si toglie al lancio ufficiale sul dominio definitivo, insieme alla decisione sugli indirizzi definitivi delle schede.
- Per un dominio personalizzato: Settings → Pages → Custom domain e record CNAME presso chi gestisce il dominio; poi si aggiornano `site_url` in `config.yml` e il “CMS URL” del sito su DecapBridge.

## Sicurezza

- Non chiedere né scrivere token o password. Il token GitHub che usa DecapBridge si inserisce solo nel pannello di DecapBridge.
- Il repository è pubblico: non vanno committate note interne, valutazioni di lavoro o dati personali non destinati alla pubblicazione.
