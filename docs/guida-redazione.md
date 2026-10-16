# Guida per la redazione — Clean Air Litigation Database

Guida operativa per chi inserisce e aggiorna i casi. Non serve alcuna competenza tecnica: si lavora da un pannello web con moduli a campi.

## Come si entra

1. Aprire `https://<indirizzo del sito>/admin/` nel browser.
2. Accedere con la propria email e password (l'invito arriva per email; il login con Google/Microsoft è disponibile se abilitato).
3. Nella colonna di sinistra c'è l'unica raccolta, **Cases**: l'elenco di tutte le schede.

## Aggiungere un caso

1. Cliccare **New Case**.
2. Compilare i campi (sotto, il significato di ciascuno).
3. Cliccare **Publish → Publish now**.

La pubblicazione è immediata: entro circa un minuto il sito si rigenera da solo con il nuovo caso. Non c'è una fase di bozza: ogni salvataggio pubblicato va online.

## Il significato dei campi

| Campo | Che cosa scrivere |
|---|---|
| URL slug | L'identificativo dell'indirizzo web della scheda, in minuscolo con trattini (es. `commission-v-italy-pm10-c-644-18`). Si sceglie una volta e **non si cambia più**: link e citazioni dipendono da questo. |
| Case name | Il nome del caso come deve apparire sul sito. |
| Year | L'anno della prima decisione o del primo passaggio processuale descritto nella scheda: serve a ordinare l'elenco. |
| Date(s) | La data o le date delle decisioni, come devono comparire sulla scheda (es. `10 November 2020`, oppure più date separate da punto e virgola). |
| Status | Si sceglie da un elenco: `Decided`, `Decided — appeal pending`, `Decided — merits pending`, `Decided — enforcement ongoing`, `Pending`, `Inadmissible`. Il filtro per stato del sito si basa su questa scelta. |
| Geography → Country | Il paese dei fatti, in inglese (es. `Italy`, `United Kingdom`). Per i ricorsi contro più Stati davanti a una corte o a un organo internazionale: il primo Stato convenuto. |
| Geography → Country code | Il codice numerico a 3 cifre che aggancia il caso alla mappa: **è l'unico campo delicato**. La tabella completa è in [`codici-paesi.md`](codici-paesi.md). I più frequenti: Italia 380, Francia 250, Germania 276, Regno Unito 826, Belgio 056, Spagna 724, Paesi Bassi 528, Polonia 616, Stati Uniti 840. |
| Forum → Type | Chi decide: corti nazionali (`Domestic courts`), Corte di giustizia UE, Corte EDU o organi ONU (`UN treaty bodies`). Per i casi internazionali il paese resta quello dei fatti: il caso compare sia sulla mappa sia nel pannello delle corti internazionali. |
| Forum → Court(s) | Descrizione libera dell'autorità o delle autorità (es. “Court of Justice of the European Union (Grand Chamber)”). |
| Docket number(s) | Facoltativo: numero/i di ruolo, di causa o di ricorso. |
| Description | Di che cosa tratta il caso: parti, domande, basi giuridiche. |
| Outcome | Che cosa è stato deciso e lo stato attuale del procedimento. |
| Topics | Facoltativo: parole chiave tematiche, una per riga (es. `PM10`, `Air quality plans`). |
| Sources | Le fonti del caso: citazione e, se disponibile, il link (EUR-Lex, HUDOC, siti delle corti, climatecasechart, articoli di commento…). |

## Correggere o eliminare un caso

Dall'elenco **Cases** si apre la scheda, si modifica e si ripubblica. **Delete entry** elimina la scheda (e il caso sparisce dal sito al rebuild). Non cambiare mai lo slug di una scheda già pubblicata: si romperebbero i link già citati.

## Se qualcosa va storto

- Il pannello segnala in rosso i campi non validi e non lascia pubblicare finché non sono corretti.
- Se una scheda pubblicata contenesse comunque un errore strutturale, il sito **non** si aggiorna e resta online l'ultima versione buona: nessun errore redazionale può «rompere» il sito. In quel caso segnalare l'ultima modifica fatta a chi gestisce il repository.
