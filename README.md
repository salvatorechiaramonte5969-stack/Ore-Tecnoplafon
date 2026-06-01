[LEGGIMI_PRIMA.txt](https://github.com/user-attachments/files/28450823/LEGGIMI_PRIMA.txt)
WorkHub Tecnoplafon - aggiornamento automatico Supabase

File nella cartella:
- index.html
- script.js
- style.css

Uso:
1. Lascia i tre file nella stessa cartella.
2. Apri index.html.
3. Accedi con email e password.
4. Dopo il login WorkHub prova ad aggiornare automaticamente cantieri e lavorazioni da Supabase.
5. Il pulsante manuale resta disponibile se vuoi forzare l'aggiornamento.

Nota:
I cantieri mostrati arrivano dalla tabella cantieri di Supabase. Se cancelli un cantiere da Supabase, dopo l'aggiornamento automatico non deve rientrare dal browser.


Aggiornamento: il bottone 'Scarica e stampa collaboratore' scarica il file HTML della raccolta e avvia la stampa senza mostrare la raccolta dentro l'app principale. Le regole di calcolo non sono state modificate.


Aggiornamento V91:
- Il bottone Stampa mese nel foglio mensile stampa subito la raccolta del collaboratore selezionato.
- Non sono state modificate regole ore, AVS, trasferte, vacanze, festivi o fasce zona.


Aggiornamento fusione analisi economica cantiere:
- aggiunta analisi economica collegata alle ore degli operai;
- ogni riga ore usa ID cantiere automatico e lavorazione/ID economico;
- aggiunto inserimento materiali per cantiere e tipologia;
- aggiunto preventivo totale e preventivo per singola voce;
- calcolo automatico ore, costo ore, materiali, margine, utile e percentuale;
- aggiunte tabelle Ore imputate, Materiali, Lavorazioni e ripartizione utile collaboratori.

Aggiornamento bottone analisi economica:
- Aggiunto bottone fisso "Analisi cantiere" nell'area admin.
- Il bottone apre una vista con solo l'analisi economica cantiere.
- Dentro la vista trovi "Chiudi vista solo" per tornare all'app completa.


Aggiornamento bottone pagina:
- Il bottone Analisi economica cantiere non e piu solo flottante.
- Ora compare direttamente nella pagina admin, sopra il gestionale.
- Cliccandolo entra subito nella vista con solo analisi cantiere.


Aggiornamento preventivo generale:
- Aggiunta scelta Preventivo generale / Preventivo per singola tipologia.
- Il preventivo generale resta solo nel totale cantiere e non viene distribuito sulle lavorazioni.

Aggiornamento regola orario amministratore:
- Il form Inserimento ore ora prende automaticamente Inizio, Fine e Pausa dalla regola orario salvata nel pannello Amministratore per la data scelta.
- Quando l'amministratore cambia la data, l'orario viene aggiornato secondo il calendario amministratore.
- Nell'area collaboratore, la data scelta usa la stessa regola orario per proporre ore e pausa.
- Se non esiste una regola per quel giorno, resta il comportamento precedente.

Aggiornamento limite giorno stesso e giorni bloccati:
- Limite massimo: 8.50 ore per collaboratore nello stesso giorno.
- Il collaboratore puo segnare solo il giorno corrente: non puo inserire ieri, domani o date future/passate.
- Il campo data nell'area collaboratore viene bloccato sul giorno di oggi.
- Non si possono salvare ore su sabato, domenica o giorni festivi ticinesi.

Aggiornamento fix verde e orario amministratore:
- Ripristinato il verde sui bottoni operai/collaboratori quando sono state segnate ore nel giorno controllato.
- Le regole orario dell'amministratore restano nel calendario/raccolta, ma non compilano piu automaticamente l'orario o le ore da segnare.
- Restano attivi: limite 8.50 ore, obbligo giorno stesso per collaboratore, blocco sabato/domenica/festivi.


Aggiornamento orario amministratore visibile in app:
- Le regole orario salvate dall'amministratore ora appaiono anche nell'app collaboratore come "Orario previsto amministratore".
- L'orario viene mostrato nella schermata iniziale e nella sezione Inserire ore.
- L'orario e solo informativo: non compila automaticamente le ore e non modifica il limite 8.50.
- Restano attivi il verde sui bottoni, il blocco giorno stesso e il blocco sabato/domenica/festivi.
