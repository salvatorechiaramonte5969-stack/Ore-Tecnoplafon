/* Estratto da script inline HTML: main */
const STORAGE_KEY = "ore_collaboratori_v1";
    const VOCI_KEY = "voci_menu_ore_collaboratori_v1";
    const ADMIN_KEY = "dati_amministratore_ore_collaboratori_v1";

    let ore = caricaOre();
    let vociMenu = caricaVociMenu();
    let datiAmministratore = caricaDatiAmministratore();
    let editId = null;
    let vistaCantieri = "attivi";
    let vistaOperai = "attivi";

    document.addEventListener("DOMContentLoaded", () => {
      const oggi = new Date();
      const oggiIso = formattaDataLocale(oggi);
      document.getElementById("data").value = oggiIso;
      const controlloGiorno = document.getElementById("controlloGiorno");
      if (controlloGiorno) controlloGiorno.value = oggiIso;
      const primoGiorno = formattaDataLocale(new Date(oggi.getFullYear(), oggi.getMonth(), 1));
      const ultimoGiorno = formattaDataLocale(new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0));
      document.getElementById("filtroDal").value = primoGiorno;
      document.getElementById("filtroAl").value = ultimoGiorno;
      aggiornaAnteprimaOre();
      normalizzaVociMenu();
      aggiornaVociDaStorico();
      renderTabellaAmministratore();
      renderRegoleOrariAmministratore();
      aggiornaFestiviTicinoDaFiltro(false);
      applicaDatiAmministratoreAlMese(false);
      renderizza();
      eseguiTestBase();
      document.addEventListener("click", function(event) {
        const target = event.target;
        const dentroRicerca = target.closest && target.closest("#cantiere, #lavoro, #suggerimentiCantiere, #suggerimentiLavoro");
        if (!dentroRicerca) nascondiSuggerimentiRicerca();
        const dentroRicercaQuick = target.closest && target.closest("#collabQuickCantiere, #collabQuickLavoro, #collabQuickSuggerimentiCantiere, #collabQuickSuggerimentiLavoro");
        if (!dentroRicercaQuick && typeof collabQuickNascondiSuggerimenti === "function") collabQuickNascondiSuggerimenti();
        const dentroRicercaDettaglio = target.closest && target.closest("#cercaCantiereDettaglio, #cercaCollaboratoreCantiere, #cercaLavorazioneCantiere, #suggerimentiCantiereDettaglio, #suggerimentiCollaboratoreCantiere, #suggerimentiLavorazioneCantiere");
        if (!dentroRicercaDettaglio && typeof nascondiSuggerimentiCantiereDettaglio === "function") nascondiSuggerimentiCantiereDettaglio();
      });
    });

    function caricaOre() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      } catch (errore) {
        console.warn("Storico ore non leggibile, riparto da lista vuota.", errore);
        return [];
      }
    }

    function salvaStorage() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ore));
    }

    function caricaDatiAmministratore() {
      try {
        const salvati = JSON.parse(localStorage.getItem(ADMIN_KEY));
        if (salvati && typeof salvati === "object") {
          if (!Array.isArray(salvati.regoleOrari)) salvati.regoleOrari = [];
          return salvati;
        }
      } catch (errore) {
        console.warn("Dati amministratore non leggibili, riparto da lista vuota.", errore);
      }
      const mesi = {};
      for (let mese = 1; mese <= 12; mese += 1) {
        mesi[String(mese).padStart(2, "0")] = { oreDaFare: "", festivi: "", vacanze: "", vacanzeDettaglio: "" };
      }
      return { mesi, regoleOrari: [] };
    }

    function salvaDatiAmministratoreStorage() {
      localStorage.setItem(ADMIN_KEY, JSON.stringify(datiAmministratore));
    }
    function normalizzaRegoleOrariAmministratore() {
      if (!datiAmministratore || typeof datiAmministratore !== "object") datiAmministratore = { mesi: {}, regoleOrari: [] };
      if (!Array.isArray(datiAmministratore.regoleOrari)) datiAmministratore.regoleOrari = [];
      datiAmministratore.regoleOrari = datiAmministratore.regoleOrari
        .map(regola => ({
          id: regola.id || creaId(),
          dal: String(regola.dal || ""),
          al: String(regola.al || ""),
          inizio: String(regola.inizio || "07:00"),
          fine: String(regola.fine || "16:00"),
          pausa: String(regola.pausa ?? "1"),
          nota: testoPulito(regola.nota || "")
        }))
        .filter(regola => /^\d{4}-\d{2}-\d{2}$/.test(regola.dal) && /^\d{4}-\d{2}-\d{2}$/.test(regola.al))
        .sort((a, b) => a.dal.localeCompare(b.dal) || a.al.localeCompare(b.al));
    }

    function renderRegoleOrariAmministratore() {
      normalizzaRegoleOrariAmministratore();
      const corpo = document.getElementById("tabellaRegoleOrariAmministratore");
      if (!corpo) return;
      if (!datiAmministratore.regoleOrari.length) {
        corpo.innerHTML = '<tr><td colspan="6" class="note">Nessuna regola orario salvata. Aggiungi un periodo per mostrare gli orari sopra la riga dei giorni nella raccolta collaboratore.</td></tr>';
        return;
      }
      corpo.innerHTML = datiAmministratore.regoleOrari.map(regola => `
        <tr>
          <td>${fmtData(regola.dal)}</td>
          <td>${fmtData(regola.al)}</td>
          <td><strong>${escapeHtml(regola.inizio)}</strong></td>
          <td><strong>${escapeHtml(regola.fine)}</strong></td>
          <td>${escapeHtml(formattaPausaBreve(regola.pausa))}</td>
          <td>
            ${regola.nota ? `<span>${escapeHtml(regola.nota)}</span><br>` : ""}
            <button type="button" class="secondary small" onclick="eliminaRegolaOrarioAmministratore('${escapeAttribute(regola.id)}')">Elimina</button>
          </td>
        </tr>
      `).join("");
    }

    function aggiungiRegolaOrarioAmministratore() {
      const dal = document.getElementById("regolaOrarioDal")?.value || "";
      const al = document.getElementById("regolaOrarioAl")?.value || "";
      const inizio = document.getElementById("regolaOrarioInizio")?.value || "";
      const fine = document.getElementById("regolaOrarioFine")?.value || "";
      const pausa = document.getElementById("regolaOrarioPausa")?.value || "0";
      const nota = document.getElementById("regolaOrarioNota")?.value || "";
      if (!dal || !al || !inizio || !fine) {
        alert("Inserisci periodo, ora inizio e ora fine della regola.");
        return;
      }
      if (al < dal) {
        alert("La data fine non può essere prima della data inizio.");
        return;
      }
      normalizzaRegoleOrariAmministratore();
      datiAmministratore.regoleOrari.push({ id: creaId(), dal, al, inizio, fine, pausa, nota: testoPulito(nota) });
      salvaDatiAmministratoreStorage();
      renderRegoleOrariAmministratore();
      ["regolaOrarioDal", "regolaOrarioAl", "regolaOrarioNota"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const pausaInput = document.getElementById("regolaOrarioPausa");
      if (pausaInput) pausaInput.value = "1";
    }

    function eliminaRegolaOrarioAmministratore(id) {
      if (!confirm("Eliminare questa regola orario?")) return;
      normalizzaRegoleOrariAmministratore();
      datiAmministratore.regoleOrari = datiAmministratore.regoleOrari.filter(regola => regola.id !== id);
      salvaDatiAmministratoreStorage();
      renderRegoleOrariAmministratore();
    }

    function regolaOrarioPerGiorno(dataIso) {
      normalizzaRegoleOrariAmministratore();
      return datiAmministratore.regoleOrari
        .filter(regola => regola.dal <= dataIso && dataIso <= regola.al)
        .sort((a, b) => b.dal.localeCompare(a.dal) || b.al.localeCompare(a.al))[0] || null;
    }

    function testoRegolaOrarioCalendario(dataIso, giorniFestiviCalendario, giorniVacanzaCalendario) {
      const d = new Date(dataIso + "T00:00:00");
      const giornoSettimana = d.getDay();
      const regola = regolaOrarioPerGiorno(dataIso);
      if (!regola) return "";

      // L'orario va mostrato sopra il calendario solo sui giorni lavorativi.
      // Domeniche, sabati, festivi ticinesi e vacanze restano vuoti anche se ricadono nel periodo della regola.
      if (giornoSettimana === 0 || giornoSettimana === 6) return "";
      if (giorniFestiviCalendario && giorniFestiviCalendario.has(dataIso)) return "";
      if (giorniVacanzaCalendario && giorniVacanzaCalendario.has(dataIso)) return "";

      return `${regola.inizio}-${regola.fine}`;
    }

    function regoleOrariNelPeriodo(dal, al) {
      normalizzaRegoleOrariAmministratore();
      return datiAmministratore.regoleOrari
        .filter(regola => (!al || regola.dal <= al) && (!dal || regola.al >= dal))
        .sort((a, b) => a.dal.localeCompare(b.dal) || a.al.localeCompare(b.al));
    }

    function testoRegoleOrariNelPeriodo(dal, al) {
      const regole = regoleOrariNelPeriodo(dal, al);
      if (!regole.length) {
        return 'Nessuna regola orario salvata per questo periodo nel pannello Amministratore.';
      }
      return regole.map(regola => {
        const periodo = `${fmtData(regola.dal)} - ${fmtData(regola.al)}`;
        const pausa = formattaPausaBreve(regola.pausa);
        const nota = regola.nota ? ` (${regola.nota})` : '';
        return `${periodo}: ${regola.inizio} - pausa ${pausa} - ${regola.fine}${nota}`;
      }).join(' | ');
    }


    function nomiMesiItaliani() {
      return [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
      ];
    }

    function renderTabellaAmministratore() {
      const corpo = document.getElementById("tabellaAmministratoreMesi");
      if (!corpo) return;
      if (!datiAmministratore.mesi || typeof datiAmministratore.mesi !== "object") datiAmministratore.mesi = {};
      const mesi = nomiMesiItaliani();
      corpo.innerHTML = mesi.map((nome, indice) => {
        const chiave = String(indice + 1).padStart(2, "0");
        const dati = datiAmministratore.mesi[chiave] || { oreDaFare: "", festivi: "", vacanze: "", vacanzeDettaglio: "" };
        return `
          <tr>
            <td><strong>${nome}</strong></td>
            <td><input id="adminOre_${chiave}" type="number" min="0" step="0.25" value="${escapeAttribute(dati.oreDaFare ?? "")}" /></td>
            <td><input id="adminFestivi_${chiave}" type="number" min="0" step="0.5" value="${escapeAttribute(dati.festivi ?? "")}" title="${escapeAttribute((dati.festiviDettaglio || []).join(', '))}" /></td>
            <td><input id="adminVacanze_${chiave}" type="number" min="0" step="0.5" value="${escapeAttribute(dati.vacanze ?? "")}" /></td>
            <td><input id="adminVacanzeDettaglio_${chiave}" type="text" placeholder="Es. 12, 13, 14" value="${escapeAttribute(dati.vacanzeDettaglio ?? "")}" /></td>
          </tr>
        `;
      }).join("");
    }

    function annoDaFiltroFoglioMensile() {
      const dal = document.getElementById("filtroDal")?.value || "";
      if (dal && /^\d{4}-\d{2}-\d{2}$/.test(dal)) return Number(dal.slice(0, 4));
      const data = document.getElementById("data")?.value || formattaDataLocale(new Date());
      return Number(String(data).slice(0, 4)) || new Date().getFullYear();
    }

    function dataISO(year, monthIndexZero, day) {
      const mese = String(monthIndexZero + 1).padStart(2, "0");
      const giorno = String(day).padStart(2, "0");
      return `${year}-${mese}-${giorno}`;
    }

    function aggiungiGiorniISO(dataIso, giorniDaAggiungere) {
      const [anno, mese, giorno] = dataIso.split("-").map(Number);
      const data = new Date(anno, mese - 1, giorno);
      data.setDate(data.getDate() + giorniDaAggiungere);
      return dataISO(data.getFullYear(), data.getMonth(), data.getDate());
    }

    function pasquaISO(anno) {
      const a = anno % 19;
      const b = Math.floor(anno / 100);
      const c = anno % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const mese = Math.floor((h + l - 7 * m + 114) / 31);
      const giorno = ((h + l - 7 * m + 114) % 31) + 1;
      return dataISO(anno, mese - 1, giorno);
    }

    function festiviTicinoPerAnno(anno) {
      const pasqua = pasquaISO(anno);
      return [
        { data: dataISO(anno, 0, 1), nome: "Capodanno" },
        { data: dataISO(anno, 0, 6), nome: "Epifania" },
        { data: dataISO(anno, 2, 19), nome: "San Giuseppe" },
        { data: aggiungiGiorniISO(pasqua, 1), nome: "Lunedì di Pasqua" },
        { data: dataISO(anno, 4, 1), nome: "Festa del lavoro" },
        { data: aggiungiGiorniISO(pasqua, 39), nome: "Ascensione" },
        { data: aggiungiGiorniISO(pasqua, 50), nome: "Lunedì di Pentecoste" },
        { data: aggiungiGiorniISO(pasqua, 60), nome: "Corpus Domini" },
        { data: dataISO(anno, 5, 29), nome: "San Pietro e Paolo" },
        { data: dataISO(anno, 7, 1), nome: "Festa Nazionale Svizzera" },
        { data: dataISO(anno, 7, 15), nome: "Assunzione" },
        { data: dataISO(anno, 10, 1), nome: "Ognissanti" },
        { data: dataISO(anno, 11, 8), nome: "Immacolata" },
        { data: dataISO(anno, 11, 25), nome: "Natale" },
        { data: dataISO(anno, 11, 26), nome: "Santo Stefano" }
      ].sort((a, b) => a.data.localeCompare(b.data));
    }

    function aggiornaFestiviTicinoDaFiltro(mostraMessaggio = false) {
      const anno = annoDaFiltroFoglioMensile();
      if (!datiAmministratore.mesi || typeof datiAmministratore.mesi !== "object") datiAmministratore.mesi = {};
      const perMese = {};
      for (let mese = 1; mese <= 12; mese += 1) {
        perMese[String(mese).padStart(2, "0")] = [];
      }

      festiviTicinoPerAnno(anno).forEach(festivo => {
        const mese = festivo.data.slice(5, 7);
        perMese[mese].push(`${festivo.data.slice(8, 10)}.${festivo.data.slice(5, 7)} ${festivo.nome}`);
      });

      for (let mese = 1; mese <= 12; mese += 1) {
        const chiave = String(mese).padStart(2, "0");
        const precedente = datiAmministratore.mesi[chiave] || { oreDaFare: "", festivi: "", vacanze: "" };
        datiAmministratore.mesi[chiave] = {
          ...precedente,
          festivi: String(perMese[chiave].length),
          festiviDettaglio: perMese[chiave],
          annoFestivi: anno
        };
      }

      salvaDatiAmministratoreStorage();
      renderTabellaAmministratore();
      if (mostraMessaggio) alert(`Festivi ticinesi ${anno} aggiornati automaticamente.`);
    }

    function salvaDatiAmministratore(mostraMessaggio = true) {
      if (!datiAmministratore.mesi || typeof datiAmministratore.mesi !== "object") datiAmministratore.mesi = {};
      for (let mese = 1; mese <= 12; mese += 1) {
        const chiave = String(mese).padStart(2, "0");
        const precedente = datiAmministratore.mesi[chiave] || {};
        datiAmministratore.mesi[chiave] = {
          ...precedente,
          oreDaFare: document.getElementById(`adminOre_${chiave}`)?.value || "",
          festivi: document.getElementById(`adminFestivi_${chiave}`)?.value || "",
          vacanze: document.getElementById(`adminVacanze_${chiave}`)?.value || "",
          vacanzeDettaglio: document.getElementById(`adminVacanzeDettaglio_${chiave}`)?.value || ""
        };
      }
      salvaDatiAmministratoreStorage();
      renderRegoleOrariAmministratore();
      applicaDatiAmministratoreAlMese(false);
      if (mostraMessaggio) alert("Dati amministratore salvati.");
    }

    function meseDaFiltroFoglioMensile() {
      const dal = document.getElementById("filtroDal")?.value || "";
      if (dal && /^\d{4}-\d{2}-\d{2}$/.test(dal)) return dal.slice(5, 7);
      const data = document.getElementById("data")?.value || formattaDataLocale(new Date());
      return String(data).slice(5, 7);
    }

    function applicaDatiAmministratoreAlMese(mostraMessaggio = true) {
      const chiave = meseDaFiltroFoglioMensile();
      const dati = datiAmministratore.mesi && datiAmministratore.mesi[chiave] ? datiAmministratore.mesi[chiave] : null;
      if (!dati) return;
      const oreDaLavorare = document.getElementById("oreDaLavorareMese");
      const giorniFestivi = document.getElementById("giorniFestivi");
      const giorniVacanza = document.getElementById("giorniVacanza");
      if (oreDaLavorare && dati.oreDaFare !== undefined) oreDaLavorare.value = dati.oreDaFare;
      if (giorniFestivi && dati.festivi !== undefined) giorniFestivi.value = dati.festivi;
      if (giorniVacanza && dati.vacanze !== undefined) giorniVacanza.value = dati.vacanze;
      if (mostraMessaggio) alert("Dati applicati al mese selezionato.");
    }

    function caricaVociMenu() {
      try {
        const salvate = JSON.parse(localStorage.getItem(VOCI_KEY));
        if (salvate && typeof salvate === "object") {
          return {
            collaboratori: Array.isArray(salvate.collaboratori) ? salvate.collaboratori : [],
            operaiDettagli: salvate.operaiDettagli && typeof salvate.operaiDettagli === "object" ? salvate.operaiDettagli : {},
            collaboratoreStato: salvate.collaboratoreStato && typeof salvate.collaboratoreStato === "object" ? salvate.collaboratoreStato : {},
            cantieri: Array.isArray(salvate.cantieri) ? salvate.cantieri : [],
            cantieriKm: salvate.cantieriKm && typeof salvate.cantieriKm === "object" ? salvate.cantieriKm : {},
            cantiereZone: salvate.cantiereZone && typeof salvate.cantiereZone === "object" ? salvate.cantiereZone : {},
            cantiereStato: salvate.cantiereStato && typeof salvate.cantiereStato === "object" ? salvate.cantiereStato : {},
            lavori: Array.isArray(salvate.lavori) ? salvate.lavori : []
          };
        }
      } catch (errore) {
        console.warn("Voci menu non leggibili, provo a recuperare versioni precedenti.", errore);
      }

      try {
        const vecchieListe = JSON.parse(localStorage.getItem("liste_ore_collaboratori_v1"));
        if (vecchieListe && typeof vecchieListe === "object") {
          return {
            collaboratori: Array.isArray(vecchieListe.collaboratori) ? vecchieListe.collaboratori : [],
            operaiDettagli: vecchieListe.operaiDettagli && typeof vecchieListe.operaiDettagli === "object" ? vecchieListe.operaiDettagli : {},
            collaboratoreStato: vecchieListe.collaboratoreStato && typeof vecchieListe.collaboratoreStato === "object" ? vecchieListe.collaboratoreStato : {},
            cantieri: Array.isArray(vecchieListe.cantieri) ? vecchieListe.cantieri : [],
            cantieriKm: vecchieListe.cantieriKm && typeof vecchieListe.cantieriKm === "object" ? vecchieListe.cantieriKm : {},
            cantiereZone: vecchieListe.cantiereZone && typeof vecchieListe.cantiereZone === "object" ? vecchieListe.cantiereZone : {},
            cantiereStato: vecchieListe.cantiereStato && typeof vecchieListe.cantiereStato === "object" ? vecchieListe.cantiereStato : {},
            lavori: Array.isArray(vecchieListe.lavori) ? vecchieListe.lavori : []
          };
        }
      } catch (erroreVecchieListe) {
        console.warn("Nessuna lista precedente recuperabile.", erroreVecchieListe);
      }

      return {
        collaboratori: ["Richard", "Cristian", "Oliver"],
        operaiDettagli: {
          "Richard": { nome: "Richard", cognome: "", password: "" },
          "Cristian": { nome: "Cristian", cognome: "", password: "" },
          "Oliver": { nome: "Oliver", cognome: "", password: "" }
        },
        collaboratoreStato: {
          "Richard": "attivo",
          "Cristian": "attivo",
          "Oliver": "attivo"
        },
        cantieri: ["Bigorio", "Cannobio", "Mezzana", "Paradiso", "Viganello", "Chiasso"],
        cantieriKm: {
          "Bigorio": 0,
          "Cannobio": 0,
          "Mezzana": 0,
          "Paradiso": 0,
          "Viganello": 0,
          "Chiasso": 0
        },
        cantiereZone: {
          "Bigorio": "Bigorio",
          "Cannobio": "Cannobio",
          "Mezzana": "Mezzana",
          "Paradiso": "Paradiso",
          "Viganello": "Viganello",
          "Chiasso": "Chiasso"
        },
        cantiereStato: {
          "Bigorio": "attivo",
          "Cannobio": "attivo",
          "Mezzana": "attivo",
          "Paradiso": "attivo",
          "Viganello": "attivo",
          "Chiasso": "attivo"
        },
        lavori: [
          "Gesso",
          "Rasatura",
          "Montaggio guide",
          "Montaggio lastre",
          "Isolamento",
          "Stuccatura",
          "Carteggiatura",
          "Controsoffitto",
          "Pareti divisorie",
          "Ritocchi / garanzia"
        ]
      };
    }

    function salvaVociMenu() {
      localStorage.setItem(VOCI_KEY, JSON.stringify(vociMenu));
    }

    function testoPulito(voce) {
      return String(voce ?? "").trim().replace(/\s+/g, " ");
    }

    function chiaveRicerca(voce) {
      return testoPulito(voce).toLocaleLowerCase("it-CH");
    }

    function normalizzaListaVoci(valori) {
      const mappa = new Map();
      (Array.isArray(valori) ? valori : []).forEach(voce => {
        const pulita = testoPulito(typeof voce === "object" && voce !== null ? (voce.nome || voce.name || voce.titolo || voce.label || "") : voce);
        if (!pulita) return;
        const chiave = chiaveRicerca(pulita);
        if (!mappa.has(chiave)) mappa.set(chiave, pulita);
      });
      return Array.from(mappa.values()).sort((a, b) => a.localeCompare(b));
    }

    function normalizzaVociMenu() {
      vociMenu.collaboratori = normalizzaListaVoci(vociMenu.collaboratori);
      vociMenu.operaiDettagli = vociMenu.operaiDettagli && typeof vociMenu.operaiDettagli === "object" ? vociMenu.operaiDettagli : {};
      vociMenu.collaboratoreStato = vociMenu.collaboratoreStato && typeof vociMenu.collaboratoreStato === "object" ? vociMenu.collaboratoreStato : {};
      vociMenu.collaboratori.forEach(nome => {
        const esistenteStato = vociMenu.collaboratoreStato[nome];
        if (!esistenteStato) vociMenu.collaboratoreStato[nome] = "attivo";
        if (!vociMenu.operaiDettagli[nome]) {
          const parti = String(nome || "").trim().split(/\s+/);
          vociMenu.operaiDettagli[nome] = {
            nome: parti[0] || nome,
            cognome: parti.slice(1).join(" "),
            password: ""
          };
        }
      });
      vociMenu.cantieri = normalizzaListaVoci(vociMenu.cantieri);
      vociMenu.lavori = normalizzaListaVoci(vociMenu.lavori);
      vociMenu.cantieriKm = vociMenu.cantieriKm && typeof vociMenu.cantieriKm === "object" ? vociMenu.cantieriKm : {};
      vociMenu.cantiereZone = vociMenu.cantiereZone && typeof vociMenu.cantiereZone === "object" ? vociMenu.cantiereZone : {};
      vociMenu.cantiereStato = vociMenu.cantiereStato && typeof vociMenu.cantiereStato === "object" ? vociMenu.cantiereStato : {};
      vociMenu.cantieri.forEach(nome => {
        const esistenteStato = vociMenu.cantiereStato[nome];
        if (!esistenteStato) vociMenu.cantiereStato[nome] = "attivo";
      });
    }

    function statoCollaboratore(collaboratore) {
      collaboratore = testoPulito(collaboratore);
      if (!collaboratore) return "attivo";
      return (vociMenu.collaboratoreStato && vociMenu.collaboratoreStato[collaboratore]) ? vociMenu.collaboratoreStato[collaboratore] : "attivo";
    }

    function impostaStatoCollaboratore(collaboratore, stato) {
      collaboratore = testoPulito(collaboratore);
      if (!collaboratore) return;
      if (!vociMenu.collaboratoreStato) vociMenu.collaboratoreStato = {};
      vociMenu.collaboratoreStato[collaboratore] = stato === "terminato" ? "terminato" : "attivo";
      salvaVociMenu();
      aggiornaMenuTendina();
      renderizza();
    }

    function dettagliOperaio(collaboratore) {
      collaboratore = testoPulito(collaboratore);
      const dettagli = vociMenu.operaiDettagli && vociMenu.operaiDettagli[collaboratore]
        ? vociMenu.operaiDettagli[collaboratore]
        : {};
      const parti = collaboratore.split(/\s+/);
      return {
        nome: testoPulito(dettagli.nome || parti[0] || collaboratore),
        cognome: testoPulito(dettagli.cognome || parti.slice(1).join(" ")),
        password: String(dettagli.password || "")
      };
    }

    function salvaDettagliOperaio(collaboratore, nome, cognome, password, salva = true) {
      collaboratore = testoPulito(collaboratore);
      if (!collaboratore) return;
      if (!vociMenu.operaiDettagli) vociMenu.operaiDettagli = {};
      vociMenu.operaiDettagli[collaboratore] = {
        nome: testoPulito(nome),
        cognome: testoPulito(cognome),
        password: String(password || "")
      };
      if (salva) salvaVociMenu();
    }

    function aggiungiOperaioManuale() {
      const inputNome = document.getElementById("nuovoOperaioNome");
      const inputCognome = document.getElementById("nuovoOperaioCognome");
      const inputPassword = document.getElementById("nuovoOperaioPassword");
      const nome = testoPulito(inputNome ? inputNome.value : "");
      const cognome = testoPulito(inputCognome ? inputCognome.value : "");
      const password = inputPassword ? inputPassword.value : "";
      if (!nome || !cognome) {
        alert("Inserisci nome e cognome dell'operaio.");
        return;
      }
      if (!password) {
        alert("Inserisci anche la password per la futura utenza online.");
        return;
      }
      const nomeCompleto = `${nome} ${cognome}`.trim();
      const voceSalvata = aggiungiVoce("collaboratori", nomeCompleto, false);
      salvaDettagliOperaio(voceSalvata, nome, cognome, password, false);
      if (!vociMenu.collaboratoreStato) vociMenu.collaboratoreStato = {};
      vociMenu.collaboratoreStato[voceSalvata] = "attivo";
      salvaVociMenu();
      document.getElementById("collaboratore").value = voceSalvata;
      if (inputNome) inputNome.value = "";
      if (inputCognome) inputCognome.value = "";
      if (inputPassword) inputPassword.value = "";
      aggiornaMenuTendina();
      renderizza();
    }

    function collaboratoriAttivi() {
      return normalizzaListaVoci([...(vociMenu.collaboratori || []), ...ore.map(r => r.collaboratore)])
        .filter(nome => statoCollaboratore(nome) !== "terminato");
    }

    function collaboratoriTerminati() {
      return normalizzaListaVoci([...(vociMenu.collaboratori || []), ...ore.map(r => r.collaboratore)])
        .filter(nome => statoCollaboratore(nome) === "terminato");
    }

    function statoCantiere(cantiere) {
      cantiere = testoPulito(cantiere);
      if (!cantiere) return "attivo";
      return (vociMenu.cantiereStato && vociMenu.cantiereStato[cantiere]) ? vociMenu.cantiereStato[cantiere] : "attivo";
    }

    function impostaStatoCantiere(cantiere, stato) {
      cantiere = testoPulito(cantiere);
      if (!cantiere) return;
      if (!vociMenu.cantiereStato) vociMenu.cantiereStato = {};
      vociMenu.cantiereStato[cantiere] = stato === "terminato" ? "terminato" : "attivo";
      salvaVociMenu();
      aggiornaMenuTendina();
      renderizza();
    }

    function cantieriAttivi() {
      return normalizzaListaVoci([...(vociMenu.cantieri || []), ...ore.map(r => r.cantiere)])
        .filter(nome => statoCantiere(nome) !== "terminato");
    }

    function cantieriTerminati() {
      return normalizzaListaVoci([...(vociMenu.cantieri || []), ...ore.map(r => r.cantiere)])
        .filter(nome => statoCantiere(nome) === "terminato");
    }

    function collaboratoriTutti() {
      return normalizzaListaVoci([...(vociMenu.collaboratori || []), ...ore.map(r => r.collaboratore)]);
    }

    function cantieriTutti() {
      return normalizzaListaVoci([...(vociMenu.cantieri || []), ...ore.map(r => r.cantiere)]);
    }

    function toggleGestioneCantieri() {
      const panel = document.getElementById("gestioneCantieriPanel");
      const btn = document.getElementById("toggleGestioneCantieriBtn");
      if (!panel) return;
      const aperto = panel.classList.toggle("aperto");
      if (btn) btn.textContent = aperto ? "Nascondi gestione cantieri" : "Aggiungi / gestisci cantieri";
      if (aperto) aggiornaVociVisibili();
    }

    function mostraTipoCantieri(tipo) {
      vistaCantieri = tipo === "terminati" ? "terminati" : "attivi";
      document.getElementById("tabCantieriAttivi")?.classList.toggle("attivo", vistaCantieri === "attivi");
      document.getElementById("tabCantieriTerminati")?.classList.toggle("attivo", vistaCantieri === "terminati");
      aggiornaVociVisibili();
    }

    function toggleGestioneOperai() {
      const panel = document.getElementById("gestioneOperaiPanel");
      const btn = document.getElementById("toggleGestioneOperaiBtn");
      if (!panel) return;
      const aperto = panel.classList.toggle("aperto");
      if (btn) btn.textContent = aperto ? "Nascondi gestione operai" : "Aggiungi / gestisci operai attivi";
      if (aperto) aggiornaVociVisibili();
    }

    function mostraTipoOperai(tipo) {
      vistaOperai = tipo === "terminati" ? "terminati" : "attivi";
      document.getElementById("tabOperaiAttivi")?.classList.toggle("attivo", vistaOperai === "attivi");
      document.getElementById("tabOperaiTerminati")?.classList.toggle("attivo", vistaOperai === "terminati");
      aggiornaVociVisibili();
      aggiornaSelectOperaiGestione();
    }

    function toggleGestioneLavori() {
      const panel = document.getElementById("gestioneLavoriPanel");
      const btn = document.getElementById("toggleGestioneLavoriBtn");
      if (!panel) return;
      const aperto = panel.classList.toggle("aperto");
      if (btn) btn.textContent = aperto ? "Nascondi lavoro svolto" : "Aggiungi / gestisci lavoro svolto";
      if (aperto) {
        aggiornaMenuTendina();
        aggiornaVociVisibili();
      }
    }

    function trovaVoceSalvata(tipo, voce) {
      const chiave = chiaveRicerca(voce);
      return (vociMenu[tipo] || []).find(x => chiaveRicerca(x) === chiave) || "";
    }

    function aggiungiVoce(tipo, voce, salva = true) {
      voce = testoPulito(voce);
      if (!voce) return "";
      if (!vociMenu[tipo]) vociMenu[tipo] = [];
      const esistente = trovaVoceSalvata(tipo, voce);
      if (!esistente) vociMenu[tipo].push(voce);
      vociMenu[tipo] = normalizzaListaVoci(vociMenu[tipo]);
      if (salva) salvaVociMenu();
      return esistente || voce;
    }

    function aggiungiVoceManuale(tipo, inputId) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const voceSalvata = aggiungiVoce(tipo, input.value, true);
      if (tipo === "lavori" && voceSalvata) document.getElementById("lavoro").value = voceSalvata;
      if (tipo === "collaboratori" && voceSalvata) {
        document.getElementById("collaboratore").value = voceSalvata;
        const dettagli = dettagliOperaio(voceSalvata);
        salvaDettagliOperaio(voceSalvata, dettagli.nome, dettagli.cognome, dettagli.password, true);
      }
      input.value = "";
      aggiornaMenuTendina();
      renderizza();
    }

    function aggiungiCantiereManuale() {
      const inputNome = document.getElementById("nuovoCantiere");
      const inputKm = document.getElementById("nuovoCantiereKm");
      const inputZona = document.getElementById("nuovoCantiereZona");
      const nome = inputNome.value.trim();
      const km = Number(inputKm.value || 0);
      const zona = (inputZona.value || nome).trim();
      if (!nome) {
        alert("Inserisci il nome del cantiere.");
        return;
      }
      const nomeSalvato = aggiungiVoce("cantieri", nome, false);
      salvaKmCantiere(nomeSalvato, km, false);
      salvaZonaCantiere(nomeSalvato, zona, false);
      if (!vociMenu.cantiereStato) vociMenu.cantiereStato = {};
      vociMenu.cantiereStato[nomeSalvato] = "attivo";
      salvaVociMenu();
      document.getElementById("cantiere").value = nomeSalvato;
      document.getElementById("km").value = Number(km || 0);
      inputNome.value = "";
      inputKm.value = "";
      inputZona.value = "";
      aggiornaMenuTendina();
      aggiornaKmDaCantiere();
      renderizza();
    }

    function salvaKmCantiere(cantiere, km, salva = true) {
      cantiere = String(cantiere || "").trim();
      if (!cantiere) return;
      if (!vociMenu.cantieriKm) vociMenu.cantieriKm = {};
      vociMenu.cantieriKm[cantiere] = Number(km || 0);
      if (salva) salvaVociMenu();
    }

    function salvaZonaCantiere(cantiere, zona, salva = true) {
      cantiere = String(cantiere || "").trim();
      zona = String(zona || cantiere).trim();
      if (!cantiere) return;
      if (!vociMenu.cantiereZone) vociMenu.cantiereZone = {};
      vociMenu.cantiereZone[cantiere] = zona || cantiere;
      if (salva) salvaVociMenu();
    }

    function zonaTrasferta(cantiere) {
      cantiere = String(cantiere || "").trim();
      return (vociMenu.cantiereZone && vociMenu.cantiereZone[cantiere]) ? vociMenu.cantiereZone[cantiere] : cantiere;
    }

    function eliminaVoce(tipo, voce) {
      if (!confirm(`Eliminare "${voce}" dal menu a tendina?`)) return;
      vociMenu[tipo] = (vociMenu[tipo] || []).filter(x => chiaveRicerca(x) !== chiaveRicerca(voce));
      if (tipo === "cantieri") {
        if (vociMenu.cantieriKm) delete vociMenu.cantieriKm[voce];
        if (vociMenu.cantiereZone) delete vociMenu.cantiereZone[voce];
        if (vociMenu.cantiereStato) delete vociMenu.cantiereStato[voce];
      }
      salvaVociMenu();
      aggiornaMenuTendina();
      renderizza();
    }

    function aggiornaVociDaStorico() {
      ore.forEach(riga => {
        aggiungiVoce("collaboratori", riga.collaboratore, false);
        aggiungiVoce("cantieri", riga.cantiere, false);
        if (riga.cantiere && riga.km !== undefined && riga.km !== null) salvaKmCantiere(riga.cantiere, Number(riga.km || 0), false);
        if (riga.cantiere) salvaZonaCantiere(riga.cantiere, zonaTrasferta(riga.cantiere) || riga.cantiere, false);
        aggiungiVoce("lavori", riga.lavoro, false);
      });
      normalizzaVociMenu();
      salvaVociMenu();
    }

    function oreDaOrari(inizio, fine, pausa) {
      if (!inizio || !fine) return 0;
      const [ih, im] = inizio.split(":").map(Number);
      const [fh, fm] = fine.split(":").map(Number);
      let minuti = (fh * 60 + fm) - (ih * 60 + im);
      if (minuti < 0) minuti += 24 * 60;
      return Math.max(0, minuti / 60 - Number(pausa || 0));
    }

    function aggiornaKmDaCantiere() {
      const inputCantiere = document.getElementById("cantiere");
      const digitato = testoPulito(inputCantiere.value);
      const nomeCantiere = trovaVoceSalvata("cantieri", digitato) || digitato;
      if (nomeCantiere && inputCantiere.value !== nomeCantiere && chiaveRicerca(inputCantiere.value) === chiaveRicerca(nomeCantiere)) {
        inputCantiere.value = nomeCantiere;
      }
      if (nomeCantiere && vociMenu.cantieriKm && Object.prototype.hasOwnProperty.call(vociMenu.cantieriKm, nomeCantiere)) {
        document.getElementById("km").value = vociMenu.cantieriKm[nomeCantiere];
      }
      aggiornaRegolaTrasferta();
    }

    function fasciaKm(km) {
      km = Number(km || 0);
      if (km <= 30) return { nome: "0 - 30 km", importo: 15 };
      if (km <= 40) return { nome: "31 - 40 km", importo: 20 };
      if (km <= 60) return { nome: "41 - 60 km", importo: 27 };
      return { nome: "oltre 60 km", importo: 37 };
    }

    function aggiornaRegolaTrasferta() {
      const box = document.getElementById("regolaTrasferta");
      if (!box) return;
      const km = Number(val("km") || 0);
      const fascia = fasciaKm(km);
      const inputImporto = document.getElementById("importoTrasferta");
      if (inputImporto) inputImporto.value = fascia.importo;
      box.classList.remove("avs-si", "avs-no");
      if (km <= 10) {
        box.classList.add("avs-si");
        box.innerHTML = `<strong>AVS:</strong> <span class="avs-badge si">Sì</span> — ${km.toFixed(1)} km. Fascia: ${fascia.nome}, CHF ${fascia.importo.toFixed(2)} al giorno.`;
      } else {
        box.classList.add("avs-no");
        box.innerHTML = `<strong>AVS:</strong> <span class="avs-badge no">No</span> — ${km.toFixed(1)} km. Fascia: ${fascia.nome}, CHF ${fascia.importo.toFixed(2)} al giorno.`;
      }
    }

    function aggiornaAnteprimaOre() {
      const oreManualiTesto = val("oreManuali");
      const anteprima = document.getElementById("anteprimaOre");
      if (!anteprima) return;

      if (oreManualiTesto !== "") {
        const oreManuali = Number(oreManualiTesto);
        anteprima.textContent = Number.isNaN(oreManuali)
          ? "Ore manuali non valide"
          : `Ore inserite manualmente: ${oreManuali.toFixed(2)}`;
        return;
      }

      const oreCalcolate = oreDaOrari(val("inizio"), val("fine"), Number(val("pausa") || 0));
      anteprima.textContent = `Ore calcolate: ${oreCalcolate.toFixed(2)}`;
    }

    function creaId() {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
      return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    }

    function ruoloUtenteCorrente() {
      // Preparato per la futura app online:
      // amministratore/admin può inserire e correggere ore avanti e indietro nel tempo;
      // collaboratore/operaio può salvare solo le ore del giorno presente.
      return String(localStorage.getItem("ruolo_utente_ore") || "admin").toLowerCase();
    }

    function utenteCorrenteEAmministratore() {
      const ruolo = ruoloUtenteCorrente();
      return ruolo === "admin" || ruolo === "amministratore" || ruolo === "administrator";
    }

    function collaboratorePuoSalvareData(dataIso) {
      if (utenteCorrenteEAmministratore()) return true;
      const ruolo = ruoloUtenteCorrente();
      if (ruolo === "collaboratore" || ruolo === "operaio") {
        return dataIso === formattaDataLocale(new Date());
      }
      return true;
    }

    const LIMITE_ORE_GIORNO_COLLABORATORE = 8.5;

    function utenteCorrenteECollaboratore() {
      const ruolo = ruoloUtenteCorrente();
      if (typeof supabaseUtenteCollaboratore === "function" && supabaseUtenteCollaboratore()) return true;
      return ruolo === "collaboratore" || ruolo === "operaio";
    }

    function totaleOreCollaboratoreGiornoLocale(collaboratore, dataIso, idEscluso = null) {
      const nome = testoPulito(collaboratore);
      return ore
        .filter(r => testoPulito(r.collaboratore) === nome && r.data === dataIso && (!idEscluso || r.id !== idEscluso))
        .reduce((totale, r) => totale + Number(r.totaleOre || 0), 0);
    }

    function collaboratoreRispettaLimiteOreGiorno(collaboratore, dataIso, oreDaAggiungere, idEscluso = null, mostraMessaggio = true) {
      if (!utenteCorrenteECollaboratore()) return true;
      const totaleGiaInserito = totaleOreCollaboratoreGiornoLocale(collaboratore, dataIso, idEscluso);
      const nuovoTotale = totaleGiaInserito + Number(oreDaAggiungere || 0);
      if (nuovoTotale <= LIMITE_ORE_GIORNO_COLLABORATORE + 0.001) return true;
      if (mostraMessaggio) {
        alert(
          "Limite ore giornaliero superato.\n\n" +
          "Puoi inserire più cantieri nello stesso giorno, ma il totale massimo è 8.50 ore.\n" +
          "Ore già inserite oggi: " + totaleGiaInserito.toFixed(2) + "\n" +
          "Ore che stai inserendo: " + Number(oreDaAggiungere || 0).toFixed(2) + "\n" +
          "Totale: " + nuovoTotale.toFixed(2) + " ore"
        );
      }
      return false;
    }

    function salvaOra() {
      const collaboratore = val("collaboratore").trim();
      const data = val("data");
      const cantiere = val("cantiere").trim();
      const inizio = val("inizio");
      const fine = val("fine");
      const pausa = Number(val("pausa") || 0);
      const oreManualiTesto = val("oreManuali");
      const oreManuali = oreManualiTesto === "" ? null : Number(oreManualiTesto);
      const lavoro = val("lavoro").trim();
      const nota = val("nota").trim();
      const km = Number(val("km") || 0);
      const importoTrasferta = Number(val("importoTrasferta") || 0);
      const oreCalcolate = oreDaOrari(inizio, fine, pausa);
      const totaleOre = oreManuali !== null && !Number.isNaN(oreManuali) ? oreManuali : oreCalcolate;
      const avs = km <= 10 ? "Sì" : "No";

      if (!collaboratore || !data || !cantiere) {
        alert("Inserisci almeno collaboratore, data e cantiere.");
        return;
      }

      if (!collaboratorePuoSalvareData(data)) {
        alert("Con accesso collaboratore/operaio si possono segnare solo le ore del giorno presente. L'amministratore può invece inserire o correggere qualsiasi data.");
        return;
      }

      if (!collaboratoreRispettaLimiteOreGiorno(collaboratore, data, totaleOre, editId, true)) {
        return;
      }

      const collaboratoreSalvato = aggiungiVoce("collaboratori", collaboratore, false);
      const dettagliCollaboratore = dettagliOperaio(collaboratoreSalvato);
      salvaDettagliOperaio(collaboratoreSalvato, dettagliCollaboratore.nome, dettagliCollaboratore.cognome, dettagliCollaboratore.password, false);
      if (collaboratoreSalvato && statoCollaboratore(collaboratoreSalvato) === "terminato") {
        // Mantiene il nome nello storico, ma evita di cambiare automaticamente lo stato se era terminato.
      } else if (collaboratoreSalvato) {
        if (!vociMenu.collaboratoreStato) vociMenu.collaboratoreStato = {};
        vociMenu.collaboratoreStato[collaboratoreSalvato] = "attivo";
      }
      aggiungiVoce("cantieri", cantiere, false);
      salvaKmCantiere(cantiere, km, false);
      salvaZonaCantiere(cantiere, zonaTrasferta(cantiere) || cantiere, false);
      if (!vociMenu.cantiereStato) vociMenu.cantiereStato = {};
      if (!vociMenu.cantiereStato[cantiere]) vociMenu.cantiereStato[cantiere] = "attivo";
      aggiungiVoce("lavori", lavoro, false);
      salvaVociMenu();

      const riga = {
        id: editId || creaId(),
        collaboratore,
        data,
        cantiere,
        inizio,
        fine,
        pausa,
        oreManuali,
        totaleOre,
        lavoro,
        nota,
        km,
        importoTrasferta: fasciaKm(km).importo,
        avs,
        creatoIl: new Date().toISOString()
      };

      if (editId) {
        ore = ore.map(x => x.id === editId ? riga : x);
        editId = null;
      } else {
        ore.push(riga);
      }

      salvaStorage();
      pulisciForm(false);
      renderizza();
    }

    function val(id) {
      return document.getElementById(id).value;
    }

    function pulisciForm(resetData = true) {
      document.getElementById("collaboratore").value = "";
      if (resetData) document.getElementById("data").value = formattaDataLocale(new Date());
      document.getElementById("cantiere").value = "";
      document.getElementById("inizio").value = "07:30";
      document.getElementById("fine").value = "17:00";
      document.getElementById("pausa").value = "1";
      document.getElementById("oreManuali").value = "";
      aggiornaAnteprimaOre();
      document.getElementById("lavoro").value = "";
      const notaInput = document.getElementById("nota");
      if (notaInput) notaInput.value = "";
      document.getElementById("km").value = "0";
      document.getElementById("importoTrasferta").value = "30";
      aggiornaRegolaTrasferta();
      editId = null;
    }

    function renderizza() {
      aggiornaCollaboratori();
      aggiornaMenuTendina();
      aggiornaVociVisibili();
      renderOperaiSinistra();
      const righe = righeFiltrate();
      renderTotali(righe);
      renderTabella(righe);
      renderRiepilogoOre(righe);
      renderRiepilogoCantieriCollaboratori(righe);
      renderTitoloStampa();
      aggiornaRegolaTrasferta();
    }

    function scegliCollaboratoreFiltro(valore) {
      const filtro = document.getElementById("filtroCollaboratore");
      if (filtro) filtro.dataset.valoreScelto = valore || "";
      renderizza();
    }

    function aggiornaCollaboratori() {
      const tuttiNomi = normalizzaListaVoci([...(vociMenu.collaboratori || []), ...ore.map(x => x.collaboratore).filter(Boolean)]);
      const nomiAttivi = collaboratoriAttivi();
      const filtro = document.getElementById("filtroCollaboratore");
      const valore = filtro.dataset.valoreScelto || filtro.value || "";
      filtro.innerHTML = '<option value="">Tutti i collaboratori</option>';
      tuttiNomi.forEach(nome => {
        const opt = document.createElement("option");
        opt.value = nome;
        opt.textContent = statoCollaboratore(nome) === "terminato" ? `${nome} (terminato)` : nome;
        filtro.appendChild(opt);
      });
      const valoreFinale = tuttiNomi.includes(valore) ? valore : "";
      filtro.value = valoreFinale;
      filtro.dataset.valoreScelto = valoreFinale;

      const lista = document.getElementById("listaCollaboratori");
      lista.innerHTML = "";
      nomiAttivi.forEach(nome => {
        const opt = document.createElement("option");
        opt.value = nome;
        lista.appendChild(opt);
      });
    }

    function renderOperaiSinistra() {
      const contenitore = document.getElementById("operaiListaSinistra");
      const contenitoreAlto = document.getElementById("operaiListaAlta");
      if (!contenitore) return;

      const nomi = collaboratoriTutti();

      if (!nomi.length) {
        const vuoto = '<p class="note">Nessun operaio salvato. Aggiungilo dal riquadro Inserimento ore.</p>';
        contenitore.innerHTML = vuoto;
        if (contenitoreAlto) contenitoreAlto.innerHTML = vuoto;
        aggiornaContatoriGiornoOperai(0, 0);
        return;
      }

      const giorno = valControlloGiorno();
      const datiGiorno = creaDatiOperaiPerGiorno(nomi, giorno);

      if (contenitoreAlto) {
        contenitoreAlto.innerHTML = datiGiorno.map(item => {
          const stato = item.oreTotali > 0 ? "ok" : "manca";
          const testo = item.oreTotali > 0
            ? `${item.oreTotali.toFixed(2)} ore`
            : "Mancano ore";
          return `
            <button type="button" class="operaio-mini-btn ${stato}" data-nome="${escapeAttribute(item.nome)}" onclick="selezionaOperaioSinistra(this.dataset.nome)">
              ${escapeHtml(item.nome)}<br><span style="font-weight:normal;">${escapeHtml(testo)}</span>
            </button>
          `;
        }).join("");
      }
      const presenti = datiGiorno.filter(x => x.oreTotali > 0).length;
      const mancanti = datiGiorno.length - presenti;
      aggiornaContatoriGiornoOperai(presenti, mancanti);

      contenitore.innerHTML = datiGiorno.map(item => {
        const stato = item.oreTotali > 0 ? "ok" : "manca";
        const testo = item.oreTotali > 0
          ? `${item.oreTotali.toFixed(2)} ore - ${item.cantieri.join(", ")}`
          : "Mancano ore";
        return `
          <button type="button" class="operaio-quick ${stato}" data-nome="${escapeAttribute(item.nome)}" onclick="selezionaOperaioSinistra(this.dataset.nome)">
            <strong>${escapeHtml(item.nome)}</strong>
            <span>${escapeHtml(testo)}</span>
          </button>
        `;
      }).join("");

      evidenziaOperaioSinistra();
      aggiornaDettaglioOperaioGiorno();
    }

    function creaDatiOperaiPerGiorno(nomi, giorno) {
      return nomi.map(nome => {
        const righe = ore.filter(r => r.collaboratore === nome && r.data === giorno);
        return {
          nome,
          righe,
          oreTotali: righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0),
          cantieri: [...new Set(righe.map(r => r.cantiere).filter(Boolean))]
        };
      });
    }

    function aggiornaContatoriGiornoOperai(presenti, mancanti) {
      const box = document.getElementById("contatoriGiornoOperai");
      if (!box) return;
      box.innerHTML = `
        <div class="quick-count">Segnati<strong>${presenti}</strong></div>
        <div class="quick-count">Mancano<strong>${mancanti}</strong></div>
      `;
    }

    function valControlloGiorno() {
      const input = document.getElementById("controlloGiorno");
      if (input && input.value) return input.value;
      const dataForm = document.getElementById("data");
      if (dataForm && dataForm.value) return dataForm.value;
      return formattaDataLocale(new Date());
    }

    function formattaDataLocale(data) {
      const anno = data.getFullYear();
      const mese = String(data.getMonth() + 1).padStart(2, "0");
      const giorno = String(data.getDate()).padStart(2, "0");
      return `${anno}-${mese}-${giorno}`;
    }

    function cambiaGiornoControllo(delta) {
      const input = document.getElementById("controlloGiorno");
      if (!input) return;

      const base = input.value || formattaDataLocale(new Date());
      const parti = base.split("-").map(Number);
      const data = parti.length === 3 && parti.every(n => !Number.isNaN(n))
        ? new Date(parti[0], parti[1] - 1, parti[2])
        : new Date();

      data.setDate(data.getDate() + Number(delta || 0));
      input.value = formattaDataLocale(data);
      renderOperaiSinistra();
    }

    function selezionaOperaioSinistra(nome) {
      const input = document.getElementById("collaboratore");
      if (!input) return;
      input.value = nome;

      const dataInput = document.getElementById("data");
      const giorno = valControlloGiorno();
      if (dataInput && giorno) dataInput.value = giorno;

      evidenziaOperaioSinistra();
      aggiornaDettaglioOperaioGiorno();
      input.focus();
    }

    function evidenziaOperaioSinistra() {
      const input = document.getElementById("collaboratore");
      const scelto = input ? input.value : "";
      document.querySelectorAll(".operaio-btn, .operaio-quick, .operaio-mini-btn").forEach(btn => {
        btn.classList.toggle("attivo", btn.dataset.nome === scelto);
      });
    }

    function scaricaCollaboratoreDaRiquadro(nome) {
      const filtro = document.getElementById("filtroCollaboratore");
      const giorno = valControlloGiorno();
      if (filtro) filtro.value = nome;

      const data = new Date(giorno + "T00:00:00");
      const primoGiorno = formattaDataLocale(new Date(data.getFullYear(), data.getMonth(), 1));
      const ultimoGiorno = formattaDataLocale(new Date(data.getFullYear(), data.getMonth() + 1, 0));

      const dal = document.getElementById("filtroDal");
      const al = document.getElementById("filtroAl");
      if (dal) dal.value = primoGiorno;
      if (al) al.value = ultimoGiorno;

      renderizza();
      scaricaCollaboratore();
    }

    function aggiornaDettaglioOperaioGiorno() {
      const box = document.getElementById("dettaglioOperaioGiorno");
      if (!box) return;

      const nome = val("collaboratore").trim();
      const giorno = valControlloGiorno();

      if (!nome) {
        box.innerHTML = "<h3>Dettaglio rapido</h3><p class='note'>Seleziona un operaio per vedere il giorno scelto.</p>";
        return;
      }

      const righe = ore
        .filter(r => r.collaboratore === nome && r.data === giorno)
        .sort((a, b) => String(a.cantiere || "").localeCompare(String(b.cantiere || "")));

      if (!righe.length) {
        box.innerHTML = `
          <h3>${escapeHtml(nome)}</h3>
          <p><strong>${fmtData(giorno)}</strong></p>
          <p class="note">Nessuna ora segnata per questo giorno.</p>
          <button type="button" class="quick-download-btn" onclick="scaricaCollaboratoreDaRiquadro('${escapeAttribute(nome)}')">Scarica raccolta collaboratore</button>
        `;
        return;
      }

      const totale = righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0);
      const dettagli = righe.map(r => `
        <div style="border-top:1px solid #d1d5db; padding-top:5px; margin-top:5px;">
          <strong>${escapeHtml(r.cantiere || "")}</strong><br>
          ${escapeHtml(r.inizio || "")} - ${escapeHtml(r.fine || "")}, pausa ${Number(r.pausa || 0)}<br>
          ${escapeHtml(r.lavoro || "")}<br>
          ${r.nota ? `<em>Nota: ${escapeHtml(r.nota)}</em><br>` : ""}
          <strong>${Number(r.totaleOre || 0).toFixed(2)} ore</strong>
        </div>
      `).join("");

      box.innerHTML = `
        <h3>${escapeHtml(nome)}</h3>
        <p><strong>${fmtData(giorno)}</strong> - Totale: <strong>${totale.toFixed(2)} ore</strong></p>
        ${dettagli}
        <button type="button" class="quick-download-btn" onclick="scaricaCollaboratoreDaRiquadro('${escapeAttribute(nome)}')">Scarica raccolta collaboratore</button>
      `;
    }

    function filtraVociRicerca(valori, testo) {
      const ricerca = chiaveRicerca(testo || "");
      return normalizzaListaVoci(valori).filter(voce => {
        if (!ricerca) return true;
        return chiaveRicerca(voce).includes(ricerca);
      }).slice(0, 12);
    }

    function renderSuggerimentiRicerca(boxId, valori, selezionaFnNome) {
      const box = document.getElementById(boxId);
      if (!box) return;
      if (!valori.length) {
        box.innerHTML = '<div class="suggerimento-vuoto">Nessuna voce trovata.</div>';
        box.classList.add("aperto");
        return;
      }
      box.innerHTML = valori.map(voce => `
        <button type="button" class="suggerimento-voce" data-voce="${escapeAttribute(voce)}" onclick="${selezionaFnNome}(this.dataset.voce)">${escapeHtml(voce)}</button>
      `).join("");
      box.classList.add("aperto");
    }

    function nascondiSuggerimentiRicerca() {
      document.getElementById("suggerimentiCantiere")?.classList.remove("aperto");
      document.getElementById("suggerimentiLavoro")?.classList.remove("aperto");
    }

    function mostraSuggerimentiCantiere() {
      aggiornaMenuTendinaBase();
      const testo = document.getElementById("cantiere")?.value || "";
      renderSuggerimentiRicerca("suggerimentiCantiere", filtraVociRicerca(cantieriTutti(), testo), "scegliSuggerimentoCantiere");
    }

    function mostraSuggerimentiLavoro() {
      aggiornaMenuTendinaBase();
      const testo = document.getElementById("lavoro")?.value || "";
      const lavori = normalizzaListaVoci([...(vociMenu.lavori || []), ...ore.map(r => r.lavoro)]);
      renderSuggerimentiRicerca("suggerimentiLavoro", filtraVociRicerca(lavori, testo), "scegliSuggerimentoLavoro");
    }

    function scegliSuggerimentoCantiere(cantiere) {
      selezionaCantiereInserimento(cantiere);
      nascondiSuggerimentiRicerca();
      document.getElementById("cantiere")?.focus();
    }

    function scegliSuggerimentoLavoro(lavoro) {
      selezionaLavoroInserimento(lavoro);
      nascondiSuggerimentiRicerca();
      document.getElementById("lavoro")?.focus();
    }

    function aggiornaMenuTendinaBase() {
      const collaboratori = collaboratoriTutti();
      const cantieri = cantieriTutti();
      const lavori = normalizzaListaVoci([...(vociMenu.lavori || []), ...ore.map(r => r.lavoro)]);
      riempiDatalist("listaCollaboratori", collaboratori);
      riempiDatalist("listaCantieri", cantieri);
      riempiDatalist("listaLavori", lavori);
      aggiornaSelectCantiereInserimento(cantieri);
      aggiornaSelectLavoroInserimento(lavori);
    }

    function aggiornaMenuTendina() {
      aggiornaMenuTendinaBase();
      aggiornaSelectOperaiGestione();
      aggiornaSelectLavoriGestione();
    }

    function aggiornaSelectCantiereInserimento(cantieri) {
      const select = document.getElementById("selectCantiereInserimento");
      if (!select) return;
      const valori = Array.isArray(cantieri) ? cantieri : cantieriAttivi();
      const valoreCorrente = select.value;
      select.innerHTML = '<option value="">Scegli cantiere attivo</option>';
      valori.forEach(cantiere => {
        const opt = document.createElement("option");
        opt.value = cantiere;
        opt.textContent = cantiere;
        select.appendChild(opt);
      });
      select.value = valori.includes(valoreCorrente) ? valoreCorrente : "";
    }

    function selezionaCantiereInserimento(cantiere) {
      cantiere = testoPulito(cantiere);
      if (!cantiere) return;
      const input = document.getElementById("cantiere");
      if (input) input.value = cantiere;
      aggiornaKmDaCantiere();
    }

    function aggiornaSelectLavoroInserimento(lavori) {
      const select = document.getElementById("selectLavoroInserimento");
      if (!select) return;
      const valori = Array.isArray(lavori) ? lavori : normalizzaListaVoci([...(vociMenu.lavori || []), ...ore.map(r => r.lavoro)]);
      const valoreCorrente = select.value;
      select.innerHTML = '<option value="">Scegli lavoro svolto</option>';
      valori.forEach(lavoro => {
        const opt = document.createElement("option");
        opt.value = lavoro;
        opt.textContent = lavoro;
        select.appendChild(opt);
      });
      select.value = valori.includes(valoreCorrente) ? valoreCorrente : "";
    }

    function selezionaLavoroInserimento(lavoro) {
      lavoro = testoPulito(lavoro);
      if (!lavoro) return;
      const input = document.getElementById("lavoro");
      if (input) input.value = lavoro;
    }

    function aggiornaSelectOperaiGestione() {
      const select = document.getElementById("selectOperaioGestione");
      if (!select) return;
      const valoreCorrente = select.value;
      const valori = collaboratoriTutti();
      select.innerHTML = '<option value="">Seleziona operaio / collaboratore</option>';
      valori.forEach(nome => {
        const opt = document.createElement("option");
        opt.value = nome;
        opt.textContent = nome;
        select.appendChild(opt);
      });
      select.value = valori.includes(valoreCorrente) ? valoreCorrente : "";
    }

    function selezionaOperaioGestione(nome) {
      nome = testoPulito(nome);
      if (!nome) return;
      const dettagli = dettagliOperaio(nome);
      const nomeInput = document.getElementById("nuovoOperaioNome");
      const cognomeInput = document.getElementById("nuovoOperaioCognome");
      const passwordInput = document.getElementById("nuovoOperaioPassword");
      if (nomeInput) nomeInput.value = dettagli.nome || "";
      if (cognomeInput) cognomeInput.value = dettagli.cognome || "";
      if (passwordInput) passwordInput.value = dettagli.password || "";
      if (statoCollaboratore(nome) !== "terminato") {
        const inputCollaboratore = document.getElementById("collaboratore");
        if (inputCollaboratore) inputCollaboratore.value = nome;
        evidenziaOperaioSinistra();
        aggiornaDettaglioOperaioGiorno();
      }
    }

    function aggiornaSelectLavoriGestione() {
      const select = document.getElementById("selectLavoroGestione");
      if (!select) return;
      const valoreCorrente = select.value;
      const lavori = normalizzaListaVoci([...(vociMenu.lavori || []), ...ore.map(r => r.lavoro)]);
      select.innerHTML = '<option value="">Seleziona lavoro svolto</option>';
      lavori.forEach(lavoro => {
        const opt = document.createElement("option");
        opt.value = lavoro;
        opt.textContent = lavoro;
        select.appendChild(opt);
      });
      select.value = lavori.includes(valoreCorrente) ? valoreCorrente : "";
    }

    function selezionaLavoroGestione(lavoro) {
      lavoro = testoPulito(lavoro);
      if (!lavoro) return;
      const inputLavoro = document.getElementById("lavoro");
      const inputNuovoLavoro = document.getElementById("nuovoLavoro");
      if (inputLavoro) inputLavoro.value = lavoro;
      if (inputNuovoLavoro) inputNuovoLavoro.value = lavoro;
    }

    function riempiDatalist(id, valori) {
      const lista = document.getElementById(id);
      lista.innerHTML = "";
      valori.forEach(voce => {
        const opt = document.createElement("option");
        opt.value = voce;
        lista.appendChild(opt);
      });
    }

    function aggiornaVociVisibili() {
      document.getElementById("collaboratoriSalvati").innerHTML = creaTagVoci("collaboratori");
      document.getElementById("cantieriSalvati").innerHTML = creaTagVoci("cantieri");
      document.getElementById("lavoriSalvati").innerHTML = creaTagVoci("lavori");
      aggiornaSelectOperaiGestione();
      aggiornaSelectLavoriGestione();
    }

    function creaTagVoci(tipo) {
      let valori = normalizzaListaVoci(vociMenu[tipo] || []);
      if (tipo === "cantieri") {
        valori = cantieriTutti();
      }
      if (tipo === "collaboratori") {
        valori = collaboratoriTutti();
      }

      if (!valori.length && tipo === "cantieri") {
        return `<p class="note">Nessun cantiere salvato.</p>`;
      }
      if (!valori.length && tipo === "collaboratori") {
        return `<p class="note">Nessun operaio / collaboratore salvato.</p>`;
      }

      return valori.map(voce => {
        const vocePerHtml = escapeHtml(voce);
        const vocePerAttributo = escapeAttribute(voce);
        const kmInfo = tipo === "cantieri" && vociMenu.cantieriKm && vociMenu.cantieriKm[voce] !== undefined
          ? ` — ${Number(vociMenu.cantieriKm[voce] || 0).toFixed(1)} km`
          : "";
        const zonaInfo = tipo === "cantieri" ? ` — zona: ${escapeHtml(zonaTrasferta(voce))}` : "";
        const stato = tipo === "cantieri" ? statoCantiere(voce) : (tipo === "collaboratori" ? statoCollaboratore(voce) : "");
        const classeStato = tipo === "cantieri" ? ` cantiere-${stato}` : (tipo === "collaboratori" ? ` operaio-${stato}` : "");
        const dettagli = tipo === "collaboratori" ? dettagliOperaio(voce) : null;
        const infoOperaio = tipo === "collaboratori" && dettagli
          ? ` — nome: ${escapeHtml(dettagli.nome || "")} — cognome: ${escapeHtml(dettagli.cognome || "")} — password: ${dettagli.password ? "••••••" : "non impostata"}`
          : "";
        const bottoneStato = tipo === "cantieri"
          ? `<button type="button" class="azione-stato" data-voce="${vocePerAttributo}" onclick="impostaStatoCantiere(this.dataset.voce, '${stato === "terminato" ? "attivo" : "terminato"}')">${stato === "terminato" ? "Rendi attivo" : "Termina"}</button>`
          : (tipo === "collaboratori" ? `<button type="button" class="azione-stato" data-voce="${vocePerAttributo}" onclick="impostaStatoCollaboratore(this.dataset.voce, '${stato === "terminato" ? "attivo" : "terminato"}')">${stato === "terminato" ? "Rendi attivo" : "Termina"}</button>` : "");
        const labelStato = tipo === "cantieri" ? ` — <span class="stato-cantiere">${stato === "terminato" ? "terminato" : "attivo"}</span>` : (tipo === "collaboratori" ? ` — <span class="stato-cantiere">${stato === "terminato" ? "terminato" : "attivo"}</span>` : "");
        return `
          <span class="tag${classeStato}">
            ${vocePerHtml}${labelStato}${infoOperaio}${kmInfo}${zonaInfo}
            ${bottoneStato}
            <button type="button" data-tipo="${tipo}" data-voce="${vocePerAttributo}" onclick="eliminaVoce(this.dataset.tipo, this.dataset.voce)">x</button>
          </span>
        `;
      }).join("");
    }

    function righeFiltrate() {
      const collaboratore = val("filtroCollaboratore");
      const dal = val("filtroDal");
      const al = val("filtroAl");
      return ore
        .filter(x => !collaboratore || x.collaboratore === collaboratore)
        .filter(x => !dal || String(x.data || "") >= dal)
        .filter(x => !al || String(x.data || "") <= al)
        .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")) || String(a.collaboratore || "").localeCompare(String(b.collaboratore || "")));
    }

    function renderTotali(righe) {
      const oreTot = somma(righe, "totaleOre");
      const trasferteTot = righe.reduce((tot, r) => tot + fasciaKm(Number(r.km || 0)).importo, 0);
      const giorniAVSSi = righe.filter(x => Number(x.km || 0) <= 10).length;
      const giorniAVSNo = righe.filter(x => Number(x.km || 0) > 10).length;

      document.getElementById("totali").innerHTML = `
        <div class="total-box">Ore totali<strong>${oreTot.toFixed(2)}</strong></div>
        <div class="total-box">Trasferte totali<strong>CHF ${trasferteTot.toFixed(2)}</strong></div>
        <div class="total-box">Giorni AVS Sì<strong>${giorniAVSSi}</strong></div>
        <div class="total-box">Giorni AVS No<strong>${giorniAVSNo}</strong></div>
      `;
    }

    function somma(righe, campo) {
      return righe.reduce((tot, x) => tot + Number(x[campo] || 0), 0);
    }

    function renderRiepilogoOre(righe) {
      const contenitore = document.getElementById("riepilogoOre");
      if (!contenitore) return;
      if (!righe.length) {
        contenitore.innerHTML = "";
        window.__collaboratoriDettaglio = {};
        window.__righeRiepilogoOre = [];
        return;
      }

      window.__collaboratoriDettaglio = creaDettaglioCollaboratori(righe);
      window.__righeRiepilogoOre = righe;

      const nomiCollaboratori = collaboratoriTutti();
      const cantieri = cantieriTutti();
      const collaboratoreSalvato = localStorage.getItem("riepilogo_collaboratore_scelto") || "";
      const cantiereSalvato = localStorage.getItem("riepilogo_cantiere_scelto") || "";
      const collaboratoreSelezionato = nomiCollaboratori.includes(collaboratoreSalvato) ? collaboratoreSalvato : "";
      const cantiereSelezionato = cantieri.includes(cantiereSalvato) ? cantiereSalvato : "";

      const datalistCollaboratori = nomiCollaboratori.map(nome => `<option value="${escapeAttribute(nome)}"></option>`).join("");
      const datalistCantieri = cantieri.map(nome => `<option value="${escapeAttribute(nome)}"></option>`).join("");

      contenitore.innerHTML = `
        <div class="summary-box riepilogo-unico-box">
          <h3>Resoconto ore per collaboratore e cantiere</h3>
          <div class="cantiere-picker">
            <div class="row">
              <div>
                <label for="ricercaCollaboratoreRiepilogo">Ricerca collaboratore</label>
                <input id="ricercaCollaboratoreRiepilogo" class="ricerca-riepilogo-input" list="listaRiepilogoCollaboratori" placeholder="Scrivi o lascia vuoto per tutti" value="${escapeAttribute(collaboratoreSelezionato)}" oninput="aggiornaListaCantieriRiepilogo(); renderDettaglioCollaboratoreCantiere()" />
                <datalist id="listaRiepilogoCollaboratori">${datalistCollaboratori}</datalist>
              </div>
              <div>
                <label for="ricercaCantiereRiepilogo">Ricerca cantiere</label>
                <input id="ricercaCantiereRiepilogo" class="ricerca-riepilogo-input" list="listaRiepilogoCantieri" placeholder="Scrivi o lascia vuoto per tutti" value="${escapeAttribute(cantiereSelezionato)}" oninput="renderDettaglioCollaboratoreCantiere()" />
                <datalist id="listaRiepilogoCantieri">${datalistCantieri}</datalist>
              </div>
            </div>
            <p class="note">Scrivi le prime lettere per trovare subito collaboratore o cantiere. Lascia vuoto per vedere tutti.</p>
          </div>
          <div id="collaboratoreDettaglioSelezionato"></div>
        </div>
      `;

      aggiornaListaCantieriRiepilogo(false);
      renderDettaglioCollaboratoreCantiere();
    }

    function aggiornaListaCantieriRiepilogo(mantieniSePossibile = true) {
      const inputCollaboratore = document.getElementById("ricercaCollaboratoreRiepilogo");
      const inputCantiere = document.getElementById("ricercaCantiereRiepilogo");
      const listaCantieri = document.getElementById("listaRiepilogoCantieri");
      if (!inputCollaboratore || !inputCantiere || !listaCantieri) return;

      const righe = window.__righeRiepilogoOre || [];
      const collaboratore = testoPulito(inputCollaboratore.value || "");
      const valorePrecedente = mantieniSePossibile ? testoPulito(inputCantiere.value || "") : (localStorage.getItem("riepilogo_cantiere_scelto") || "");
      const collaboratoreValido = normalizzaListaVoci(righe.map(r => r.collaboratore).filter(Boolean)).includes(collaboratore);
      const cantieri = cantieriTutti();

      listaCantieri.innerHTML = cantieri.map(nome => `<option value="${escapeAttribute(nome)}"></option>`).join("");
      if (valorePrecedente && cantieri.includes(valorePrecedente)) {
        inputCantiere.value = valorePrecedente;
      } else if (!mantieniSePossibile) {
        inputCantiere.value = cantieri.includes(valorePrecedente) ? valorePrecedente : "";
      }
    }

    function aggiornaSelectCantierePerCollaboratore(mantieniSePossibile = true) {
      aggiornaListaCantieriRiepilogo(mantieniSePossibile);
    }

    function valoreRicercaRiepilogo(id, valoriDisponibili) {
      const input = document.getElementById(id);
      const testo = testoPulito(input ? input.value : "");
      if (!testo) return "";
      const valori = normalizzaListaVoci(valoriDisponibili || []);
      const esatto = valori.find(v => chiaveRicerca(v) === chiaveRicerca(testo));
      if (esatto) return esatto;
      const inizia = valori.find(v => chiaveRicerca(v).startsWith(chiaveRicerca(testo)));
      if (inizia) return inizia;
      const contiene = valori.find(v => chiaveRicerca(v).includes(chiaveRicerca(testo)));
      return contiene || testo;
    }

    function renderDettaglioCollaboratoreCantiere() {
      const contenitore = document.getElementById("collaboratoreDettaglioSelezionato");
      if (!contenitore) return;

      const righeBase = window.__righeRiepilogoOre || [];
      const collaboratoriDisponibili = righeBase.map(r => r.collaboratore).filter(Boolean);
      const cantieriDisponibili = righeBase.map(r => r.cantiere).filter(Boolean);
      const collaboratore = valoreRicercaRiepilogo("ricercaCollaboratoreRiepilogo", collaboratoriDisponibili);
      const cantiere = valoreRicercaRiepilogo("ricercaCantiereRiepilogo", cantieriDisponibili);
      localStorage.setItem("riepilogo_collaboratore_scelto", collaboratore);
      localStorage.setItem("riepilogo_cantiere_scelto", cantiere);

      const chiaveCollaboratore = chiaveRicerca(collaboratore);
      const chiaveCantiere = chiaveRicerca(cantiere);
      const righe = righeBase
        .filter(r => !collaboratore || chiaveRicerca(r.collaboratore || "").includes(chiaveCollaboratore))
        .filter(r => !cantiere || chiaveRicerca(r.cantiere || "").includes(chiaveCantiere))
        .sort((a, b) => String(a.collaboratore || "").localeCompare(String(b.collaboratore || "")) || String(a.cantiere || "").localeCompare(String(b.cantiere || "")) || String(a.data || "").localeCompare(String(b.data || "")));

      if (!righe.length) {
        contenitore.innerHTML = "<p class='note'>Nessuna ora trovata con questa ricerca.</p>";
        return;
      }

      const totaleOre = righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0);
      const titoloCollaboratore = collaboratore || "Tutti i collaboratori";
      const titoloCantiere = cantiere || "Tutti i cantieri";

      const righeTabella = righe.map(r => `
        <tr>
          <td>${escapeHtml(r.collaboratore || "")}</td>
          <td>${escapeHtml(r.cantiere || "")}</td>
          <td>${fmtData(r.data)}</td>
          <td>${escapeHtml(r.inizio || "")} - ${escapeHtml(r.fine || "")}</td>
          <td>${escapeHtml(r.lavoro || "")}</td>
          <td>${escapeHtml(r.nota || "")}</td>
          <td class="ore-evidenza">${Number(r.totaleOre || 0).toFixed(2)}</td>
        </tr>
      `).join("");

      contenitore.innerHTML = `
        <div class="cantiere-detail">
          <h3>${escapeHtml(titoloCollaboratore)} — ${escapeHtml(titoloCantiere)}</h3>
          <div class="cantiere-totale">Totale selezione: ${totaleOre.toFixed(2)} ore</div>
          <table>
            <thead>
              <tr>
                <th>Collaboratore</th>
                <th>Cantiere</th>
                <th>Data</th>
                <th>Orario</th>
                <th>Lavorazione</th>
                <th>Nota</th>
                <th>Ore</th>
              </tr>
            </thead>
            <tbody>${righeTabella}</tbody>
          </table>
        </div>
      `;
    }


    function creaDettaglioCollaboratori(righe) {
      const collaboratori = {};
      righe.forEach(riga => {
        const collaboratore = riga.collaboratore || "Senza collaboratore";
        const cantiere = riga.cantiere || "Senza cantiere";
        if (!collaboratori[collaboratore]) {
          collaboratori[collaboratore] = { totaleOre: 0, cantieri: {} };
        }
        collaboratori[collaboratore].totaleOre += Number(riga.totaleOre || 0);
        if (!collaboratori[collaboratore].cantieri[cantiere]) {
          collaboratori[collaboratore].cantieri[cantiere] = { ore: 0, giorni: 0, dettagli: [] };
        }
        collaboratori[collaboratore].cantieri[cantiere].ore += Number(riga.totaleOre || 0);
        collaboratori[collaboratore].cantieri[cantiere].giorni += 1;
        collaboratori[collaboratore].cantieri[cantiere].dettagli.push({
          data: riga.data,
          lavoro: riga.lavoro || "",
          nota: riga.nota || "",
          ore: Number(riga.totaleOre || 0),
          inizio: riga.inizio || "",
          fine: riga.fine || "",
          km: Number(riga.km || 0)
        });
      });
      return collaboratori;
    }


    function creaHtmlTuttiCollaboratori(collaboratori) {
      const nomiCollaboratori = Object.keys(collaboratori || {}).sort((a, b) => a.localeCompare(b));
      if (!nomiCollaboratori.length) return "<p class='note'>Nessun collaboratore nel periodo selezionato.</p>";

      return nomiCollaboratori.map(nomeCollaboratore => {
        const dati = collaboratori[nomeCollaboratore];
        if (!dati) return "";

        const righeCantieri = Object.entries(dati.cantieri)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([nomeCantiere, datiCantiere]) => `
            <tr>
              <td>${escapeHtml(nomeCantiere)}</td>
              <td>${datiCantiere.giorni}</td>
              <td class="ore-evidenza">${datiCantiere.ore.toFixed(2)}</td>
            </tr>
          `).join("");

        const dettagliCantieri = Object.entries(dati.cantieri)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([nomeCantiere, datiCantiere]) => {
            const righeDettaglio = datiCantiere.dettagli
              .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")))
              .map(d => `
                <tr>
                  <td>${fmtData(d.data)}</td>
                  <td>${escapeHtml(d.inizio)} - ${escapeHtml(d.fine)}</td>
                  <td>${escapeHtml(d.lavoro || "")}</td>
                  <td>${escapeHtml(d.nota || "")}</td>
                  <td>${Number(d.km || 0).toFixed(1)}</td>
                  <td>${Number(d.km || 0) <= 10 ? '<span class="avs-badge si">Sì</span>' : '<span class="avs-badge no">No</span>'}</td>
                  <td class="ore-evidenza">${Number(d.ore || 0).toFixed(2)}</td>
                </tr>
              `).join("");

            return `
              <details class="resoconto" style="margin-top:10px;">
                <summary>Cantiere: ${escapeHtml(nomeCantiere)} — Totale: ${datiCantiere.ore.toFixed(2)} ore</summary>
                <div class="resoconto-content">
                  <table>
                    <thead><tr><th>Data</th><th>Inizio / pausa / fine lavoro</th><th>Lavorazione</th><th>Nota</th><th>Km</th><th>AVS</th><th>Ore</th></tr></thead>
                    <tbody>${righeDettaglio}</tbody>
                  </table>
                </div>
              </details>
            `;
          }).join("");

        return `
          <div class="cantiere-detail">
            <h3>Collaboratore: ${escapeHtml(nomeCollaboratore)}</h3>
            <div class="cantiere-totale">Totale periodo: ${dati.totaleOre.toFixed(2)} ore</div>
            <table>
              <thead><tr><th>Cantiere</th><th>Giorni</th><th>Ore totali</th></tr></thead>
              <tbody>${righeCantieri}</tbody>
            </table>
            ${dettagliCantieri}
          </div>
        `;
      }).join("");
    }

    function renderCollaboratoreSelezionato() {
      const select = document.getElementById("selectCollaboratoreDettaglio");
      const contenitore = document.getElementById("collaboratoreDettaglioSelezionato");
      const collaboratori = window.__collaboratoriDettaglio || {};
      if (!select || !contenitore) return;

      const nomeCollaboratore = select.value;
      localStorage.setItem("collaboratore_dettaglio_selezionato", nomeCollaboratore);
      const dati = collaboratori[nomeCollaboratore];
      if (!dati) {
        contenitore.innerHTML = "";
        return;
      }

      const righeCantieri = Object.entries(dati.cantieri)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([nomeCantiere, datiCantiere]) => `
          <tr>
            <td>${escapeHtml(nomeCantiere)}</td>
            <td>${datiCantiere.giorni}</td>
            <td class="ore-evidenza">${datiCantiere.ore.toFixed(2)}</td>
          </tr>
        `).join("");

      const dettagliCantieri = Object.entries(dati.cantieri)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([nomeCantiere, datiCantiere]) => {
          const righeDettaglio = datiCantiere.dettagli
            .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")))
            .map(d => `
              <tr>
                <td>${fmtData(d.data)}</td>
                <td>${escapeHtml(d.inizio)} - ${escapeHtml(d.fine)}</td>
                <td>${escapeHtml(d.lavoro || "")}</td>
                <td>${escapeHtml(d.nota || "")}</td>
                <td>${Number(d.km || 0).toFixed(1)}</td>
                <td>${Number(d.km || 0) <= 10 ? '<span class="avs-badge si">Sì</span>' : '<span class="avs-badge no">No</span>'}</td>
                <td class="ore-evidenza">${Number(d.ore || 0).toFixed(2)}</td>
              </tr>
            `).join("");

          return `
            <div class="collab-detail">
              <h4>Cantiere: ${escapeHtml(nomeCantiere)} — Totale: ${datiCantiere.ore.toFixed(2)} ore</h4>
              <table>
                <thead><tr><th>Data</th><th>Inizio / pausa / fine lavoro</th><th>Lavorazione</th><th>Nota</th><th>Km</th><th>AVS</th><th>Ore</th></tr></thead>
                <tbody>${righeDettaglio}</tbody>
              </table>
            </div>
          `;
        }).join("");

      contenitore.innerHTML = `
        <div class="cantiere-detail">
          <h3>Collaboratore: ${escapeHtml(nomeCollaboratore)}</h3>
          <div class="cantiere-totale">Totale periodo: ${dati.totaleOre.toFixed(2)} ore</div>
          <table>
            <thead><tr><th>Cantiere</th><th>Giorni</th><th>Ore totali</th></tr></thead>
            <tbody>${righeCantieri}</tbody>
          </table>
          ${dettagliCantieri}
        </div>
      `;
    }

    function raggruppaOre(righe, campo) {
      const mappa = {};
      righe.forEach(riga => {
        const chiave = riga[campo] || "Senza nome";
        if (!mappa[chiave]) {
          mappa[chiave] = { ore: 0, trasferte: 0 };
        }
        mappa[chiave].ore += Number(riga.totaleOre || 0);
        mappa[chiave].trasferte += Number(riga.importoTrasferta || 0);
      });
      return Object.entries(mappa)
        .map(([nome, dati]) => ({ nome, ore: dati.ore, trasferte: dati.trasferte }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    }

    function creaTabellaRiepilogo(righe, titoloPrimaColonna) {
      return `
        <table>
          <thead>
            <tr>
              <th>${titoloPrimaColonna}</th>
              <th>Ore totali</th>
              <th>Trasferte</th>
            </tr>
          </thead>
          <tbody>
            ${righe.map(riga => `
              <tr>
                <td>${escapeHtml(riga.nome)}</td>
                <td class="ore-evidenza">${riga.ore.toFixed(2)}</td>
                <td>CHF ${riga.trasferte.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    function renderRiepilogoCantieriCollaboratori(righe) {
      const contenitore = document.getElementById("riepilogoCantieriCollaboratori");
      if (!contenitore) return;

      const cantieri = {};

      (vociMenu.cantieri || []).forEach(nome => {
        const cantiere = testoPulito(nome);
        if (!cantiere) return;
        if (!cantieri[cantiere]) {
          cantieri[cantiere] = {
            totaleOre: 0,
            totaleTrasferte: 0,
            collaboratori: {}
          };
        }
      });

      righe.forEach(riga => {
        const cantiere = riga.cantiere || "Senza cantiere";
        const collaboratore = riga.collaboratore || "Senza collaboratore";
        const oreRiga = Number(riga.totaleOre || 0);
        const trasfertaRiga = fasciaKm(Number(riga.km || 0)).importo;

        if (!cantieri[cantiere]) {
          cantieri[cantiere] = {
            totaleOre: 0,
            totaleTrasferte: 0,
            collaboratori: {}
          };
        }

        cantieri[cantiere].totaleOre += oreRiga;
        cantieri[cantiere].totaleTrasferte += trasfertaRiga;

        if (!cantieri[cantiere].collaboratori[collaboratore]) {
          cantieri[cantiere].collaboratori[collaboratore] = {
            ore: 0,
            trasferte: 0,
            giornate: 0,
            dettagli: []
          };
        }

        cantieri[cantiere].collaboratori[collaboratore].ore += oreRiga;
        cantieri[cantiere].collaboratori[collaboratore].trasferte += trasfertaRiga;
        cantieri[cantiere].collaboratori[collaboratore].giornate += 1;
        cantieri[cantiere].collaboratori[collaboratore].dettagli.push({
          data: riga.data,
          lavoro: riga.lavoro || "",
          nota: riga.nota || "",
          ore: oreRiga,
          inizio: riga.inizio || "",
          fine: riga.fine || "",
          km: Number(riga.km || 0)
        });
      });

      window.__cantieriDettaglio = cantieri;
      const nomiCantieri = normalizzaListaVoci([
        ...Object.keys(cantieri),
        ...(vociMenu.cantieri || []),
        ...righe.map(r => r.cantiere)
      ]);

      if (!nomiCantieri.length) {
        contenitore.innerHTML = "<p class='note'>Nessun cantiere salvato. Aggiungilo dal riquadro Inserimento ore.</p>";
        return;
      }

      const salvato = localStorage.getItem("cantiere_dettaglio_selezionato") || "";
      const selezionato = nomiCantieri.includes(salvato) ? salvato : nomiCantieri[0];

      const opzioni = nomiCantieri.map(nome => {
        const statoLabel = statoCantiere(nome) === "terminato" ? " (terminato)" : " (attivo)";
        return `<option value="${escapeAttribute(nome)}" ${nome === selezionato ? "selected" : ""}>${escapeHtml(nome + statoLabel)}</option>`;
      }).join("");

      const nomiCollaboratoriDettaglio = collaboratoriTutti();
      const opzioniCantieriDettaglio = nomiCantieri
        .map(nome => `<option value="${escapeAttribute(nome)}"></option>`)
        .join("");
      const opzioniCollaboratoriDettaglio = nomiCollaboratoriDettaglio
        .map(nome => `<option value="${escapeAttribute(nome)}"></option>`)
        .join("");
      const nomiLavorazioniDettaglio = normalizzaListaVoci([
        ...(vociMenu.lavori || []),
        ...righe.map(r => r.lavoro).filter(Boolean)
      ]);
      const opzioniLavorazioniDettaglio = nomiLavorazioniDettaglio
        .map(nome => `<option value="${escapeAttribute(nome)}"></option>`)
        .join("");
      const collaboratoreSalvato = localStorage.getItem("cantiere_dettaglio_collaboratore_ricerca") || "";
      const lavorazioneSalvata = localStorage.getItem("cantiere_dettaglio_lavorazione_ricerca") || "";

      window.__cantieriDettaglioNomi = nomiCantieri;
      window.__cantieriDettaglioCollaboratori = nomiCollaboratoriDettaglio;
      window.__cantieriDettaglioLavorazioni = nomiLavorazioniDettaglio;

      contenitore.innerHTML = `
        <h2 style="margin-top:0;">Ore per cantiere con dettaglio collaboratori, date e lavorazioni</h2>
        <div class="cantiere-picker dettaglio-ricerca-rapida">
          <label for="cercaCantiereDettaglio">Cerca cantiere</label>
          <input id="cercaCantiereDettaglio" list="listaCantieriCantiereDettaglio" autocomplete="off" inputmode="search" placeholder="Scrivi il nome del cantiere" value="${escapeAttribute(selezionato)}" oninput="mostraSuggerimentiCantiereDettaglio(); sincronizzaCantiereDettaglioDaRicerca()" onfocus="mostraSuggerimentiCantiereDettaglio()" onclick="mostraSuggerimentiCantiereDettaglio()" />
          <datalist id="listaCantieriCantiereDettaglio">${opzioniCantieriDettaglio}</datalist>
          <div id="suggerimentiCantiereDettaglio" class="suggerimenti-ricerca"></div>

          <label for="selectCantiereDettaglio">Oppure scegli dal menu</label>
          <select id="selectCantiereDettaglio" onchange="sincronizzaRicercaCantiereDettaglio(); renderCantiereSelezionato()">
            ${opzioni}
          </select>

          <label for="cercaCollaboratoreCantiere">Cerca collaboratore</label>
          <input id="cercaCollaboratoreCantiere" list="listaCollaboratoriCantiereDettaglio" autocomplete="off" inputmode="search" placeholder="Scrivi il nome o lascia vuoto per tutti" value="${escapeAttribute(collaboratoreSalvato)}" oninput="mostraSuggerimentiCollaboratoreCantiere(); renderCantiereSelezionato()" onfocus="mostraSuggerimentiCollaboratoreCantiere()" onclick="mostraSuggerimentiCollaboratoreCantiere()" />
          <datalist id="listaCollaboratoriCantiereDettaglio">${opzioniCollaboratoriDettaglio}</datalist>
          <div id="suggerimentiCollaboratoreCantiere" class="suggerimenti-ricerca"></div>

          <label for="cercaLavorazioneCantiere">Cerca lavorazione fatta nel cantiere</label>
          <input id="cercaLavorazioneCantiere" list="listaLavorazioniCantiereDettaglio" autocomplete="off" inputmode="search" placeholder="Es. rasatura, montaggio lastre..." value="${escapeAttribute(lavorazioneSalvata)}" oninput="mostraSuggerimentiLavorazioneCantiere(); renderCantiereSelezionato()" onfocus="mostraSuggerimentiLavorazioneCantiere()" onclick="mostraSuggerimentiLavorazioneCantiere()" />
          <datalist id="listaLavorazioniCantiereDettaglio">${opzioniLavorazioniDettaglio}</datalist>
          <div id="suggerimentiLavorazioneCantiere" class="suggerimenti-ricerca"></div>

          <div class="ricerca-rapida-actions">
            <button type="button" class="secondary small" onclick="pulisciFiltriCantiereDettaglio()">Pulisci ricerche</button>
          </div>

          <p class="note">Ora puoi cercare rapidamente cantiere, collaboratore e lavorazione. Lascia vuoti collaboratore o lavorazione per vedere tutto il cantiere.</p>
        </div>
        <div id="cantiereDettaglioSelezionato"></div>
      `;

      renderCantiereSelezionato();
    }


    function mostraSuggerimentiCantiereDettaglio() {
      const testo = document.getElementById("cercaCantiereDettaglio")?.value || "";
      const valori = filtraVociRicerca(window.__cantieriDettaglioNomi || [], testo);
      renderSuggerimentiRicerca("suggerimentiCantiereDettaglio", valori, "scegliSuggerimentoCantiereDettaglio");
    }

    function mostraSuggerimentiCollaboratoreCantiere() {
      const testo = document.getElementById("cercaCollaboratoreCantiere")?.value || "";
      const valori = filtraVociRicerca(window.__cantieriDettaglioCollaboratori || [], testo);
      renderSuggerimentiRicerca("suggerimentiCollaboratoreCantiere", valori, "scegliSuggerimentoCollaboratoreCantiere");
    }

    function mostraSuggerimentiLavorazioneCantiere() {
      const testo = document.getElementById("cercaLavorazioneCantiere")?.value || "";
      const valori = filtraVociRicerca(window.__cantieriDettaglioLavorazioni || [], testo);
      renderSuggerimentiRicerca("suggerimentiLavorazioneCantiere", valori, "scegliSuggerimentoLavorazioneCantiere");
    }

    function nascondiSuggerimentiCantiereDettaglio() {
      document.getElementById("suggerimentiCantiereDettaglio")?.classList.remove("aperto");
      document.getElementById("suggerimentiCollaboratoreCantiere")?.classList.remove("aperto");
      document.getElementById("suggerimentiLavorazioneCantiere")?.classList.remove("aperto");
    }

    function sincronizzaCantiereDettaglioDaRicerca() {
      const input = document.getElementById("cercaCantiereDettaglio");
      const select = document.getElementById("selectCantiereDettaglio");
      if (!input || !select) return;
      const cercato = testoPulito(input.value);
      const trovato = (window.__cantieriDettaglioNomi || []).find(nome => chiaveRicerca(nome) === chiaveRicerca(cercato));
      if (trovato && select.value !== trovato) {
        select.value = trovato;
        renderCantiereSelezionato();
      }
    }

    function sincronizzaRicercaCantiereDettaglio() {
      const input = document.getElementById("cercaCantiereDettaglio");
      const select = document.getElementById("selectCantiereDettaglio");
      if (input && select) input.value = select.value || "";
    }

    function scegliSuggerimentoCantiereDettaglio(cantiere) {
      const input = document.getElementById("cercaCantiereDettaglio");
      const select = document.getElementById("selectCantiereDettaglio");
      if (input) input.value = cantiere;
      if (select) select.value = cantiere;
      localStorage.setItem("cantiere_dettaglio_selezionato", cantiere || "");
      nascondiSuggerimentiCantiereDettaglio();
      renderCantiereSelezionato();
    }

    function scegliSuggerimentoCollaboratoreCantiere(collaboratore) {
      const input = document.getElementById("cercaCollaboratoreCantiere");
      if (input) input.value = collaboratore;
      localStorage.setItem("cantiere_dettaglio_collaboratore_ricerca", collaboratore || "");
      nascondiSuggerimentiCantiereDettaglio();
      renderCantiereSelezionato();
    }

    function scegliSuggerimentoLavorazioneCantiere(lavorazione) {
      const input = document.getElementById("cercaLavorazioneCantiere");
      if (input) input.value = lavorazione;
      localStorage.setItem("cantiere_dettaglio_lavorazione_ricerca", lavorazione || "");
      nascondiSuggerimentiCantiereDettaglio();
      renderCantiereSelezionato();
    }

    function pulisciFiltriCantiereDettaglio() {
      const collaboratore = document.getElementById("cercaCollaboratoreCantiere");
      const lavorazione = document.getElementById("cercaLavorazioneCantiere");
      if (collaboratore) collaboratore.value = "";
      if (lavorazione) lavorazione.value = "";
      localStorage.removeItem("cantiere_dettaglio_collaboratore_ricerca");
      localStorage.removeItem("cantiere_dettaglio_lavorazione_ricerca");
      nascondiSuggerimentiCantiereDettaglio();
      renderCantiereSelezionato();
    }

    function renderCantiereSelezionato() {
      const select = document.getElementById("selectCantiereDettaglio");
      const contenitore = document.getElementById("cantiereDettaglioSelezionato");
      const cantieri = window.__cantieriDettaglio || {};
      if (!select || !contenitore) return;

      const nomeCantiere = select.value;
      const filtroLavorazione = (document.getElementById("cercaLavorazioneCantiere")?.value || "").trim().toLowerCase();
      const filtroCollaboratore = (document.getElementById("cercaCollaboratoreCantiere")?.value || "").trim().toLocaleLowerCase("it-CH");
      localStorage.setItem("cantiere_dettaglio_selezionato", nomeCantiere);
      localStorage.setItem("cantiere_dettaglio_collaboratore_ricerca", document.getElementById("cercaCollaboratoreCantiere")?.value || "");
      localStorage.setItem("cantiere_dettaglio_lavorazione_ricerca", document.getElementById("cercaLavorazioneCantiere")?.value || "");
      sincronizzaRicercaCantiereDettaglio();
      const dati = cantieri[nomeCantiere] || { totaleOre: 0, totaleTrasferte: 0, collaboratori: {} };

      const collaboratoriOrdinati = Object.entries(dati.collaboratori)
        .filter(([nome]) => !filtroCollaboratore || String(nome || "").toLocaleLowerCase("it-CH").includes(filtroCollaboratore))
        .map(([nome, datiCollaboratore]) => {
          const dettagliFiltrati = (datiCollaboratore.dettagli || []).filter(d => {
            if (!filtroLavorazione) return true;
            return String(d.lavoro || "").toLowerCase().includes(filtroLavorazione);
          });
          const oreFiltrate = dettagliFiltrati.reduce((tot, d) => tot + Number(d.ore || 0), 0);
          const trasferteFiltrate = dettagliFiltrati.reduce((tot, d) => tot + fasciaKm(Number(d.km || 0)).importo, 0);
          return [nome, { ...datiCollaboratore, dettagliFiltrati, oreFiltrate, trasferteFiltrate, giornateFiltrate: dettagliFiltrati.length }];
        })
        .filter(([, datiCollaboratore]) => datiCollaboratore.giornateFiltrate > 0)
        .sort(([a], [b]) => a.localeCompare(b));

      const righeCollaboratori = collaboratoriOrdinati
        .map(([nomeCollaboratore, datiCollaboratore]) => `
          <tr>
            <td>${escapeHtml(nomeCollaboratore)}</td>
            <td class="ore-evidenza">${datiCollaboratore.oreFiltrate.toFixed(2)}</td>
            <td>${datiCollaboratore.giornateFiltrate}</td>
          </tr>
        `).join("");

      const dettagliCollaboratori = collaboratoriOrdinati
        .map(([nomeCollaboratore, datiCollaboratore]) => {
          const righeDettaglio = datiCollaboratore.dettagliFiltrati
            .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")))
            .map(dettaglio => `
              <tr>
                <td>${fmtData(dettaglio.data)}</td>
                <td>${escapeHtml(formattaOrarioLavoro(dettaglio))}</td>
                <td class="lavorazione-testo">${escapeHtml(dettaglio.lavoro || "")}</td>
                <td>${escapeHtml(dettaglio.nota || "")}</td>
                <td>${Number(dettaglio.km || 0).toFixed(1)}</td>
                <td>${Number(dettaglio.km || 0) <= 10 ? '<span class="avs-badge si">Sì</span>' : '<span class="avs-badge no">No</span>'}</td>
                <td class="ore-evidenza">${Number(dettaglio.ore || 0).toFixed(2)}</td>
              </tr>
            `).join("");

          return `
            <div class="collab-detail">
              <h4>${escapeHtml(nomeCollaboratore)} — Totale visualizzato: ${datiCollaboratore.oreFiltrate.toFixed(2)} ore</h4>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Inizio / pausa / fine lavoro</th>
                    <th>Tipo di lavorazione</th>
                    <th>Nota</th>
                    <th>Km</th>
                    <th>AVS</th>
                    <th>Ore</th>
                  </tr>
                </thead>
                <tbody>
                  ${righeDettaglio}
                </tbody>
              </table>
            </div>
          `;
        }).join("");

      const messaggioFiltroVuoto = collaboratoriOrdinati.length === 0
        ? '<p class="note">Nessuna lavorazione trovata per questo filtro nel cantiere selezionato.</p>'
        : "";

      const totaleOreVisualizzato = collaboratoriOrdinati.reduce((tot, [, dc]) => tot + dc.oreFiltrate, 0);

      contenitore.innerHTML = `
        <div class="cantiere-detail">
          <h3>Cantiere: ${escapeHtml(nomeCantiere)} — ${statoCantiere(nomeCantiere) === "terminato" ? "terminato" : "attivo"}</h3>
          <div class="cantiere-totale">
            Totale visualizzato: ${totaleOreVisualizzato.toFixed(2)} ore ${filtroLavorazione ? `— Filtro lavorazione: ${escapeHtml(filtroLavorazione)}` : ""}
          </div>
          ${messaggioFiltroVuoto}
          <table>
            <thead>
              <tr>
                <th>Collaboratore</th>
                <th>Ore nel cantiere</th>
                <th>Giornate inserite</th>
              </tr>
            </thead>
            <tbody>
              ${righeCollaboratori}
            </tbody>
          </table>
          ${dettagliCollaboratori}
        </div>
      `;
    }

    function renderTabella(righe) {
      const contenitore = document.getElementById("tabellaOre");
      if (!contenitore) return;

      if (!righe.length) {
        contenitore.innerHTML = "<p class='note'>Nessuna registrazione per il filtro selezionato.</p>";
        return;
      }

      const righeOrdinate = [...righe].sort((a, b) =>
        String(a.data || "").localeCompare(String(b.data || "")) ||
        String(a.collaboratore || "").localeCompare(String(b.collaboratore || "")) ||
        String(a.cantiere || "").localeCompare(String(b.cantiere || ""))
      );

      const corpo = righeOrdinate.map(riga => {
        const id = escapeAttribute(riga.id || "");
        return `
          <tr>
            <td>${fmtData(riga.data || "")}</td>
            <td>${escapeHtml(riga.collaboratore || "")}</td>
            <td>${escapeHtml(riga.cantiere || "")}</td>
            <td>${escapeHtml(formattaOrarioLavoro(riga))}</td>
            <td class="ore-evidenza">${Number(riga.totaleOre || 0).toFixed(2)}</td>
            <td>${escapeHtml(riga.lavoro || "")}</td>
            <td>${escapeHtml(riga.nota || "")}</td>
            <td style="white-space:nowrap;">
              <button type="button" class="secondary small" data-id="${id}" onclick="modifica(this.dataset.id)">Modifica</button>
              <button type="button" class="danger small" data-id="${id}" onclick="elimina(this.dataset.id)">Elimina ore</button>
            </td>
          </tr>
        `;
      }).join("");

      contenitore.innerHTML = `
        <div class="ricerca-resoconto-tabella no-print">
          <input id="ricercaVeloceTabellaResoconto" type="search" autocomplete="off" placeholder="Ricerca veloce nella tabella: collaboratore, cantiere, lavoro, nota..." oninput="filtraTabellaResocontoOre()" />
        </div>
        <div class="calendar-scroll">
          <table class="admin-table" id="tabellaResocontoOreAdmin">
            <thead>
              <tr>
                <th>Data</th>
                <th>Collaboratore</th>
                <th>Cantiere</th>
                <th>Inizio / pausa / fine lavoro</th>
                <th>Ore</th>
                <th>Lavoro</th>
                <th>Nota</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>${corpo}</tbody>
          </table>
        </div>
      `;
    }

    function giorniPeriodo(dal, al, righe) {
      let start = dal;
      let end = al;

      if (!start && righe.length) start = righe.map(r => r.data).filter(Boolean).sort()[0];
      if (!end && righe.length) end = righe.map(r => r.data).filter(Boolean).sort().slice(-1)[0];
      if (!start || !end) return [];
      if (start > end) [start, end] = [end, start];

      const giorni = [];
      const dataCorrente = new Date(start + "T00:00:00");
      const dataFine = new Date(end + "T00:00:00");
      while (dataCorrente <= dataFine) {
        giorni.push(formattaDataLocale(dataCorrente));
        dataCorrente.setDate(dataCorrente.getDate() + 1);
      }
      return giorni;
    }

    function renderTitoloStampa() {
      const collaboratore = val("filtroCollaboratore") || "Tutti i collaboratori";
      const dal = val("filtroDal") || "inizio";
      const al = val("filtroAl") || "fine";
      const periodo = `${dal} / ${al}`;
      document.getElementById("stampaTitolo").innerHTML = `
        <h1>Foglio ore</h1>
        <p><strong>Collaboratore:</strong> ${escapeHtml(collaboratore)}</p>
        <p><strong>Periodo:</strong> ${escapeHtml(periodo)}</p>
        <p><strong>AVS:</strong> Sì entro 10 km; No dopo 10 km.</p>
      `;
    }

    function modifica(id) {
      const r = ore.find(x => x.id === id);
      if (!r) return;
      editId = id;
      document.getElementById("collaboratore").value = r.collaboratore || "";
      document.getElementById("data").value = r.data || "";
      document.getElementById("cantiere").value = r.cantiere || "";
      document.getElementById("inizio").value = r.inizio || "07:30";
      document.getElementById("fine").value = r.fine || "17:00";
      document.getElementById("pausa").value = r.pausa || "1";
      document.getElementById("oreManuali").value = r.oreManuali ?? "";
      aggiornaAnteprimaOre();
      document.getElementById("lavoro").value = r.lavoro || "";
      const notaInput = document.getElementById("nota");
      if (notaInput) notaInput.value = r.nota || "";
      document.getElementById("km").value = r.km || "0";
      document.getElementById("importoTrasferta").value = r.importoTrasferta || "30";
      aggiornaRegolaTrasferta();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function elimina(id) {
      if (!utenteCorrenteEAmministratore()) {
        alert("Solo l’amministratore può eliminare le ore.");
        return;
      }
      if (!id) return;
      const riga = ore.find(x => x.id === id);
      const descrizione = riga
        ? `${fmtData(riga.data || "")} - ${riga.collaboratore || ""} - ${riga.cantiere || ""} - ${Number(riga.totaleOre || 0).toFixed(2)} ore`
        : "questa registrazione";
      if (!confirm(`Eliminare definitivamente le ore?

${descrizione}`)) return;
      ore = ore.filter(x => x.id !== id);
      salvaStorage();
      renderizza();
    }

    function cancellaTutto() {
      if (!confirm("Vuoi cancellare tutto lo storico salvato?")) return;
      ore = [];
      salvaStorage();
      renderizza();
    }

    function esportaBackupDati() {
      const backup = {
        versione: "tracciamento_ore_collaboratori_v2",
        esportatoIl: new Date().toISOString(),
        ore,
        vociMenu,
        datiAmministratore
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_ore_collaboratori_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function importaBackupDati(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const backup = JSON.parse(e.target.result);
          if (!backup || !Array.isArray(backup.ore)) {
            alert("Il file selezionato non sembra un backup valido.");
            return;
          }

          const sostituisci = confirm("Vuoi sostituire i dati attuali con il backup? Premi Annulla per aggiungerli a quelli esistenti.");
          if (sostituisci) {
            ore = backup.ore;
          } else {
            const idsEsistenti = new Set(ore.map(r => r.id));
            backup.ore.forEach(riga => {
              if (!riga.id || idsEsistenti.has(riga.id)) riga.id = creaId();
              ore.push(riga);
            });
          }

          if (backup.vociMenu && typeof backup.vociMenu === "object") {
            vociMenu = {
              collaboratori: Array.from(new Set([...(vociMenu.collaboratori || []), ...(backup.vociMenu.collaboratori || [])])).sort(),
              operaiDettagli: { ...(vociMenu.operaiDettagli || {}), ...(backup.vociMenu.operaiDettagli || {}) },
              collaboratoreStato: { ...(vociMenu.collaboratoreStato || {}), ...(backup.vociMenu.collaboratoreStato || {}) },
              cantieri: Array.from(new Set([...(vociMenu.cantieri || []), ...(backup.vociMenu.cantieri || [])])).sort(),
              cantieriKm: { ...(vociMenu.cantieriKm || {}), ...(backup.vociMenu.cantieriKm || {}) },
              cantiereZone: { ...(vociMenu.cantiereZone || {}), ...(backup.vociMenu.cantiereZone || {}) },
              cantiereStato: { ...(vociMenu.cantiereStato || {}), ...(backup.vociMenu.cantiereStato || {}) },
              lavori: Array.from(new Set([...(vociMenu.lavori || []), ...(backup.vociMenu.lavori || [])])).sort()
            };
          }

          if (backup.datiAmministratore && typeof backup.datiAmministratore === "object") {
            datiAmministratore = backup.datiAmministratore;
            salvaDatiAmministratoreStorage();
            renderTabellaAmministratore();
            renderRegoleOrariAmministratore();
            applicaDatiAmministratoreAlMese(false);
          }

          aggiornaVociDaStorico();
          salvaStorage();
          salvaVociMenu();
          renderizza();
          alert("Backup importato correttamente.");
        } catch (errore) {
          console.error(errore);
          alert("Errore durante l'importazione del backup.");
        } finally {
          event.target.value = "";
        }
      };
      reader.readAsText(file);
    }

    function stampaMensile() {
      renderizza();
      window.print();
    }

    function dateVacanzaAmministratorePerPeriodo(dal, al) {
      const anno = dal && /^\d{4}-\d{2}-\d{2}$/.test(dal) ? Number(dal.slice(0, 4)) : annoDaFiltroFoglioMensile();
      const date = new Set();
      const mesi = datiAmministratore.mesi || {};
      Object.entries(mesi).forEach(([mese, dati]) => {
        const testo = String(dati.vacanzeDettaglio || "").trim();
        if (!testo) return;
        testo.split(/[\s,;]+/).forEach(parte => {
          if (!parte) return;
          let data = "";
          if (/^\d{4}-\d{2}-\d{2}$/.test(parte)) {
            data = parte;
          } else if (/^\d{1,2}\.\d{1,2}(?:\.\d{4})?$/.test(parte)) {
            const pezzi = parte.split(".");
            const giorno = String(Number(pezzi[0])).padStart(2, "0");
            const meseParte = String(Number(pezzi[1])).padStart(2, "0");
            const annoParte = pezzi[2] ? Number(pezzi[2]) : anno;
            data = `${annoParte}-${meseParte}-${giorno}`;
          } else if (/^\d{1,2}$/.test(parte)) {
            const giorno = String(Number(parte)).padStart(2, "0");
            data = `${anno}-${mese}-${giorno}`;
          }
          if (data && (!dal || data >= dal) && (!al || data <= al)) date.add(data);
        });
      });
      return date;
    }

    function dateFestiviTicinoPerPeriodo(dal, al) {
      const anni = new Set();
      if (dal && /^\d{4}-\d{2}-\d{2}$/.test(dal)) anni.add(Number(dal.slice(0, 4)));
      if (al && /^\d{4}-\d{2}-\d{2}$/.test(al)) anni.add(Number(al.slice(0, 4)));
      if (!anni.size) anni.add(annoDaFiltroFoglioMensile());
      const date = new Set();
      anni.forEach(anno => {
        festiviTicinoPerAnno(anno).forEach(festivo => {
          if ((!dal || festivo.data >= dal) && (!al || festivo.data <= al)) date.add(festivo.data);
        });
      });
      return date;
    }

    function creaTabellaCollaboratoreGiorniOrizzontali(righe, dal, al) {
      const giorni = giorniPeriodo(dal, al, righe);
      const giorniFestiviCalendario = dateFestiviTicinoPerPeriodo(dal, al);
      const giorniVacanzaCalendario = dateVacanzaAmministratorePerPeriodo(dal, al);
      const collaboratoreCalendario = collabAppNomePerCalendario(righe);
      collabAppDateVacanzeApprovate(collaboratoreCalendario, dal, al).forEach(data => giorniVacanzaCalendario.add(data));
      const cantieri = {};
      const totaliGiorno = {};
      const trasferteGiorno = {};
      const avsSiGiorno = {};
      const avsNoGiorno = {};

      giorni.forEach(g => {
        totaliGiorno[g] = 0;
        trasferteGiorno[g] = 0;
        avsSiGiorno[g] = 0;
        avsNoGiorno[g] = 0;
      });

      righe.forEach(r => {
        const cantiere = r.cantiere || "Senza cantiere";
        const data = r.data || "";
        const oreRiga = Number(r.totaleOre || 0);
        const km = Number(r.km || 0);
        const importoTrasferta = fasciaKm(km).importo;

        if (!cantieri[cantiere]) {
          cantieri[cantiere] = {
            totaleOre: 0,
            totaleTrasferte: 0,
            giorniCantiere: 0,
            giorniAVSSi: 0,
            giorniAVSNo: 0,
            giorni: {}
          };
        }

        if (!cantieri[cantiere].giorni[data]) {
          cantieri[cantiere].giorni[data] = {
            ore: 0,
            trasferta: 0,
            km,
            avs: km <= 10 ? "Sì" : "No"
          };
        }

        cantieri[cantiere].giorni[data].ore += oreRiga;
        cantieri[cantiere].giorni[data].trasferta += importoTrasferta;
        cantieri[cantiere].totaleOre += oreRiga;
        cantieri[cantiere].totaleTrasferte += importoTrasferta;
        cantieri[cantiere].giorniCantiere += 1;

        if (km <= 10) cantieri[cantiere].giorniAVSSi += 1;
        else cantieri[cantiere].giorniAVSNo += 1;

        if (totaliGiorno[data] !== undefined) totaliGiorno[data] += oreRiga;
        if (trasferteGiorno[data] !== undefined) trasferteGiorno[data] += importoTrasferta;
        if (avsSiGiorno[data] !== undefined && km <= 10) avsSiGiorno[data] += 1;
        if (avsNoGiorno[data] !== undefined && km > 10) avsNoGiorno[data] += 1;
      });

      const intestazioneGiorni = giorni.map(giorno => {
        const d = new Date(giorno + "T00:00:00");
        const n = d.getDay();
        const isVacanza = giorniVacanzaCalendario.has(giorno);
        const cls = isVacanza ? "vacanza" : (giorniFestiviCalendario.has(giorno) || n === 0 ? "domenica festivo" : (n === 6 ? "sabato" : ""));
        const titolo = isVacanza ? ' title="Vacanza"' : (giorniFestiviCalendario.has(giorno) ? ' title="Giorno festivo Ticino"' : "");
        const labelVacanza = '';
        return `<th class="${cls}"${titolo}>${d.getDate()}${labelVacanza}</th>`;
      }).join("");

      const rigaOrariRegola = giorni.map(giorno => {
        const d = new Date(giorno + "T00:00:00");
        const n = d.getDay();
        const isVacanza = giorniVacanzaCalendario.has(giorno);
        const cls = isVacanza ? "vacanza" : (giorniFestiviCalendario.has(giorno) || n === 0 ? "domenica festivo" : (n === 6 ? "sabato" : ""));
        const testo = isVacanza ? '' : testoRegolaOrarioCalendario(giorno, giorniFestiviCalendario, giorniVacanzaCalendario);
        const regola = regolaOrarioPerGiorno(giorno);
        const title = isVacanza ? ' title="Vacanza approvata"' : (regola ? ` title="Regola: ${escapeAttribute(regola.inizio)} - pausa ${escapeAttribute(formattaPausaBreve(regola.pausa))} - ${escapeAttribute(regola.fine)}${regola.nota ? ' / ' + escapeAttribute(regola.nota) : ''}"` : "");
        const classeOrario = testo ? "con-orario" : "senza-orario";
        return `<th class="orario-regola ${classeOrario} ${cls}"${title}>${escapeHtml(testo)}</th>`;
      }).join("");

      const rigaTotaliGiorno = giorni.map(giorno => {
        const d = new Date(giorno + "T00:00:00");
        const n = d.getDay();
        const isVacanza = giorniVacanzaCalendario.has(giorno);
        const cls = isVacanza ? "vacanza" : (giorniFestiviCalendario.has(giorno) || n === 0 ? "domenica festivo" : (n === 6 ? "sabato" : ""));
        const valore = Number(totaliGiorno[giorno] || 0);
        const contenuto = valore ? valore.toFixed(2).replace(".00", "") : "";
        return `<td class="numero totale ${cls}">${contenuto}</td>`;
      }).join("");

      const totalePeriodo = righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0);
      const totaleTrasfertePeriodo = righe.reduce((tot, r) => tot + fasciaKm(Number(r.km || 0)).importo, 0);
      const totaleGiorniCantiere = righe.length;
      const totaleAVSSi = righe.filter(r => Number(r.km || 0) <= 10).length;
      const totaleAVSNo = righe.filter(r => Number(r.km || 0) > 10).length;
      const testoPeriodoCalendario = `${dal ? fmtData(dal) : "inizio"} - ${al ? fmtData(al) : "fine"}`;
      const notaOrariCalendario = `Periodo conteggiato: ${escapeHtml(testoPeriodoCalendario)}.`;
      const riepilogoRegoleOrari = testoRegoleOrariNelPeriodo(dal, al);

      const corpo = Object.entries(cantieri)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([nomeCantiere, dati]) => {
          const celle = giorni.map(giorno => {
            const d = new Date(giorno + "T00:00:00");
            const n = d.getDay();
            const isVacanza = giorniVacanzaCalendario.has(giorno);
            const cls = isVacanza ? "vacanza" : (giorniFestiviCalendario.has(giorno) || n === 0 ? "domenica festivo" : (n === 6 ? "sabato" : ""));
            const info = dati.giorni[giorno];
            if (!info) return `<td class="${cls}"></td>`;
            const ore = Number(info.ore || 0);
            const contenuto = ore ? ore.toFixed(2).replace(".00", "") : "";
            return `<td class="numero ${cls}">${contenuto}</td>`;
          }).join("");

          return `
            <tr>
              <td class="cantiere-col">${escapeHtml(nomeCantiere)}</td>
              ${celle}
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `;
        }).join("");

      return `
        <p class="muted">Colori calendario: rosso = domenica o giorno festivo Ticino; verde = vacanza approvata o scelta in Amministratore. ${notaOrariCalendario}</p>
        <div class="regola-orario-riepilogo"><strong>Regola orario applicata:</strong> ${escapeHtml(riepilogoRegoleOrari)}</div>
        <div class="scroll-x">
          <table class="tabella-orizzontale">
            <thead>
              <tr class="riga-orari-regola">
                <th class="cantiere-col">Orario regola</th>
                ${rigaOrariRegola}
                <th colspan="4"></th>
              </tr>
              <tr>
                <th class="cantiere-col">Cantiere</th>
                ${intestazioneGiorni}
                <th>Totale ore</th>
                <th>Giorni</th>
                <th>Trasferte</th>
                <th>AVS</th>
              </tr>
              <tr class="totali-cumulati">
                <td class="totale cantiere-col">Totali cumulati</td>
                ${rigaTotaliGiorno}
                <td class="numero totale">${totalePeriodo.toFixed(2)}</td>
                <td class="numero totale">${totaleGiorniCantiere}</td>
                <td class="numero totale">CHF ${totaleTrasfertePeriodo.toFixed(2)}</td>
                <td class="totale">Sì: ${totaleAVSSi}<br>No: ${totaleAVSNo}</td>
              </tr>
            </thead>
            <tbody>
              ${corpo}
            </tbody>
          </table>
        </div>
      `;
    }

    function creaRiepilogoFasceTrasfertaCollaboratore(righe) {
      const fasce = {
        "0 - 30 km": { nome: "0 - 30 km", importo: 15, giorni: 0, totale: 0 },
        "31 - 40 km": { nome: "31 - 40 km", importo: 20, giorni: 0, totale: 0 },
        "41 - 60 km": { nome: "41 - 60 km", importo: 27, giorni: 0, totale: 0 },
        "oltre 60 km": { nome: "oltre 60 km", importo: 37, giorni: 0, totale: 0 }
      };

      righe.forEach(r => {
        const fascia = fasciaKm(Number(r.km || 0));
        if (!fasce[fascia.nome]) {
          fasce[fascia.nome] = { nome: fascia.nome, importo: fascia.importo, giorni: 0, totale: 0 };
        }
        fasce[fascia.nome].giorni += 1;
        fasce[fascia.nome].totale += fascia.importo;
      });

      return Object.values(fasce);
    }

    function formattaPausaBreve(valore) {
      const numero = Number(valore || 0);
      if (Number.isInteger(numero)) return String(numero);
      return numero.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    }

    function formattaOrarioLavoro(riga) {
      const inizio = String(riga && riga.inizio ? riga.inizio : "");
      const fine = String(riga && riga.fine ? riga.fine : "");
      const pausa = formattaPausaBreve(riga && riga.pausa !== undefined ? riga.pausa : 0);
      if (!inizio && !fine) return `Pausa ${pausa}`;
      return `${inizio} - pausa ${pausa} - ${fine}`;
    }

    function scaricaCollaboratore() {
      const collaboratore = val("filtroCollaboratore");
      const dal = val("filtroDal");
      const al = val("filtroAl");

      if (!collaboratore) {
        alert("Seleziona prima un collaboratore nel filtro in alto.");
        return;
      }

      const righe = ore
        .filter(x => x.collaboratore === collaboratore)
        .filter(x => !dal || String(x.data || "") >= dal)
        .filter(x => !al || String(x.data || "") <= al)
        .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")) || String(a.cantiere || "").localeCompare(String(b.cantiere || "")));

      if (!righe.length) {
        alert("Non ci sono ore salvate per questo collaboratore nel mese selezionato.");
        return;
      }

      const totaleOre = righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0);
      const trasferteUniche = creaTrasferteUnichePerZona(righe);
      const totaleTrasferte = trasferteUniche.reduce((tot, r) => tot + r.importo, 0);
      const giorniAVSSi = trasferteUniche.filter(r => Number(r.km || 0) <= 10).length;
      const giorniAVSNo = trasferteUniche.filter(r => Number(r.km || 0) > 10).length;
      const riepilogoZoneTrasferta = creaRiepilogoZoneTrasferta(trasferteUniche);
      const riepilogoFasceTrasferta = creaRiepilogoFasceTrasfertaCollaboratore(righe);
      const oreDaLavorare = Number(val("oreDaLavorareMese") || 0);
      const giorniMalattia = Number(val("giorniMalattia") || 0);
      const giorniInfortunio = Number(val("giorniInfortunio") || 0);
      const giorniFestivi = Number(val("giorniFestivi") || 0);
      const giorniVacanza = Number(val("giorniVacanza") || 0);
      const differenzaOre = oreDaLavorare ? oreDaLavorare - totaleOre : null;

      const zoneByName = {};
      riepilogoZoneTrasferta.forEach(z => {
        zoneByName[z.zona] = z;
      });

      const righeFasceTrasferta = riepilogoFasceTrasferta.map(fascia => `
        <tr>
          <td>${escapeHtml(fascia.nome)}</td>
          <td>CHF ${Number(fascia.importo || 0).toFixed(2)} / giorno</td>
          <td><strong>${Number(fascia.giorni || 0)}</strong></td>
          <td><strong>CHF ${Number(fascia.totale || 0).toFixed(2)}</strong></td>
        </tr>
      `).join("");

      const totaleGiorniFasceTrasferta = riepilogoFasceTrasferta.reduce((tot, fascia) => tot + Number(fascia.giorni || 0), 0);
      const totaleCHFTrasferteFasce = riepilogoFasceTrasferta.reduce((tot, fascia) => tot + Number(fascia.totale || 0), 0);

      const perCantiere = {};
      righe.forEach(r => {
        const cantiere = r.cantiere || "Senza cantiere";
        if (!perCantiere[cantiere]) {
          const kmCantiere = Number(r.km || 0);
          const fascia = fasciaKm(kmCantiere);
          perCantiere[cantiere] = {
            ore: 0,
            giorni: 0,
            km: kmCantiere,
            zona: zonaTrasferta(cantiere),
            fascia: fascia.nome,
            importoGiorno: fascia.importo,
            totaleTrasferte: 0,
            giorniAVSSi: 0,
            giorniAVSNo: 0
          };
        }
        const fasciaRiga = fasciaKm(Number(r.km || 0));
        perCantiere[cantiere].ore += Number(r.totaleOre || 0);
        perCantiere[cantiere].giorni += 1;
        perCantiere[cantiere].km = Number(r.km || perCantiere[cantiere].km || 0);
        perCantiere[cantiere].fascia = fasciaKm(perCantiere[cantiere].km).nome;
        perCantiere[cantiere].importoGiorno = fasciaKm(perCantiere[cantiere].km).importo;
        perCantiere[cantiere].totaleTrasferte += fasciaRiga.importo;
        if (Number(r.km || 0) <= 10) perCantiere[cantiere].giorniAVSSi += 1;
        else perCantiere[cantiere].giorniAVSNo += 1;
      });

      const riepilogoCantieri = Object.entries(perCantiere)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cantiere, dati]) => {
          const datiZona = zoneByName[dati.zona || cantiere] || {
            giorni: dati.giorni,
            totale: dati.totaleTrasferte
          };

          return `
            <tr>
              <td>${escapeHtml(cantiere)}</td>
              <td>${escapeHtml(dati.zona || cantiere)}</td>
              <td>${Number(dati.km || 0).toFixed(1)}</td>
              <td>${dati.fascia}</td>
              <td>CHF ${Number(dati.importoGiorno || 0).toFixed(2)}</td>
              <td>${dati.giorni}</td>
              <td>${Number(datiZona.giorni || 0)}</td>
              <td>CHF ${Number(datiZona.totale || 0).toFixed(2)}</td>
              <td></td>
              <td><strong>${dati.ore.toFixed(2)}</strong></td>
            </tr>
          `;
        }).join("");

      const righeDettaglio = righe.map(r => `
        <tr>
          <td>${fmtData(r.data)}</td>
          <td>${escapeHtml(r.cantiere)}</td>
          <td>${escapeHtml(formattaOrarioLavoro(r))}</td>
          <td>${escapeHtml(r.lavoro || "")}</td>
          <td>${escapeHtml(r.nota || "")}</td>
          <td>${Number(r.km || 0).toFixed(1)}</td>
          <td>${Number(r.km || 0) <= 10 ? "Sì" : "No"}</td>
          <td>CHF ${fasciaKm(Number(r.km || 0)).importo.toFixed(2)}</td>
          <td><strong>${Number(r.totaleOre || 0).toFixed(2)}</strong></td>
        </tr>
      `).join("");

      const tabellaGiorniOrizzontali = creaTabellaCollaboratoreGiorniOrizzontali(righe, dal, al);

      const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Raccolta ore ${escapeHtml(collaboratore)} ${escapeHtml(dal || "")} ${escapeHtml(al || "")}</title>
  
</head>
<body>
  <div class="print"><button onclick="window.print()">Stampa questa raccolta</button></div>
  <h1>Raccolta ore collaboratore</h1>
  <div class="nome-collaboratore">${escapeHtml(collaboratore)}</div>
  <p class="muted"><strong>Periodo:</strong> ${escapeHtml(dal || "inizio")} / ${escapeHtml(al || "fine")}</p>

  <div class="totali">
    <div class="box">Ore totali<strong>${totaleOre.toFixed(2)}</strong></div>
    <div class="box">Trasferte totali<strong>CHF ${totaleTrasferte.toFixed(2)}</strong></div>
    <div class="box">Giorni AVS Sì<strong>${giorniAVSSi}</strong></div>
    <div class="box">Giorni AVS No<strong>${giorniAVSNo}</strong></div>
  </div>

  <h2>Situazione mese</h2>
  <div class="totali situazione-mese">
    <div class="box">Ore da lavorare<strong>${oreDaLavorare ? oreDaLavorare.toFixed(2) : "-"}</strong></div>
    <div class="box">Ore lavorate<strong>${totaleOre.toFixed(2)}</strong></div>
    <div class="box">Differenza ore<strong>${differenzaOre === null ? "-" : differenzaOre.toFixed(2)}</strong></div>
    <div class="box">Assenze<strong>Malattia: ${giorniMalattia}<br>Infortunio: ${giorniInfortunio}<br>Festivi: ${giorniFestivi}<br>Vacanza: ${giorniVacanza}</strong></div>
  </div>

  <h2>Rapporto ore collaboratore - giorni in orizzontale</h2>
  <p class="muted">I giorni sono in orizzontale; i cantieri sono in verticale. I totali cumulati, trasferte e AVS sono mostrati solo in fondo/alla fine della tabella. Sabato in azzurro, domenica in rosso chiaro.</p>
  ${tabellaGiorniOrizzontali}

  <h2>Dettaglio registrazioni con orari</h2>
  <p class="muted">Per ogni riga trovi inizio lavoro, pausa e fine lavoro nello stesso campo, ad esempio: 07:00 - pausa 1 - 16:00.</p>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Cantiere</th>
        <th>Inizio / pausa / fine lavoro</th>
        <th>Lavorazione</th>
        <th>Nota</th>
        <th>Km</th>
        <th>AVS</th>
        <th>Trasferta</th>
        <th>Ore</th>
      </tr>
    </thead>
    <tbody>
      ${righeDettaglio}
    </tbody>
  </table>

  <h2>Totale regole fasce zona</h2>
  <p class="muted">
    Qui vedi quanti giorni il dipendente ha fatto in ogni fascia di zona e il relativo totale.
    Regola fasce: 0-30 km = CHF 15/giorno; 31-40 km = CHF 20/giorno; 41-60 km = CHF 27/giorno; oltre 60 km = CHF 37/giorno.
  </p>
  <table>
    <thead>
      <tr>
        <th>Fascia zona</th>
        <th>Regola CHF/giorno</th>
        <th>Giorni fatti</th>
        <th>Totale CHF fascia</th>
      </tr>
    </thead>
    <tbody>
      ${righeFasceTrasferta}
      <tr>
        <td><strong>Totale fasce zona</strong></td>
        <td></td>
        <td><strong>${totaleGiorniFasceTrasferta}</strong></td>
        <td><strong>CHF ${totaleCHFTrasferteFasce.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const nomePulito = collaboratore.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
      a.href = url;
      a.download = `raccolta_ore_${nomePulito}_${dal || "inizio"}_${al || "fine"}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function creaTrasferteUnichePerZona(righe) {
      const mappa = {};
      righe.forEach(r => {
        const cantiere = r.cantiere || "Senza cantiere";
        const zona = zonaTrasferta(cantiere) || cantiere;
        const data = r.data || "senza-data";
        const chiave = `${data}||${zona}`;
        const km = Number(r.km || 0);
        const fascia = fasciaKm(km);
        if (!mappa[chiave]) {
          mappa[chiave] = {
            data,
            zona,
            km,
            fascia: fascia.nome,
            importo: fascia.importo,
            cantieri: new Set()
          };
        }
        mappa[chiave].cantieri.add(cantiere);
        if (km > Number(mappa[chiave].km || 0)) {
          const fasciaMax = fasciaKm(km);
          mappa[chiave].km = km;
          mappa[chiave].fascia = fasciaMax.nome;
          mappa[chiave].importo = fasciaMax.importo;
        }
      });

      return Object.values(mappa).map(item => ({
        ...item,
        cantieri: Array.from(item.cantieri).sort()
      }));
    }

    function creaRiepilogoZoneTrasferta(trasferteUniche) {
      const zone = {};
      trasferteUniche.forEach(t => {
        if (!zone[t.zona]) {
          zone[t.zona] = {
            zona: t.zona,
            km: t.km,
            fascia: t.fascia,
            importo: t.importo,
            giorni: 0,
            totale: 0,
            date: [],
            cantieri: new Set()
          };
        }
        zone[t.zona].giorni += 1;
        zone[t.zona].totale += Number(t.importo || 0);
        zone[t.zona].date.push(fmtData(t.data));
        t.cantieri.forEach(c => zone[t.zona].cantieri.add(c));
        if (Number(t.km || 0) > Number(zone[t.zona].km || 0)) {
          zone[t.zona].km = t.km;
          zone[t.zona].fascia = t.fascia;
          zone[t.zona].importo = t.importo;
        }
      });

      return Object.values(zone).map(z => ({
        ...z,
        cantieri: Array.from(z.cantieri).sort()
      })).sort((a, b) => a.zona.localeCompare(b.zona));
    }

    function creaRiepilogoFasceKm(righe) {
      const fasce = {
        "0 - 30 km": { fascia: "0 - 30 km", importo: 15, giorni: 0, totale: 0, date: [] },
        "31 - 40 km": { fascia: "31 - 40 km", importo: 20, giorni: 0, totale: 0, date: [] },
        "41 - 60 km": { fascia: "41 - 60 km", importo: 27, giorni: 0, totale: 0, date: [] },
        "oltre 60 km": { fascia: "oltre 60 km", importo: 37, giorni: 0, totale: 0, date: [] }
      };

      righe.forEach(r => {
        const fascia = fasciaKm(Number(r.km || 0));
        const item = fasce[fascia.nome];
        item.giorni += 1;
        item.totale += fascia.importo;
        item.date.push(fmtData(r.data));
      });

      return Object.values(fasce);
    }

    function esportaExcel() {
      const righe = righeFiltrate();
      if (!righe.length) {
        alert("Nessuna registrazione da esportare nel periodo selezionato.");
        return;
      }

      const collaboratore = val("filtroCollaboratore") || "Tutti i collaboratori";
      const dal = val("filtroDal") || "inizio";
      const al = val("filtroAl") || "fine";
      const giorni = giorniPeriodo(val("filtroDal"), val("filtroAl"), righe);

      const tabellaStorico = creaTabellaStoricoGiornalieroExcel(righe, giorni);
      const tabellaDettaglio = creaTabellaDettaglioRigheExcel(righe);
      const tabellaRiepilogo = creaTabellaRiepilogoExcel(righe);

      const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  
</head>
<body>
  <h1>Esportazione ore collaboratori</h1>
  <p><strong>Collaboratore:</strong> ${escapeHtml(collaboratore)}<br>
  <strong>Periodo:</strong> ${escapeHtml(dal)} / ${escapeHtml(al)}</p>

  <h2>Riepilogo periodo</h2>
  ${tabellaRiepilogo}

  <h2>Storico dettagliato giornaliero</h2>
  <p>Questa è la tabella giornaliera esportata come nel programma: giorni in orizzontale, cantieri/lavorazioni in verticale e totale a destra.</p>
  ${tabellaStorico}

  <h2>Dettaglio registrazioni</h2>
  ${tabellaDettaglio}
</body>
</html>`;

      const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ore_collaboratori_excel_${puliziaNomeFile(collaboratore)}_${dal}_${al}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function creaTabellaRiepilogoExcel(righe) {
      const oreTot = righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0);
      const trasferteTot = righe.reduce((tot, r) => tot + fasciaKm(Number(r.km || 0)).importo, 0);
      const giorniAVSSi = righe.filter(x => Number(x.km || 0) <= 10).length;
      const giorniAVSNo = righe.filter(x => Number(x.km || 0) > 10).length;

      return `
        <table>
          <thead>
            <tr>
              <th>Ore totali</th>
              <th>Trasferte totali CHF</th>
              <th>Giorni AVS Sì</th>
              <th>Giorni AVS No</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="numero totale">${oreTot.toFixed(2)}</td>
              <td class="numero totale">${trasferteTot.toFixed(2)}</td>
              <td class="numero">${giorniAVSSi}</td>
              <td class="numero">${giorniAVSNo}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    function creaTabellaStoricoGiornalieroExcel(righe, giorni) {
      const righeMatrice = {};
      const totaliGiorno = {};
      giorni.forEach(g => { totaliGiorno[g] = 0; });

      righe.forEach(r => {
        const cantiere = r.cantiere || "Senza cantiere";
        const lavoro = r.lavoro || "Senza lavorazione";
        const chiave = `${cantiere}||${lavoro}`;
        const data = r.data || "";
        const oreRiga = Number(r.totaleOre || 0);

        if (!righeMatrice[chiave]) {
          righeMatrice[chiave] = {
            cantiere,
            lavoro,
            totale: 0,
            giorni: {}
          };
        }

        righeMatrice[chiave].giorni[data] = (righeMatrice[chiave].giorni[data] || 0) + oreRiga;
        righeMatrice[chiave].totale += oreRiga;
        if (totaliGiorno[data] !== undefined) totaliGiorno[data] += oreRiga;
      });

      const intestazioneGiorni = giorni.map(giorno => {
        const d = new Date(giorno + "T00:00:00");
        const n = d.getDay();
        const cls = n === 0 ? "domenica" : (n === 6 ? "sabato" : "");
        return `<th class="${cls}">${d.getDate()}</th>`;
      }).join("");

      const rigaTotali = giorni.map(giorno => {
        const d = new Date(giorno + "T00:00:00");
        const n = d.getDay();
        const cls = n === 0 ? "domenica" : (n === 6 ? "sabato" : "");
        const valore = Number(totaliGiorno[giorno] || 0);
        return `<td class="numero totale ${cls}">${valore ? valore.toFixed(2) : ""}</td>`;
      }).join("");

      const totalePeriodo = righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0);

      const corpo = Object.values(righeMatrice)
        .sort((a, b) => a.cantiere.localeCompare(b.cantiere) || a.lavoro.localeCompare(b.lavoro))
        .map(item => {
          const celle = giorni.map(giorno => {
            const d = new Date(giorno + "T00:00:00");
            const n = d.getDay();
            const cls = n === 0 ? "domenica" : (n === 6 ? "sabato" : "");
            const valore = Number(item.giorni[giorno] || 0);
            return `<td class="numero ${cls}">${valore ? valore.toFixed(2) : ""}</td>`;
          }).join("");

          return `
            <tr>
              <td>${escapeHtml(item.cantiere)}</td>
              ${celle}
              <td class="numero totale">${item.totale.toFixed(2)}</td>
              <td>${escapeHtml(item.cantiere)} — ${escapeHtml(item.lavoro)}</td>
            </tr>
          `;
        }).join("");

      return `
        <table>
          <thead>
            <tr>
              <th>Cantiere</th>
              ${intestazioneGiorni}
              <th>Totale</th>
              <th>Dettaglio</th>
            </tr>
            <tr>
              <td class="totale">Totale giorno</td>
              ${rigaTotali}
              <td class="numero totale">${totalePeriodo.toFixed(2)}</td>
              <td>Ore totali nel periodo</td>
            </tr>
          </thead>
          <tbody>
            ${corpo}
          </tbody>
        </table>
      `;
    }

    function creaTabellaDettaglioRigheExcel(righe) {
      const righeHtml = righe
        .slice()
        .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")) || String(a.collaboratore || "").localeCompare(String(b.collaboratore || "")))
        .map(r => `
          <tr>
            <td>${escapeHtml(fmtData(r.data))}</td>
            <td>${escapeHtml(r.collaboratore || "")}</td>
            <td>${escapeHtml(r.cantiere || "")}</td>
            <td>${escapeHtml(formattaOrarioLavoro(r))}</td>
            <td>${escapeHtml(r.lavoro || "")}</td>
            <td>${escapeHtml(r.nota || "")}</td>
            <td class="numero">${Number(r.km || 0).toFixed(1)}</td>
            <td>${Number(r.km || 0) <= 10 ? "Sì" : "No"}</td>
            <td class="numero">${fasciaKm(Number(r.km || 0)).importo.toFixed(2)}</td>
            <td class="numero totale">${Number(r.totaleOre || 0).toFixed(2)}</td>
          </tr>
        `).join("");

      return `
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Collaboratore</th>
              <th>Cantiere</th>
              <th>Inizio / pausa / fine lavoro</th>
              <th>Lavorazione</th>
              <th>Nota</th>
              <th>Km</th>
              <th>AVS</th>
              <th>Trasferta CHF</th>
              <th>Ore</th>
            </tr>
          </thead>
          <tbody>
            ${righeHtml}
          </tbody>
        </table>
      `;
    }

    function puliziaNomeFile(nome) {
      return String(nome || "tutti").replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
    }

    function esportaCSV() {
      const righe = righeFiltrate();
      const intestazioni = ["Data", "Collaboratore", "Cantiere", "Inizio", "Fine", "Pausa", "Ore", "Lavoro", "Nota", "Km", "Trasferta CHF", "AVS Sì/No"];
      const dati = righe.map(r => [
        r.data,
        r.collaboratore,
        r.cantiere,
        r.inizio,
        r.fine,
        r.pausa,
        Number(r.totaleOre || 0).toFixed(2),
        r.lavoro,
        r.nota || "",
        r.km,
        fasciaKm(Number(r.km || 0)).importo.toFixed(2),
        Number(r.km || 0) <= 10 ? "Sì" : "No"
      ]);

      const csv = [intestazioni, ...dati]
        .map(row => row.map(campo => `"${String(campo ?? "").replaceAll('"', '""')}"`).join(";"))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ore_collaboratori_${val("filtroDal") || "inizio"}_${val("filtroAl") || "fine"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function fmtData(data) {
      if (!data) return "";
      const parti = String(data).split("-");
      if (parti.length !== 3) return escapeHtml(data);
      const [y, m, d] = parti;
      return `${d}.${m}.${y}`;
    }

    function escapeHtml(text) {
      return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function escapeAttribute(text) {
      return escapeHtml(text);
    }

    function eseguiTestBase() {
      console.assert(oreDaOrari("07:30", "17:00", 1) === 8.5, "Test ore giornaliere fallito");
      console.assert(oreDaOrari("22:00", "02:00", 0) === 4, "Test orario oltre mezzanotte fallito");
      console.assert(oreDaOrari("07:00", "12:00", 0.5) === 4.5, "Test pausa fallito");
      console.assert(giorniPeriodo("2026-05-01", "2026-05-03", []).length === 3, "Test giorni periodo fallito");
      console.assert(typeof renderTabella === "function", "Test matrice mensile fallito");
      console.assert(document.getElementById("oreDaLavorareMese") !== null, "Test situazione mese inputs fallito");
      console.assert(document.getElementById("filtroCollaboratore") !== null, "Test filtro collaboratore fallito");
      console.assert(document.getElementById("tabellaAmministratoreMesi") !== null, "Test sezione amministratore fallito");
      console.assert(document.getElementById("nota") !== null, "Test campo nota fallito");
      console.assert(document.getElementById("gestioneLavoriPanel") !== null, "Test gestione lavoro nascosta fallito");
      console.assert(typeof creaTrasferteUnichePerZona === "function", "Test trasferte zona fallito");
      console.assert(fasciaKm(35).importo === 20 && fasciaKm(61).importo === 37, "Test fascia km fallito");
      console.assert(typeof renderCantiereSelezionato === "function", "Test render dettaglio cantiere fallito");
      console.assert(typeof renderCollaboratoreSelezionato === "function", "Test render dettaglio collaboratore fallito");
      console.assert(typeof aggiungiOperaioManuale === "function", "Test aggiunta operaio con utenza fallito");
      console.assert(escapeHtml("A&B <test>") === "A&amp;B &lt;test&gt;", "Test escapeHtml fallito");
      console.assert(escapeAttribute("Cantiere 'Nord' & Sud").includes("&#039;"), "Test escapeAttribute fallito");
      aggiungiVoce("cantieri", " TEST CANTIERE RICERCA ", false);
      aggiungiVoce("lavori", " TEST LAVORAZIONE RICERCA ", false);
      console.assert(trovaVoceSalvata("cantieri", "test cantiere ricerca") === "TEST CANTIERE RICERCA", "Test ricerca cantiere salvato fallito");
      console.assert(trovaVoceSalvata("lavori", "test lavorazione ricerca") === "TEST LAVORAZIONE RICERCA", "Test ricerca lavorazione salvata fallito");
      vociMenu.cantieri = (vociMenu.cantieri || []).filter(x => x !== "TEST CANTIERE RICERCA");
      vociMenu.lavori = (vociMenu.lavori || []).filter(x => x !== "TEST LAVORAZIONE RICERCA");
      const kmPrima = vociMenu.cantieriKm ? vociMenu.cantieriKm["TEST_CANTIERE"] : undefined;
      salvaKmCantiere("TEST_CANTIERE", 12, false);
      console.assert(vociMenu.cantieriKm["TEST_CANTIERE"] === 12, "Test km cantiere fallito");
      if (kmPrima === undefined) delete vociMenu.cantieriKm["TEST_CANTIERE"];
      else vociMenu.cantieriKm["TEST_CANTIERE"] = kmPrima;
    }


    // === Collegamento Supabase - prima versione online senza cambiare struttura ===
    const SUPABASE_URL = "https://gstgigmfmhzebwcunayb.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bxCel0Lv-VmhgX_lxHBmsQ_lFExvFP4";
    const SUPABASE_AZIENDA_ID = "21af7afa-cbcb-45b9-9a84-f9f9ad68b7fd";
    let supabaseClient = null;
    let supabaseUtente = null;
    let supabaseProfilo = null;

    function inizializzaSupabase() {
      if (!window.supabase || !window.supabase.createClient) {
        console.warn("Libreria Supabase non caricata.");
        return null;
      }
      if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      }
      return supabaseClient;
    }

    function supabaseProfiloNomeCompleto() {
      if (!supabaseProfilo) return "";
      return [supabaseProfilo.nome || "", supabaseProfilo.cognome || ""].join(" " ).trim() || supabaseProfilo.nome || "";
    }

    function supabaseUtenteAdmin() {
      return String(supabaseProfilo?.ruolo || "").toLowerCase() === "admin";
    }

    function supabaseUtenteCollaboratore() {
      return !!supabaseProfilo && !supabaseUtenteAdmin();
    }

    function dataIsoOggi() {
      const oggi = new Date();
      const y = oggi.getFullYear();
      const m = String(oggi.getMonth() + 1).padStart(2, "0");
      const d = String(oggi.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    function applicaVistaRuoloSupabase() {
      const isCollaboratore = supabaseUtenteCollaboratore();
      const nome = supabaseProfiloNomeCompleto();
      document.body.classList.toggle("vista-collaboratore", isCollaboratore);

      const inputCollaboratore = document.getElementById("collaboratore");
      const filtroCollaboratore = document.getElementById("filtroCollaboratore");
      const dataInput = document.getElementById("data");
      const controlloGiorno = document.getElementById("controlloGiorno");
      const oggi = dataIsoOggi();

      if (isCollaboratore && nome) {
        if (inputCollaboratore) {
          inputCollaboratore.value = nome;
          inputCollaboratore.readOnly = true;
          inputCollaboratore.removeAttribute("list");
          inputCollaboratore.placeholder = "Collaboratore collegato";
        }
        if (filtroCollaboratore) {
          filtroCollaboratore.value = nome;
          filtroCollaboratore.disabled = true;
        }
        if (dataInput) {
          dataInput.value = oggi;
          dataInput.min = oggi;
          dataInput.max = oggi;
          dataInput.readOnly = true;
          dataInput.addEventListener("change", () => { dataInput.value = oggi; }, { once: false });
        }
        if (controlloGiorno) {
          controlloGiorno.value = oggi;
          controlloGiorno.min = oggi;
          controlloGiorno.max = oggi;
        }
        const toolbar = document.getElementById("toolbarFoglioMensile");
        if (toolbar) toolbar.classList.add("toolbar-collaboratore-bloccata");
      } else {
        if (inputCollaboratore) {
          inputCollaboratore.readOnly = false;
          inputCollaboratore.setAttribute("list", "listaCollaboratori");
          inputCollaboratore.placeholder = "Scrivi le prime lettere o scegli operaio";
        }
        if (filtroCollaboratore) filtroCollaboratore.disabled = false;
        if (dataInput) {
          dataInput.readOnly = false;
          dataInput.removeAttribute("min");
          dataInput.removeAttribute("max");
        }
        if (controlloGiorno) {
          controlloGiorno.removeAttribute("min");
          controlloGiorno.removeAttribute("max");
        }
      }
    }

    function supabaseStato(testo, errore = false) {
      const box = document.getElementById("supabaseStato");
      if (!box) return;
      box.textContent = testo;
      box.style.color = errore ? "#991b1b" : "#166534";
      box.style.fontWeight = "bold";
    }

    async function supabaseSessioneCorrente() {
      const client = inizializzaSupabase();
      if (!client) return null;
      const { data } = await client.auth.getSession();
      supabaseUtente = data && data.session ? data.session.user : null;
      return data ? data.session : null;
    }

    async function supabaseCaricaProfilo() {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente) return null;
      const { data, error } = await client
        .from("profili")
        .select("id, azienda_id, nome, cognome, ruolo, attivo")
        .eq("id", supabaseUtente.id)
        .single();
      if (error) {
        console.error(error);
        supabaseStato("Accesso riuscito, ma profilo non trovato.", true);
        return null;
      }
      supabaseProfilo = data;
      const ruoloPulito = data.ruolo === "admin" ? "admin" : "collaboratore";
      localStorage.setItem("ruolo_utente_corrente", ruoloPulito);
      localStorage.setItem("ruolo_utente_ore", ruoloPulito);
      applicaVistaRuoloSupabase();
      const nomeProfilo = [data.nome || "", data.cognome || ""].join(" ").trim();
      supabaseStato(`Collegato online come ${ruoloPulito}${nomeProfilo ? ": " + nomeProfilo : ""}.`);
      return data;
    }

    async function supabaseAccedi() {
      const client = inizializzaSupabase();
      if (!client) {
        alert("Supabase non è caricato. Controlla la connessione internet.");
        return;
      }
      const email = document.getElementById("supabaseEmail")?.value.trim();
      const password = document.getElementById("supabasePassword")?.value;
      if (!email || !password) {
        alert("Inserisci email e password.");
        return;
      }

      workhubSalvaPreferenzeAccesso();

      const ruoloSceltoLogin = String(localStorage.getItem("workhub_login_ruolo_visuale") || "admin").toLowerCase();
      supabaseStato("Accesso in corso...");

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        console.error(error);
        supabaseStato("Errore accesso: " + error.message, true);
        return;
      }

      supabaseUtente = data.user;
      const profilo = await supabaseCaricaProfilo();
      if (!profilo) {
        await client.auth.signOut();
        supabaseUtente = null;
        supabaseProfilo = null;
        localStorage.removeItem("ruolo_utente_corrente");
        localStorage.removeItem("ruolo_utente_ore");
        supabaseStato("Profilo non trovato. Accesso bloccato.", true);
        return;
      }

      const ruoloProfilo = String(profilo.ruolo || "").toLowerCase();
      const profiloAdmin = ruoloProfilo === "admin" || ruoloProfilo === "amministratore" || ruoloProfilo === "administrator";

      if (ruoloSceltoLogin === "admin" && !profiloAdmin) {
        await client.auth.signOut();
        supabaseUtente = null;
        supabaseProfilo = null;
        localStorage.removeItem("ruolo_utente_corrente");
        localStorage.removeItem("ruolo_utente_ore");
        applicaVistaRuoloSupabase();
        supabaseStato("Accesso negato: questo bottone è solo per Admin.", true);
        alert("Accesso negato. Il bottone Admin è riservato solo all'amministratore.");
        return;
      }

      if (ruoloSceltoLogin === "dipendente" && profiloAdmin) {
        await client.auth.signOut();
        supabaseUtente = null;
        supabaseProfilo = null;
        localStorage.removeItem("ruolo_utente_corrente");
        localStorage.removeItem("ruolo_utente_ore");
        applicaVistaRuoloSupabase();
        supabaseStato("Accesso negato: usa il bottone Admin.", true);
        alert("Questo account è Admin. Per entrare usa il bottone Admin.");
        return;
      }

      supabaseStato("Accesso riuscito. Carico subito i dati online...");
      await supabaseCaricaDati();
    }

    async function supabaseEsci() {
      const client = inizializzaSupabase();
      if (client) await client.auth.signOut();
      supabaseUtente = null;
      supabaseProfilo = null;
      localStorage.removeItem("ruolo_utente_corrente");
      localStorage.setItem("ruolo_utente_ore", "admin");
      applicaVistaRuoloSupabase();
      supabaseStato("Disconnesso da Supabase.");
    }

    function supabaseNomeCompleto(nome, cognome) {
      return [nome || "", cognome || ""].join(" ").trim();
    }

    async function supabaseCaricaDati() {
      const client = inizializzaSupabase();
      const sessione = await supabaseSessioneCorrente();
      if (!client || !sessione) {
        supabaseStato("Accedi prima di caricare i dati online.", true);
        return;
      }
      if (!supabaseProfilo) await supabaseCaricaProfilo();
      supabaseStato("Carico dati da Supabase...");

      const [collabRes, cantRes, lavRes, oreRes, adminRes] = await Promise.all([
        client.from("collaboratori").select("id, nome, cognome, attivo").order("nome"),
        client.from("cantieri").select("id, nome, km, zona, attivo").order("nome"),
        client.from("lavorazioni").select("id, nome, attivo").eq("attivo", true).order("nome"),
        client.from("ore").select("*").order("data", { ascending: true }),
        client.from("amministrazione_mesi").select("*").order("anno", { ascending: true }).order("mese", { ascending: true })
      ]);

      const errore = collabRes.error || cantRes.error || lavRes.error || oreRes.error || adminRes.error;
      if (errore) {
        console.error(errore);
        supabaseStato("Errore caricamento dati: " + errore.message, true);
        return;
      }

      vociMenu.collaboratori = [];
      vociMenu.collaboratoreStato = {};
      vociMenu.operaiDettagli = {};
      vociMenu.cantieri = [];
      vociMenu.cantieriKm = {};
      vociMenu.cantiereZone = {};
      vociMenu.cantiereStato = {};
      vociMenu.lavori = [];
      vociMenu._supabaseIds = { collaboratori: {}, cantieri: {}, lavori: {} };

      (collabRes.data || []).forEach(c => {
        const nomeCompleto = supabaseNomeCompleto(c.nome, c.cognome) || c.nome;
        if (!nomeCompleto) return;
        vociMenu.collaboratori.push(nomeCompleto);
        vociMenu.collaboratoreStato[nomeCompleto] = c.attivo ? "attivo" : "terminato";
        vociMenu.operaiDettagli[nomeCompleto] = { nome: c.nome || nomeCompleto, cognome: c.cognome || "", password: "" };
        vociMenu._supabaseIds.collaboratori[nomeCompleto] = c.id;
      });

      (cantRes.data || []).forEach(c => {
        if (!c.nome) return;
        vociMenu.cantieri.push(c.nome);
        vociMenu.cantieriKm[c.nome] = Number(c.km || 0);
        vociMenu.cantiereZone[c.nome] = c.zona || c.nome;
        vociMenu.cantiereStato[c.nome] = c.attivo ? "attivo" : "terminato";
        vociMenu._supabaseIds.cantieri[c.nome] = c.id;
      });

      (lavRes.data || []).forEach(l => {
        if (!l.nome) return;
        vociMenu.lavori.push(l.nome);
        vociMenu._supabaseIds.lavori[l.nome] = l.id;
      });

      ore = (oreRes.data || []).map(r => ({
        id: r.id,
        collaboratore: r.collaboratore_nome || "",
        data: r.data || "",
        cantiere: r.cantiere || "",
        inizio: r.inizio ? String(r.inizio).slice(0,5) : "",
        fine: r.fine ? String(r.fine).slice(0,5) : "",
        pausa: Number(r.pausa || 0),
        oreManuali: r.ore_manuali === null || r.ore_manuali === undefined ? null : Number(r.ore_manuali),
        totaleOre: Number(r.totale_ore || 0),
        lavoro: r.lavoro || "",
        nota: r.nota || "",
        km: Number(r.km || 0),
        importoTrasferta: Number(r.importo_trasferta || 0),
        avs: r.avs || (Number(r.km || 0) <= 10 ? "Sì" : "No"),
        creatoIl: r.creato_il || new Date().toISOString()
      }));

      if (supabaseUtenteCollaboratore()) {
        const mioNome = supabaseProfiloNomeCompleto();
        const mioNomeNorm = String(mioNome || "").trim().toLowerCase();
        ore = ore.filter(r => String(r.collaboratore || "").trim().toLowerCase() === mioNomeNorm);
        vociMenu.collaboratori = mioNome ? [mioNome] : [];
        vociMenu.collaboratoreStato = mioNome ? { [mioNome]: "attivo" } : {};
      }

      const annoFiltro = Number((val("filtroDal") || new Date().toISOString().slice(0, 4)).slice(0, 4)) || new Date().getFullYear();
      if (!datiAmministratore.mesi) datiAmministratore.mesi = {};
      (adminRes.data || []).filter(r => Number(r.anno) === annoFiltro).forEach(r => {
        const chiave = String(r.mese).padStart(2, "0");
        datiAmministratore.mesi[chiave] = {
          oreDaFare: r.ore_da_lavorare ?? "",
          festivi: r.giorni_festivi ?? "",
          vacanze: r.giorni_vacanza ?? "",
          vacanzeDettaglio: r.date_vacanza ?? ""
        };
      });

      normalizzaVociMenu();
      salvaVociMenu();
      salvaStorage();
      salvaDatiAmministratoreStorageLocale();
      renderTabellaAmministratore();
      renderRegoleOrariAmministratore();
      applicaDatiAmministratoreAlMese(false);
      renderizza();
      applicaVistaRuoloSupabase();
      supabaseStato(supabaseUtenteCollaboratore() ? "Dati online caricati. Vista collaboratore: vedi solo le tue ore." : "Dati online caricati. Puoi lavorare con la stessa schermata.");
    }

    function separaNomeCognome(nomeCompleto) {
      const dettagli = dettagliOperaio(nomeCompleto);
      if (dettagli && (dettagli.nome || dettagli.cognome)) {
        return { nome: dettagli.nome || nomeCompleto, cognome: dettagli.cognome || "" };
      }
      const parti = String(nomeCompleto || "").trim().split(/\s+/);
      if (parti.length <= 1) return { nome: nomeCompleto || "", cognome: "" };
      return { nome: parti[0], cognome: parti.slice(1).join(" ") };
    }

    async function supabaseAssicuraVoce(tabella, nome, extra = {}) {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !nome) return null;
      const mappaTipo = tabella === "collaboratori" ? "collaboratori" : (tabella === "cantieri" ? "cantieri" : "lavori");
      if (!vociMenu._supabaseIds) vociMenu._supabaseIds = { collaboratori: {}, cantieri: {}, lavori: {} };
      if (!vociMenu._supabaseIds[mappaTipo]) vociMenu._supabaseIds[mappaTipo] = {};
      if (vociMenu._supabaseIds[mappaTipo][nome]) return vociMenu._supabaseIds[mappaTipo][nome];

      let query = client.from(tabella).select("id").eq("nome", nome).limit(1);
      const trovato = await query.maybeSingle();
      if (trovato.data && trovato.data.id) {
        vociMenu._supabaseIds[mappaTipo][nome] = trovato.data.id;
        salvaVociMenu();
        return trovato.data.id;
      }

      let payload = { azienda_id: SUPABASE_AZIENDA_ID, nome, attivo: true, ...extra };
      const { data, error } = await client.from(tabella).insert(payload).select("id").single();
      if (error) {
        console.warn("Impossibile creare", tabella, nome, error.message);
        return null;
      }
      vociMenu._supabaseIds[mappaTipo][nome] = data.id;
      salvaVociMenu();
      return data.id;
    }

    async function supabaseSalvaRigaOre(riga) {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !riga) return;
      const collabNome = riga.collaboratore || "";
      const datiNome = separaNomeCognome(collabNome);
      const collaboratoreId = await supabaseAssicuraVoce("collaboratori", datiNome.nome, { cognome: datiNome.cognome });
      const cantiereId = await supabaseAssicuraVoce("cantieri", riga.cantiere, { km: Number(riga.km || 0), zona: zonaTrasferta(riga.cantiere) || riga.cantiere });
      const lavorazioneId = riga.lavoro ? await supabaseAssicuraVoce("lavorazioni", riga.lavoro) : null;

      const payload = {
        id: riga.id,
        azienda_id: SUPABASE_AZIENDA_ID,
        collaboratore_id: collaboratoreId,
        collaboratore_nome: collabNome,
        data: riga.data,
        cantiere: riga.cantiere,
        cantiere_id: cantiereId,
        inizio: riga.inizio || null,
        fine: riga.fine || null,
        pausa: Number(riga.pausa || 0),
        ore_manuali: riga.oreManuali === null || riga.oreManuali === undefined ? null : Number(riga.oreManuali),
        totale_ore: Number(riga.totaleOre || 0),
        lavoro: riga.lavoro || "",
        nota: riga.nota || "",
        lavorazione_id: lavorazioneId,
        km: Number(riga.km || 0),
        importo_trasferta: fasciaKm(Number(riga.km || 0)).importo,
        avs: Number(riga.km || 0) <= 10 ? "Sì" : "No",
        creato_da: supabaseUtente.id,
        modificato_il: new Date().toISOString()
      };

      const { error } = await client.from("ore").upsert(payload);
      if (error) {
        console.error(error);
        supabaseStato("Ore salvate in locale, ma non online: " + error.message, true);
      } else {
        supabaseStato("Ore salvate anche online.");
      }
    }

    async function collaboratoreRispettaLimiteOreGiornoOnline(collaboratore, dataIso, oreDaAggiungere, idEscluso = null) {
      if (!utenteCorrenteECollaboratore()) return true;
      const controlloLocale = collaboratoreRispettaLimiteOreGiorno(collaboratore, dataIso, oreDaAggiungere, idEscluso, false);
      const totaleLocale = totaleOreCollaboratoreGiornoLocale(collaboratore, dataIso, idEscluso);
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente) {
        if (!controlloLocale) return collaboratoreRispettaLimiteOreGiorno(collaboratore, dataIso, oreDaAggiungere, idEscluso, true);
        return true;
      }

      const { data, error } = await client
        .from("ore")
        .select("id, totale_ore")
        .eq("azienda_id", SUPABASE_AZIENDA_ID)
        .eq("collaboratore_nome", collaboratore)
        .eq("data", dataIso);

      if (error) {
        console.warn("Controllo limite ore online non riuscito, uso controllo locale.", error.message);
        if (!controlloLocale) return collaboratoreRispettaLimiteOreGiorno(collaboratore, dataIso, oreDaAggiungere, idEscluso, true);
        return true;
      }

      const totaleServer = (Array.isArray(data) ? data : [])
        .filter(r => !idEscluso || r.id !== idEscluso)
        .reduce((totale, r) => totale + Number(r.totale_ore || 0), 0);
      const totaleGiaInserito = Math.max(totaleLocale, totaleServer);
      const nuovoTotale = totaleGiaInserito + Number(oreDaAggiungere || 0);

      if (nuovoTotale <= LIMITE_ORE_GIORNO_COLLABORATORE + 0.001) return true;

      alert(
        "Limite ore giornaliero superato.\n\n" +
        "Puoi inserire più cantieri nello stesso giorno, ma il totale massimo è 8.50 ore.\n" +
        "Ore già presenti online/locale oggi: " + totaleGiaInserito.toFixed(2) + "\n" +
        "Ore che stai inserendo: " + Number(oreDaAggiungere || 0).toFixed(2) + "\n" +
        "Totale: " + nuovoTotale.toFixed(2) + " ore"
      );
      return false;
    }

    function calcolaTotaleOreDaForm() {
      const oreManualiTesto = val("oreManuali");
      const oreManuali = oreManualiTesto === "" ? null : Number(oreManualiTesto);
      const oreCalcolate = oreDaOrari(val("inizio"), val("fine"), Number(val("pausa") || 0));
      return oreManuali !== null && !Number.isNaN(oreManuali) ? oreManuali : oreCalcolate;
    }

    const salvaOraLocaleOriginale = salvaOra;
    salvaOra = async function() {
      if (supabaseUtenteCollaboratore()) {
        const mioNome = supabaseProfiloNomeCompleto();
        const oggi = dataIsoOggi();
        const inputCollaboratore = document.getElementById("collaboratore");
        const inputData = document.getElementById("data");
        if (inputCollaboratore && mioNome) inputCollaboratore.value = mioNome;
        if (inputData) inputData.value = oggi;
      }
      const idPrima = editId;
      const totaleOreDaSalvare = calcolaTotaleOreDaForm();
      const collaboratoreDaSalvare = val("collaboratore").trim();
      const dataDaSalvare = val("data");
      if (!(await collaboratoreRispettaLimiteOreGiornoOnline(collaboratoreDaSalvare, dataDaSalvare, totaleOreDaSalvare, idPrima))) {
        return;
      }
      const lunghezzaPrima = ore.length;
      salvaOraLocaleOriginale();
      if (!supabaseUtente) return;
      let riga = null;
      if (idPrima) riga = ore.find(x => x.id === idPrima);
      if (!riga && ore.length > lunghezzaPrima) riga = ore[ore.length - 1];
      if (riga) await supabaseSalvaRigaOre(riga);
    };

    const salvaDatiAmministratoreStorageLocale = salvaDatiAmministratoreStorage;
    salvaDatiAmministratoreStorage = function() {
      salvaDatiAmministratoreStorageLocale();
      supabaseSalvaAmministrazioneMesi();
    };

    async function supabaseSalvaAmministrazioneMesi() {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !datiAmministratore || !datiAmministratore.mesi) return;
      const anno = Number((val("filtroDal") || new Date().toISOString().slice(0, 4)).slice(0, 4)) || new Date().getFullYear();
      const righe = Object.entries(datiAmministratore.mesi).map(([mese, dati]) => ({
        azienda_id: SUPABASE_AZIENDA_ID,
        anno,
        mese: Number(mese),
        ore_da_lavorare: Number(dati.oreDaFare || 0),
        giorni_festivi: Number(dati.festivi || 0),
        giorni_vacanza: Number(dati.vacanze || 0),
        date_vacanza: String(dati.vacanzeDettaglio || ""),
        aggiornato_il: new Date().toISOString()
      }));
      const { error } = await client.from("amministrazione_mesi").upsert(righe, { onConflict: "azienda_id,anno,mese" });
      if (error) console.warn("Amministrazione mesi non salvata online", error.message);
    }

    const aggiungiCantiereManualeLocaleOriginale = aggiungiCantiereManuale;
    aggiungiCantiereManuale = async function() {
      aggiungiCantiereManualeLocaleOriginale();
      if (!supabaseUtente) return;
      const nome = val("cantiere").trim();
      if (nome) await supabaseAssicuraVoce("cantieri", nome, { km: Number(val("km") || 0), zona: zonaTrasferta(nome) || nome });
    };

    const aggiungiVoceManualeLocaleOriginale = aggiungiVoceManuale;
    aggiungiVoceManuale = async function(tipo, inputId) {
      const input = document.getElementById(inputId);
      const valorePrima = input ? input.value.trim() : "";
      aggiungiVoceManualeLocaleOriginale(tipo, inputId);
      if (!supabaseUtente || !valorePrima) return;
      if (tipo === "lavori") await supabaseAssicuraVoce("lavorazioni", valorePrima);
      if (tipo === "collaboratori") {
        const datiNome = separaNomeCognome(valorePrima);
        await supabaseAssicuraVoce("collaboratori", datiNome.nome, { cognome: datiNome.cognome });
      }
    };



    // === Correzione sincronizzazione Supabase: operai, cantieri cancellati/terminati e lavorazioni ===
    function supabaseIdsPronti() {
      if (!vociMenu._supabaseIds) vociMenu._supabaseIds = { collaboratori: {}, cantieri: {}, lavori: {} };
      if (!vociMenu._supabaseIds.collaboratori) vociMenu._supabaseIds.collaboratori = {};
      if (!vociMenu._supabaseIds.cantieri) vociMenu._supabaseIds.cantieri = {};
      if (!vociMenu._supabaseIds.lavori) vociMenu._supabaseIds.lavori = {};
    }

    async function supabaseAssicuraCollaboratore(nomeCompleto) {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !nomeCompleto) return null;
      supabaseIdsPronti();

      const nomePulito = testoPulito(nomeCompleto);
      if (vociMenu._supabaseIds.collaboratori[nomePulito]) return vociMenu._supabaseIds.collaboratori[nomePulito];

      const datiNome = separaNomeCognome(nomePulito);
      let query = client
        .from("collaboratori")
        .select("id, nome, cognome, attivo")
        .eq("nome", datiNome.nome || nomePulito);

      if (datiNome.cognome) query = query.eq("cognome", datiNome.cognome);
      else query = query.or('cognome.is.null,cognome.eq.');

      const trovato = await query.limit(1).maybeSingle();
      if (trovato.data && trovato.data.id) {
        vociMenu._supabaseIds.collaboratori[nomePulito] = trovato.data.id;
        if (trovato.data.attivo === false) await client.from("collaboratori").update({ attivo: true }).eq("id", trovato.data.id);
        salvaVociMenu();
        return trovato.data.id;
      }

      const { data, error } = await client
        .from("collaboratori")
        .insert({
          azienda_id: SUPABASE_AZIENDA_ID,
          nome: datiNome.nome || nomePulito,
          cognome: datiNome.cognome || "",
          attivo: true
        })
        .select("id")
        .single();

      if (error) {
        console.warn("Impossibile creare collaboratore online", nomePulito, error.message);
        supabaseStato("Operaio salvato in locale, ma non online: " + error.message, true);
        return null;
      }

      vociMenu._supabaseIds.collaboratori[nomePulito] = data.id;
      salvaVociMenu();
      supabaseStato("Operaio salvato anche online.");
      return data.id;
    }

    async function supabaseAggiornaStatoVoce(tabella, tipoMappa, nome, attivo) {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !nome) return;
      supabaseIdsPronti();
      const id = vociMenu._supabaseIds[tipoMappa] && vociMenu._supabaseIds[tipoMappa][nome];
      let query;
      if (id) {
        query = client.from(tabella).update({ attivo }).eq("id", id);
      } else if (tabella === "collaboratori") {
        const datiNome = separaNomeCognome(nome);
        query = client.from(tabella).update({ attivo }).eq("nome", datiNome.nome || nome);
        if (datiNome.cognome) query = query.eq("cognome", datiNome.cognome);
      } else {
        query = client.from(tabella).update({ attivo }).eq("nome", nome);
      }
      const { error } = await query;
      if (error) {
        console.warn("Stato non aggiornato online", tabella, nome, error.message);
        supabaseStato("Stato salvato in locale, ma non online: " + error.message, true);
      } else {
        supabaseStato("Stato aggiornato anche online.");
      }
    }

    async function supabaseEliminaVoceOnline(tipo, voce) {
      const nome = testoPulito(voce);
      if (!supabaseUtente || !nome) return;
      if (tipo === "cantieri") {
        await supabaseAggiornaStatoVoce("cantieri", "cantieri", nome, false);
      } else if (tipo === "collaboratori") {
        await supabaseAggiornaStatoVoce("collaboratori", "collaboratori", nome, false);
      } else if (tipo === "lavori") {
        await supabaseAggiornaStatoVoce("lavorazioni", "lavori", nome, false);
      }
    }

    const supabaseImpostaStatoCantiereLocale = impostaStatoCantiere;
    impostaStatoCantiere = async function(cantiere, stato) {
      supabaseImpostaStatoCantiereLocale(cantiere, stato);
      if (supabaseUtente) await supabaseAggiornaStatoVoce("cantieri", "cantieri", testoPulito(cantiere), stato !== "terminato");
    };

    const supabaseImpostaStatoCollaboratoreLocale = impostaStatoCollaboratore;
    impostaStatoCollaboratore = async function(collaboratore, stato) {
      supabaseImpostaStatoCollaboratoreLocale(collaboratore, stato);
      if (supabaseUtente) await supabaseAggiornaStatoVoce("collaboratori", "collaboratori", testoPulito(collaboratore), stato !== "terminato");
    };

    const supabaseEliminaVoceLocale = eliminaVoce;
    eliminaVoce = async function(tipo, voce) {
      supabaseEliminaVoceLocale(tipo, voce);
      if (supabaseUtente) await supabaseEliminaVoceOnline(tipo, voce);
    };

    async function supabaseEliminaOraOnline(id) {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !id) return;
      const { error } = await client.from("ore").delete().eq("id", id);
      if (error) {
        console.error(error);
        supabaseStato("Ore eliminate in locale, ma non online: " + error.message, true);
      } else {
        supabaseStato("Ore eliminate anche online.");
      }
    }

    const supabaseEliminaOraLocale = elimina;
    elimina = async function(id) {
      const esistePrima = ore.some(x => x.id === id);
      await supabaseEliminaOraLocale(id);
      const eliminataLocale = esistePrima && !ore.some(x => x.id === id);
      if (supabaseUtente && eliminataLocale) await supabaseEliminaOraOnline(id);
    };


    const supabaseAggiungiOperaioManualeLocale = aggiungiOperaioManuale;
    aggiungiOperaioManuale = async function() {
      const nome = testoPulito(document.getElementById("nuovoOperaioNome")?.value || "");
      const cognome = testoPulito(document.getElementById("nuovoOperaioCognome")?.value || "");
      const nomeCompleto = `${nome} ${cognome}`.trim();
      supabaseAggiungiOperaioManualeLocale();
      if (supabaseUtente && nomeCompleto) await supabaseAssicuraCollaboratore(nomeCompleto);
    };

    const supabaseSalvaRigaOreOriginale = supabaseSalvaRigaOre;
    supabaseSalvaRigaOre = async function(riga) {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !riga) return;
      const collaboratoreId = await supabaseAssicuraCollaboratore(riga.collaboratore || "");
      const cantiereId = await supabaseAssicuraVoce("cantieri", riga.cantiere, { km: Number(riga.km || 0), zona: zonaTrasferta(riga.cantiere) || riga.cantiere });
      const lavorazioneId = riga.lavoro ? await supabaseAssicuraVoce("lavorazioni", riga.lavoro) : null;

      const payload = {
        id: riga.id,
        azienda_id: SUPABASE_AZIENDA_ID,
        collaboratore_id: collaboratoreId,
        collaboratore_nome: riga.collaboratore || "",
        data: riga.data,
        cantiere: riga.cantiere,
        cantiere_id: cantiereId,
        inizio: riga.inizio || null,
        fine: riga.fine || null,
        pausa: Number(riga.pausa || 0),
        ore_manuali: riga.oreManuali === null || riga.oreManuali === undefined ? null : Number(riga.oreManuali),
        totale_ore: Number(riga.totaleOre || 0),
        lavoro: riga.lavoro || "",
        nota: riga.nota || "",
        lavorazione_id: lavorazioneId,
        km: Number(riga.km || 0),
        importo_trasferta: fasciaKm(Number(riga.km || 0)).importo,
        avs: Number(riga.km || 0) <= 10 ? "Sì" : "No",
        creato_da: supabaseUtente.id,
        modificato_il: new Date().toISOString()
      };

      const { error } = await client.from("ore").upsert(payload);
      if (error) {
        console.error(error);
        supabaseStato("Ore salvate in locale, ma non online: " + error.message, true);
      } else {
        supabaseStato("Ore salvate anche online.");
      }
    };

    function statoCreaAccessoCollaboratore(testo, errore = false) {
      const box = document.getElementById("creaAccessoCollaboratoreStato");
      if (!box) return;
      box.textContent = testo;
      box.style.color = errore ? "#991b1b" : "#166534";
      box.style.fontWeight = "bold";
    }

    async function creaAccessoCollaboratoreOnline() {
      const client = inizializzaSupabase();
      if (!client) {
        alert("Supabase non è caricato. Controlla la connessione internet.");
        return;
      }

      const sessione = await supabaseSessioneCorrente();
      if (!sessione) {
        statoCreaAccessoCollaboratore("Accedi prima come amministratore.", true);
        return;
      }
      if (!supabaseProfilo) await supabaseCaricaProfilo();
      if (!supabaseUtenteAdmin()) {
        statoCreaAccessoCollaboratore("Solo l’amministratore può creare accessi collaboratore.", true);
        return;
      }

      const nome = testoPulito(document.getElementById("accessoCollabNome")?.value || "");
      const cognome = testoPulito(document.getElementById("accessoCollabCognome")?.value || "");
      const email = String(document.getElementById("accessoCollabEmail")?.value || "").trim().toLowerCase();
      const password = String(document.getElementById("accessoCollabPassword")?.value || "").trim();

      if (!nome || !email || !password) {
        statoCreaAccessoCollaboratore("Inserisci nome, email e password.", true);
        return;
      }
      if (password.length < 6) {
        statoCreaAccessoCollaboratore("La password deve avere almeno 6 caratteri.", true);
        return;
      }

      statoCreaAccessoCollaboratore("Creo accesso online...");
      const tokenAccesso = sessione && sessione.access_token ? sessione.access_token : "";
      if (!tokenAccesso) {
        statoCreaAccessoCollaboratore("Sessione admin non valida. Fai Esci e rientra come amministratore.", true);
        return;
      }

      let data = null;
      try {
        const risposta = await fetch(`${SUPABASE_URL}/functions/v1/crea-collaboratore`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${tokenAccesso}`
          },
          body: JSON.stringify({ nome, cognome, email, password })
        });

        const testoRisposta = await risposta.text();
        try {
          data = testoRisposta ? JSON.parse(testoRisposta) : null;
        } catch (_) {
          data = { error: testoRisposta || "Risposta non leggibile dalla funzione." };
        }

        if (!risposta.ok) {
          const dettaglioUtente = data && data.user_id ? ` Utente ricevuto: ${data.user_id}` : "";
          const messaggio = data && data.error ? data.error : `Errore funzione ${risposta.status}`;
          statoCreaAccessoCollaboratore("Errore: " + messaggio + dettaglioUtente, true);
          console.error("Errore crea-collaboratore", risposta.status, data);
          return;
        }
      } catch (erroreFetch) {
        console.error(erroreFetch);
        statoCreaAccessoCollaboratore("Errore collegamento funzione Supabase: " + (erroreFetch.message || erroreFetch), true);
        return;
      }

      if (data && data.error) {
        statoCreaAccessoCollaboratore("Errore: " + data.error, true);
        return;
      }

      statoCreaAccessoCollaboratore("Accesso creato e collegato: " + email);

      const nomeCompleto = `${nome} ${cognome}`.trim();
      if (nomeCompleto) {
        aggiungiVoce("collaboratori", nomeCompleto, false);
        if (!vociMenu.collaboratoreStato) vociMenu.collaboratoreStato = {};
        vociMenu.collaboratoreStato[nomeCompleto] = "attivo";
      }
      salvaVociMenu();
      renderizza();

      document.getElementById("accessoCollabNome").value = "";
      document.getElementById("accessoCollabCognome").value = "";
      document.getElementById("accessoCollabEmail").value = "";
      document.getElementById("accessoCollabPassword").value = "";

      await supabaseCaricaDati();
    }

    document.addEventListener("DOMContentLoaded", async () => {
      inizializzaSupabase();
      workhubCaricaPreferenzeAccesso();
      await workhubAccessoDirettoDaSessione();
    });



    function nascondiSchermataCaricamento() {
      const loader = document.getElementById("appLoader");
      if (!loader) return;
      loader.classList.add("nascosto");
      setTimeout(() => {
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      }, 450);
    }

    window.addEventListener("load", () => {
      setTimeout(nascondiSchermataCaricamento, 650);
    });

    setTimeout(nascondiSchermataCaricamento, 2500);


    // === FIX cancellazione ore online Supabase ===
    // Questa versione cancella prima dal server e solo dopo aggiorna il locale,
    // cosi le ore non ricompaiono quando si ricaricano i dati online.
    async function eliminaOreLocaleDopoServer(id) {
      ore = ore.filter(x => x.id !== id);
      salvaStorage();
      renderizza();
    }

    async function eliminaOreDaSupabaseConVerifica(id) {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !id) {
        return { online: false, ok: false, messaggio: "Non collegato a Supabase." };
      }

      if (!supabaseProfilo) await supabaseCaricaProfilo();
      if (!supabaseUtenteAdmin()) {
        return { online: true, ok: false, messaggio: "Solo l’amministratore online puo cancellare le ore dal server." };
      }

      const { data, error } = await client
        .from("ore")
        .delete()
        .eq("id", id)
        .eq("azienda_id", SUPABASE_AZIENDA_ID)
        .select("id");

      if (error) {
        return { online: true, ok: false, messaggio: error.message };
      }

      if (!data || data.length === 0) {
        return {
          online: true,
          ok: false,
          messaggio: "Nessuna riga cancellata dal server. Probabile permesso Supabase/RLS mancante oppure riga non trovata."
        };
      }

      return { online: true, ok: true, messaggio: "Ore eliminate dal server." };
    }

    elimina = async function(id) {
      if (!utenteCorrenteEAmministratore()) {
        alert("Solo l’amministratore può eliminare le ore.");
        return;
      }
      if (!id) return;

      const riga = ore.find(x => x.id === id);
      const descrizione = riga
        ? `${fmtData(riga.data || "")} - ${riga.collaboratore || ""} - ${riga.cantiere || ""} - ${Number(riga.totaleOre || 0).toFixed(2)} ore`
        : "questa registrazione";

      if (!confirm(`Eliminare definitivamente le ore?\n\n${descrizione}`)) return;

      if (supabaseUtente) {
        supabaseStato("Cancello ore dal server...");
        const risultato = await eliminaOreDaSupabaseConVerifica(id);
        if (!risultato.ok) {
          supabaseStato("Ore NON eliminate online: " + risultato.messaggio, true);
          alert("Le ore non sono state cancellate dal server.\n\n" + risultato.messaggio + "\n\nNon le cancello dal locale, cosi resta tutto allineato.");
          return;
        }
        await eliminaOreLocaleDopoServer(id);
        supabaseStato("Ore eliminate online e in locale.");
        await supabaseCaricaDati();
        return;
      }

      await eliminaOreLocaleDopoServer(id);
      alert("Ore eliminate solo in locale. Per cancellarle dal server devi prima accedere online come amministratore.");
    };



    // === Visuale WorkHub login senza demo ===
    function workhubScegliRuoloLogin(ruolo) {
      const ruoloPulito = ruolo === "dipendente" ? "dipendente" : "admin";
      localStorage.setItem("workhub_login_ruolo_visuale", ruoloPulito);
      document.getElementById("loginRuoloAdmin")?.classList.toggle("attivo", ruoloPulito === "admin");
      document.getElementById("loginRuoloDipendente")?.classList.toggle("attivo", ruoloPulito === "dipendente");
      const btn = document.getElementById("workhubAccediBtn");
      if (btn) btn.textContent = ruoloPulito === "admin" ? "↪ Accedi come Admin" : "↪ Accedi come Dipendente";
    }

    function workhubMostraAccesso(tipo) {
      const registrati = tipo === "registrati";
      document.getElementById("workhubTabAccedi")?.classList.toggle("attivo", !registrati);
      document.getElementById("workhubTabRegistrati")?.classList.toggle("attivo", registrati);
      document.getElementById("workhubRegisterInfo")?.classList.toggle("aperto", registrati);
    }

    function workhubTogglePassword() {
      const input = document.getElementById("supabasePassword");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    }


    // Ricorda solo email e ruolo. La password non viene salvata nel file.
    const WORKHUB_EMAIL_RICORDATA_KEY = "workhub_email_ricordata";

    function workhubCaricaPreferenzeAccesso() {
      const emailSalvata = localStorage.getItem(WORKHUB_EMAIL_RICORDATA_KEY) || "";
      const emailInput = document.getElementById("supabaseEmail");
      const ricordami = document.getElementById("workhubRicordami");
      if (emailSalvata && emailInput) emailInput.value = emailSalvata;
      if (ricordami) ricordami.checked = Boolean(emailSalvata);
    }

    function workhubSalvaPreferenzeAccesso() {
      const email = document.getElementById("supabaseEmail")?.value.trim() || "";
      const ricordami = document.getElementById("workhubRicordami")?.checked;
      if (ricordami && email) {
        localStorage.setItem(WORKHUB_EMAIL_RICORDATA_KEY, email);
      } else {
        localStorage.removeItem(WORKHUB_EMAIL_RICORDATA_KEY);
      }
    }

    async function workhubAccessoDirettoDaSessione() {
      const client = inizializzaSupabase();
      if (!client) {
        applicaVistaRuoloSupabase();
        supabaseStato("Supabase non caricato. Controlla la connessione internet.", true);
        return;
      }

      const sessione = await supabaseSessioneCorrente();
      if (sessione) {
        supabaseStato("Accesso gia salvato. Carico i dati online...");
        const profilo = await supabaseCaricaProfilo();
        if (profilo) {
          const ruolo = String(profilo.ruolo || "").toLowerCase() === "admin" ? "admin" : "dipendente";
          workhubScegliRuoloLogin(ruolo);
          const emailInput = document.getElementById("supabaseEmail");
          if (emailInput && sessione.user && sessione.user.email) emailInput.value = sessione.user.email;
          await supabaseCaricaDati();
        }
        return;
      }

      applicaVistaRuoloSupabase();
      supabaseStato("Non collegato. Inserisci email e password solo al primo accesso.");
    }

    async function supabasePasswordDimenticata() {
      const client = inizializzaSupabase();
      const email = document.getElementById("supabaseEmail")?.value.trim();
      if (!client) {
        alert("Supabase non è caricato. Controlla la connessione internet.");
        return;
      }
      if (!email) {
        alert("Inserisci prima la tua email.");
        return;
      }
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) {
        supabaseStato("Errore recupero password: " + error.message, true);
        return;
      }
      supabaseStato("Email recupero password inviata a " + email + ".");
    }

    document.addEventListener("DOMContentLoaded", () => {
      workhubScegliRuoloLogin(localStorage.getItem("workhub_login_ruolo_visuale") || "admin");
      workhubMostraAccesso("accedi");
      workhubCaricaPreferenzeAccesso();
    });

    // === Cancellazione ore online robusta: server prima, locale dopo ===
    async function eliminaOreLocaleDopoServer(id) {
      ore = ore.filter(x => x.id !== id);
      salvaStorage();
      renderizza();
    }

    async function eliminaOreDaSupabaseConVerifica(id) {
      const client = inizializzaSupabase();
      if (!client || !supabaseUtente || !id) {
        return { online: false, ok: false, messaggio: "Non collegato online." };
      }

      const { data, error } = await client
        .from("ore")
        .delete()
        .eq("id", id)
        .select("id");

      if (error) {
        console.error(error);
        return { online: true, ok: false, messaggio: error.message || String(error) };
      }

      if (!data || data.length === 0) {
        return {
          online: true,
          ok: false,
          messaggio: "Nessuna riga cancellata dal server. Probabile permesso Supabase/RLS mancante oppure riga non trovata."
        };
      }

      return { online: true, ok: true, messaggio: "Ore eliminate dal server." };
    }

    elimina = async function(id) {
      if (!utenteCorrenteEAmministratore()) {
        alert("Solo l’amministratore può eliminare le ore.");
        return;
      }
      if (!id) return;

      const riga = ore.find(x => x.id === id);
      const descrizione = riga
        ? `${fmtData(riga.data || "")} - ${riga.collaboratore || ""} - ${riga.cantiere || ""} - ${Number(riga.totaleOre || 0).toFixed(2)} ore`
        : "questa registrazione";

      if (!confirm(`Eliminare definitivamente le ore?\n\n${descrizione}`)) return;

      if (supabaseUtente) {
        supabaseStato("Cancello ore dal server...");
        const risultato = await eliminaOreDaSupabaseConVerifica(id);
        if (!risultato.ok) {
          supabaseStato("Ore NON eliminate online: " + risultato.messaggio, true);
          alert("Le ore non sono state cancellate dal server.\n\n" + risultato.messaggio + "\n\nNon le cancello dal locale, cosi resta tutto allineato.");
          return;
        }
        await eliminaOreLocaleDopoServer(id);
        supabaseStato("Ore eliminate online e in locale.");
        await supabaseCaricaDati();
        return;
      }

      await eliminaOreLocaleDopoServer(id);
      alert("Ore eliminate solo in locale. Per cancellarle dal server devi prima accedere online come amministratore.");
    };



    // === Schermata semplificata collaboratore ===
    function collabQuickNomeUtente() {
      return supabaseProfiloNomeCompleto() || document.getElementById("collaboratore")?.value || "Dipendente";
    }

    function collabQuickAggiornaScelte() {
      const pannello = document.getElementById("collabQuickPanel");
      if (!pannello) return;
      const nomeBox = document.getElementById("collabQuickNome");
      if (nomeBox) nomeBox.textContent = collabQuickNomeUtente();

      const listaCantieri = document.getElementById("collabQuickListaCantieri");
      const listaLavori = document.getElementById("collabQuickListaLavori");
      const cantieri = cantieriAttivi();
      const lavori = normalizzaListaVoci([...(vociMenu.lavori || []), ...ore.map(r => r.lavoro)]);
      if (listaCantieri) {
        listaCantieri.innerHTML = cantieri.map(c => `<option value="${escapeAttribute(c)}"></option>`).join("");
      }
      if (listaLavori) {
        listaLavori.innerHTML = lavori.map(l => `<option value="${escapeAttribute(l)}"></option>`).join("");
      }
    }

    function collabQuickApriChiudi() {
      const pannello = document.getElementById("collabQuickPanel");
      const btn = document.getElementById("collabQuickApriBtn");
      if (!pannello) return;
      const aperto = pannello.classList.toggle("aperto");
      if (btn) btn.textContent = aperto ? "Chiudi inserimento ore" : "+ Apri inserimento ore";
      collabQuickAggiornaScelte();
      collabQuickRenderOggi();
      if (aperto) {
        setTimeout(() => collabQuickMostraSuggerimentiCantiere(), 80);
      }
    }

    function collabQuickCambiaCantiere() {
      const cantiere = document.getElementById("collabQuickCantiere")?.value || "";
      const inputCantiere = document.getElementById("cantiere");
      if (inputCantiere) inputCantiere.value = cantiere;
      aggiornaKmDaCantiere();
    }

    function collabQuickValoriLavori() {
      return normalizzaListaVoci([...(vociMenu.lavori || []), ...ore.map(r => r.lavoro)]);
    }

    function collabQuickFiltraValori(valori, testo) {
      const ricerca = chiaveRicerca(testo || "");
      return normalizzaListaVoci(valori).filter(voce => {
        if (!ricerca) return true;
        return chiaveRicerca(voce).includes(ricerca);
      }).slice(0, 18);
    }

    function collabQuickRenderSuggerimenti(boxId, valori, nomeFunzioneScelta) {
      const box = document.getElementById(boxId);
      if (!box) return;
      box.setAttribute("role", "listbox");
      if (!valori.length) {
        box.innerHTML = '<div class="suggerimento-vuoto">Nessuna voce trovata.</div>';
        box.classList.add("aperto");
        return;
      }
      box.innerHTML = valori.map(voce => `
        <button type="button" class="suggerimento-voce" role="option" data-voce="${escapeAttribute(voce)}" onclick="${nomeFunzioneScelta}(this.dataset.voce)" onpointerdown="event.preventDefault(); ${nomeFunzioneScelta}(this.dataset.voce)" ontouchstart="event.preventDefault(); ${nomeFunzioneScelta}(this.dataset.voce)">${escapeHtml(voce)}</button>
      `).join("");
      box.classList.add("aperto");
    }

    function collabQuickMostraSuggerimentiCantiere() {
      collabQuickAggiornaScelte();
      const testo = document.getElementById("collabQuickCantiere")?.value || "";
      document.getElementById("collabQuickSuggerimentiLavoro")?.classList.remove("aperto");
      collabQuickRenderSuggerimenti("collabQuickSuggerimentiCantiere", collabQuickFiltraValori(cantieriTutti(), testo), "collabQuickScegliCantiere");
    }

    function collabQuickMostraSuggerimentiLavoro() {
      collabQuickAggiornaScelte();
      const testo = document.getElementById("collabQuickLavoro")?.value || "";
      document.getElementById("collabQuickSuggerimentiCantiere")?.classList.remove("aperto");
      collabQuickRenderSuggerimenti("collabQuickSuggerimentiLavoro", collabQuickFiltraValori(collabQuickValoriLavori(), testo), "collabQuickScegliLavoro");
    }

    function collabQuickScegliCantiere(cantiere) {
      const input = document.getElementById("collabQuickCantiere");
      if (input) input.value = testoPulito(cantiere);
      collabQuickCambiaCantiere();
      collabQuickNascondiSuggerimenti();
    }

    function collabQuickScegliLavoro(lavoro) {
      const input = document.getElementById("collabQuickLavoro");
      if (input) input.value = testoPulito(lavoro);
      collabQuickNascondiSuggerimenti();
    }

    function collabQuickNascondiSuggerimenti() {
      document.getElementById("collabQuickSuggerimentiCantiere")?.classList.remove("aperto");
      document.getElementById("collabQuickSuggerimentiLavoro")?.classList.remove("aperto");
    }

    async function collabQuickSalva() {
      const nome = collabQuickNomeUtente();
      const cantiere = document.getElementById("collabQuickCantiere")?.value || "";
      const lavoro = document.getElementById("collabQuickLavoro")?.value || "";
      const oreQuick = Number(document.getElementById("collabQuickOre")?.value || 0);
      const pausaQuick = Number(document.getElementById("collabQuickPausa")?.value || 0);
      const notaQuick = document.getElementById("collabQuickNota")?.value || "";

      if (!cantiere) { alert("Scegli il cantiere."); return; }
      if (!lavoro) { alert("Scegli la tipologia di lavoro."); return; }
      if (!oreQuick || oreQuick <= 0) { alert("Inserisci le ore da segnare."); return; }

      const oggi = dataIsoOggi();
      document.getElementById("collaboratore").value = nome;
      document.getElementById("data").value = oggi;
      document.getElementById("cantiere").value = cantiere;
      document.getElementById("lavoro").value = lavoro;
      document.getElementById("oreManuali").value = String(oreQuick);
      document.getElementById("pausa").value = String(pausaQuick || 0);
      document.getElementById("nota").value = notaQuick;
      document.getElementById("inizio").value = "07:30";
      document.getElementById("fine").value = "17:00";
      aggiornaKmDaCantiere();
      aggiornaAnteprimaOre();

      await salvaOra();

      document.getElementById("collabQuickOre").value = "";
      document.getElementById("collabQuickNota").value = "";
      document.getElementById("collabQuickPausa").value = "0";
      collabQuickAggiornaScelte();
      collabQuickRenderOggi();
    }

    function collabQuickRenderOggi() {
      const box = document.getElementById("collabQuickOggi");
      const totaleBox = document.getElementById("collabQuickTotale");
      if (!box) return;
      const nome = collabQuickNomeUtente();
      const oggi = dataIsoOggi();
      const righe = ore.filter(r => String(r.collaboratore || "").trim().toLowerCase() === String(nome || "").trim().toLowerCase() && r.data === oggi);
      const totale = righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0);
      if (totaleBox) totaleBox.textContent = totale.toFixed(2);
      if (!righe.length) {
        box.innerHTML = '<h3>Oggi</h3><p class="note">Nessuna ora segnata oggi.</p>';
        return;
      }
      box.innerHTML = '<h3>Ore segnate oggi</h3>' + righe.map(r => `
        <div class="collab-today-item">
          <div><strong>${escapeHtml(r.cantiere || "")}</strong><br>${escapeHtml(r.lavoro || "")}${r.nota ? `<br><em>${escapeHtml(r.nota)}</em>` : ""}</div>
          <div class="collab-today-hours">${Number(r.totaleOre || 0).toFixed(2)} h</div>
        </div>
      `).join("");
    }

    function collabQuickApriResoconto() {
      const panel = document.getElementById("collabQuickMesePanel");
      const btn = document.getElementById("collabQuickResocontoBtn");
      if (!panel) return;
      const aperto = panel.classList.toggle("aperto");
      if (btn) btn.textContent = aperto ? "Chiudi resoconto mese" : "📅 Apri resoconto mese";
      collabQuickRenderMese();
    }

    function collabQuickMeseCorrente() {
      const oggi = dataIsoOggi();
      const anno = Number(oggi.slice(0, 4));
      const mese = Number(oggi.slice(5, 7));
      return { anno, mese };
    }

    function collabQuickNomeMese(mese) {
      return nomiMesiItaliani()[mese - 1] || "Mese";
    }

    function collabQuickRenderMese() {
      const box = document.getElementById("collabQuickMese");
      const panel = document.getElementById("collabQuickMesePanel");
      if (!box || !panel || !panel.classList.contains("aperto")) return;

      const nome = collabQuickNomeUtente();
      const { anno, mese } = collabQuickMeseCorrente();
      const giorniNelMese = new Date(anno, mese, 0).getDate();
      const prefisso = `${anno}-${String(mese).padStart(2, "0")}-`;
      const righe = ore.filter(r =>
        String(r.collaboratore || "").trim().toLowerCase() === String(nome || "").trim().toLowerCase()
        && String(r.data || "").startsWith(prefisso)
      );

      const orePerGiorno = {};
      righe.forEach(r => {
        const giorno = Number(String(r.data || "").slice(8, 10));
        if (!orePerGiorno[giorno]) orePerGiorno[giorno] = 0;
        orePerGiorno[giorno] += Number(r.totaleOre || 0);
      });
      const totale = righe.reduce((tot, r) => tot + Number(r.totaleOre || 0), 0);
      const nomiGiorni = ["Do", "Lu", "Ma", "Me", "Gi", "Ve", "Sa"];
      const dalMese = `${anno}-${String(mese).padStart(2, "0")}-01`;
      const alMese = `${anno}-${String(mese).padStart(2, "0")}-${String(giorniNelMese).padStart(2, "0")}`;
      const vacanzeApprovate = collabAppDateVacanzeApprovate(nome, dalMese, alMese);

      const thGiorni = Array.from({ length: giorniNelMese }, (_, i) => {
        const giorno = i + 1;
        const data = new Date(anno, mese - 1, giorno);
        const day = data.getDay();
        const iso = `${anno}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
        const clsBase = day === 0 ? "collab-month-sunday" : (day === 6 ? "collab-month-weekend" : "");
        const cls = vacanzeApprovate.has(iso) ? `${clsBase} collab-month-vacanza`.trim() : clsBase;
        const label = '';
        return `<th class="${cls}" title="${vacanzeApprovate.has(iso) ? 'Vacanza approvata' : ''}"><span class="collab-month-daynum">${giorno}</span><span class="collab-month-dayname">${nomiGiorni[day]}</span>${label}</th>`;
      }).join("");

      const tdOre = Array.from({ length: giorniNelMese }, (_, i) => {
        const giorno = i + 1;
        const data = new Date(anno, mese - 1, giorno);
        const day = data.getDay();
        const iso = `${anno}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
        const clsBase = day === 0 ? "collab-month-sunday" : (day === 6 ? "collab-month-weekend" : "");
        const cls = vacanzeApprovate.has(iso) ? `${clsBase} collab-month-vacanza`.trim() : clsBase;
        const valore = orePerGiorno[giorno] || 0;
        const contenuto = vacanzeApprovate.has(iso)
          ? (valore ? `<span class="collab-month-ore">${valore.toFixed(2).replace(".00", "")}</span>` : '')
          : (valore ? `<span class="collab-month-ore">${valore.toFixed(2).replace(".00", "")}</span>` : "");
        return `<td class="${cls}">${contenuto}</td>`;
      }).join("");

      box.innerHTML = `
        <div class="collab-month-head">
          <strong>${escapeHtml(collabQuickNomeMese(mese))} ${anno}</strong>
          <span class="collab-month-total">Totale ${totale.toFixed(2)} h</span>
        </div>
        <div class="collab-month-scroll">
          <table class="collab-month-table">
            <thead><tr><th>Giorno</th>${thGiorni}</tr></thead>
            <tbody><tr><td>Ore</td>${tdOre}</tr></tbody>
          </table>
        </div>
      `;
    }

    const renderizzaOriginaleVistaCollaboratore = renderizza;
    renderizza = function() {
      renderizzaOriginaleVistaCollaboratore();
      collabQuickAggiornaScelte();
      collabQuickRenderOggi();
      collabQuickRenderMese();
    };

    const applicaVistaRuoloSupabaseOriginaleCollaboratore = applicaVistaRuoloSupabase;
    applicaVistaRuoloSupabase = function() {
      applicaVistaRuoloSupabaseOriginaleCollaboratore();
      if (document.body.classList.contains("vista-collaboratore")) {
        collabAppEntraDirettoHome();
      } else {
        collabAppMostraSchermata("start");
      }
      collabQuickAggiornaScelte();
      collabQuickRenderOggi();
      collabQuickRenderMese();
      adminRichiesteVacanzeRender();
    };


    // === App collaboratore: prima schermata dati + home con 4 pulsanti ===
    const COLLAB_APP_DATI_KEY = "workhub_collab_app_dati_v1";
    const COLLAB_VACANZE_KEY = "workhub_collab_richieste_vacanze_v1";

    function collabAppCaricaDati() {
      try { return JSON.parse(localStorage.getItem(COLLAB_APP_DATI_KEY)) || {}; }
      catch (errore) { return {}; }
    }

    function collabAppSalvaDati(dati) {
      localStorage.setItem(COLLAB_APP_DATI_KEY, JSON.stringify(dati || {}));
    }

    function collabAppInit() {
      const oggi = dataIsoOggi();
      const dati = collabAppCaricaDati();
      const nomeInput = document.getElementById("collabAppNomeInput");
      const dataInput = document.getElementById("collabAppDataInput");
      const notaInput = document.getElementById("collabAppNotaInput");
      const nomeProfilo = collabQuickNomeUtente();
      if (nomeInput && !nomeInput.value) nomeInput.value = dati.nome || nomeProfilo;
      if (dataInput && !dataInput.value) dataInput.value = oggi;
      if (notaInput && !notaInput.value) notaInput.value = dati.nota || "";
      if (document.body.classList.contains("vista-collaboratore")) {
        collabAppEntraDirettoHome();
      }
      collabAppRenderVacanze();
      adminRichiesteVacanzeRender();
    }

    function collabAppEntraDirettoHome() {
      const oggi = dataIsoOggi();
      const nome = testoPulito(collabQuickNomeUtente() || document.getElementById("collabAppNomeInput")?.value || "Dipendente");
      const data = oggi;
      const nota = document.getElementById("collabAppNotaInput")?.value || "";
      const nomeInput = document.getElementById("collabAppNomeInput");
      const dataInput = document.getElementById("collabAppDataInput");
      const collaboratore = document.getElementById("collaboratore");
      const dataForm = document.getElementById("data");
      if (nomeInput) nomeInput.value = nome;
      if (dataInput) dataInput.value = data;
      if (collaboratore) collaboratore.value = nome;
      if (dataForm) dataForm.value = data;
      collabAppSalvaDati({ nome, data, nota });
      collabAppMostraSchermata("home");
      collabAppChiudiSezioni();
    }

    function collabAppMostraSchermata(nome) {
      document.getElementById("collabStartScreen")?.classList.toggle("attiva", nome === "start");
      document.getElementById("collabHomeScreen")?.classList.toggle("attiva", nome === "home");
      const titolo = document.getElementById("collabAppTitolo");
      if (titolo) titolo.textContent = nome === "home" ? "Area collaboratore" : "Accesso collaboratore";
    }

    function collabAppContinua() {
      const nome = testoPulito(document.getElementById("collabAppNomeInput")?.value || collabQuickNomeUtente());
      const data = document.getElementById("collabAppDataInput")?.value || dataIsoOggi();
      const nota = document.getElementById("collabAppNotaInput")?.value || "";
      if (!nome) { alert("Inserisci il nome collaboratore."); return; }
      document.getElementById("collaboratore").value = nome;
      document.getElementById("data").value = data;
      collabAppSalvaDati({ nome, data, nota });
      collabAppMostraSchermata("home");
      collabAppChiudiSezioni();
      collabQuickAggiornaScelte();
      collabQuickRenderOggi();
      collabQuickRenderMese();
    }

    function collabAppMostraSezione(sezione) {
      ["ore", "mese", "vacanze", "stampa"].forEach(nome => {
        const id = "collabView" + nome.charAt(0).toUpperCase() + nome.slice(1);
        document.getElementById(id)?.classList.toggle("attiva", nome === sezione);
      });
      const pannello = document.getElementById("collabQuickPanel");
      if (pannello) pannello.classList.toggle("aperto", sezione === "ore");
      collabQuickAggiornaScelte();
      collabQuickRenderOggi();
      collabQuickRenderMese();
      collabAppRenderVacanze();
      if (sezione === "ore") setTimeout(() => collabQuickMostraSuggerimentiCantiere(), 80);
    }

    function collabAppChiudiSezioni() {
      ["collabViewOre", "collabViewMese", "collabViewVacanze", "collabViewStampa"].forEach(id => document.getElementById(id)?.classList.remove("attiva"));
      document.getElementById("collabQuickPanel")?.classList.remove("aperto");
    }

    function collabAppCaricaVacanze() {
      try { return JSON.parse(localStorage.getItem(COLLAB_VACANZE_KEY)) || []; }
      catch (errore) { return []; }
    }

    function collabAppSalvaVacanze(lista) {
      localStorage.setItem(COLLAB_VACANZE_KEY, JSON.stringify(Array.isArray(lista) ? lista : []));
    }

    async function collabAppSalvaVacanza() {
      const nome = testoPulito(collabQuickNomeUtente() || document.getElementById("collabAppNomeInput")?.value || "Dipendente");
      const dal = document.getElementById("collabVacanzaDal")?.value || "";
      const al = document.getElementById("collabVacanzaAl")?.value || "";
      const motivo = testoPulito(document.getElementById("collabVacanzaMotivo")?.value || "");
      if (!dal || !al) { alert("Inserisci data inizio e data fine vacanza."); return; }
      if (al < dal) { alert("La data fine non può essere prima della data inizio."); return; }
      const richiesta = {
        id: creaId(),
        nome,
        dal,
        al,
        motivo,
        creata: new Date().toISOString(),
        stato: "Inviata",
        letta: false,
        origine: "app"
      };
      const lista = collabAppCaricaVacanze();
      lista.unshift(richiesta);
      collabAppSalvaVacanze(lista);
      await collabAppSalvaVacanzaOnline(richiesta);
      localStorage.setItem("workhub_ultima_richiesta_vacanza", JSON.stringify(richiesta));
      const motivoInput = document.getElementById("collabVacanzaMotivo");
      if (motivoInput) motivoInput.value = "";
      collabAppRenderVacanze();
      adminRichiesteVacanzeRender();
      const nota = document.getElementById("collabVacanzaEmailNota");
      if (nota) {
        nota.style.display = "block";
        nota.innerHTML = "Richiesta salvata. Per notifica email immediata, premi <strong>Apri email per admin</strong> e invia il messaggio.";
      }
      if (confirm("Richiesta vacanza salvata. Vuoi aprire subito l'email pronta per l'admin?")) {
        collabAppApriEmailVacanza(richiesta);
      }
    }

    async function collabAppSalvaVacanzaOnline(richiesta) {
      try {
        const client = inizializzaSupabase();
        const sessione = client ? await supabaseSessioneCorrente() : null;
        if (!client || !sessione || !supabaseProfilo) return false;
        const payload = {
          azienda_id: supabaseProfilo.azienda_id || null,
          collaboratore_id: supabaseUtente ? supabaseUtente.id : null,
          collaboratore_nome: richiesta.nome,
          dal: richiesta.dal,
          al: richiesta.al,
          motivo: richiesta.motivo || "",
          stato: richiesta.stato || "Inviata",
          letta: false,
          creata: richiesta.creata
        };
        const { error } = await client.from("richieste_vacanze").insert(payload);
        if (error) {
          console.warn("Richiesta vacanza salvata solo in locale. Tabella online non disponibile o campi diversi.", error);
          return false;
        }
        return true;
      } catch (errore) {
        console.warn("Richiesta vacanza salvata solo in locale.", errore);
        return false;
      }
    }

    function collabAppTestoEmailVacanza(richiesta) {
      return [
        `Buongiorno,`,
        ``,
        `richiedo vacanza per il periodo: ${fmtData(richiesta.dal)} - ${fmtData(richiesta.al)}.`,
        `Collaboratore: ${richiesta.nome || ""}`,
        richiesta.motivo ? `Messaggio: ${richiesta.motivo}` : `Messaggio: -`,
        ``,
        `Grazie.`
      ].join("\n");
    }

    function collabAppApriEmailVacanza(richiesta) {
      if (!richiesta) return;
      const destinatario = "info@tecnoplafon.ch";
      const oggetto = `Richiesta vacanza ${richiesta.nome || "collaboratore"} ${fmtData(richiesta.dal)} - ${fmtData(richiesta.al)}`;
      const corpo = collabAppTestoEmailVacanza(richiesta);
      window.location.href = `mailto:${destinatario}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
    }

    function collabAppApriEmailUltimaVacanza() {
      let richiesta = null;
      try { richiesta = JSON.parse(localStorage.getItem("workhub_ultima_richiesta_vacanza")); } catch (errore) { richiesta = null; }
      if (!richiesta) richiesta = collabAppCaricaVacanze()[0];
      if (!richiesta) { alert("Prima salva una richiesta vacanza."); return; }
      collabAppApriEmailVacanza(richiesta);
    }

    function collabAppRenderVacanze() {
      const box = document.getElementById("collabVacanzeLista");
      if (!box) return;
      const nome = String(collabQuickNomeUtente() || "").trim().toLowerCase();
      const lista = collabAppCaricaVacanze().filter(r => String(r.nome || "").trim().toLowerCase() === nome).slice(0, 8);
      if (!lista.length) {
        box.innerHTML = '<p class="note">Nessuna richiesta vacanza salvata.</p>';
        return;
      }
      box.innerHTML = '<h3>Le tue richieste</h3>' + lista.map(r => `
        <div class="collab-vacanza-item">
          <strong>${fmtData(r.dal)} - ${fmtData(r.al)}</strong><br>
          Stato: ${escapeHtml(r.stato || "Inviata")}${r.motivo ? `<br><em>${escapeHtml(r.motivo)}</em>` : ""}
        </div>
      `).join("");
    }



    function collabAppDatePeriodoInclusive(dal, al) {
      const date = [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dal || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(al || ""))) return date;
      let corrente = dal;
      let sicurezza = 0;
      while (corrente <= al && sicurezza < 370) {
        date.push(corrente);
        corrente = aggiungiGiorniISO(corrente, 1);
        sicurezza += 1;
      }
      return date;
    }

    function collabAppDateVacanzeApprovate(nome, dal, al) {
      const chiaveNome = String(nome || "").trim().toLowerCase();
      const date = new Set();
      if (!chiaveNome) return date;
      collabAppCaricaVacanze().forEach(r => {
        const nomeRichiesta = String(r.nome || r.collaboratore_nome || "").trim().toLowerCase();
        const approvata = String(r.stato || "").trim().toLowerCase() === "approvata";
        if (!approvata || nomeRichiesta !== chiaveNome) return;
        if (!r.dal || !r.al) return;
        collabAppDatePeriodoInclusive(r.dal, r.al).forEach(data => {
          if ((!dal || data >= dal) && (!al || data <= al)) date.add(data);
        });
      });
      return date;
    }

    function collabAppNomePerCalendario(righe) {
      const filtro = document.getElementById("filtroCollaboratore")?.value || "";
      return testoPulito(filtro || (righe && righe[0] ? righe[0].collaboratore : "") || collabQuickNomeUtente() || document.getElementById("collaboratore")?.value || "");
    }

    function collabAppAggiungiVacanzaApprovataAlCalendario(richiesta) {
      if (!richiesta || !richiesta.dal || !richiesta.al) return;
      // La marcatura verde viene calcolata dalle richieste con stato Approvata.
      // Aggiorniamo anche il resoconto aperto e la stampa mensile.
      collabQuickRenderMese();
      if (typeof renderizza === "function") renderizza();
    }

    function adminRichiesteVacanzeTutte() {
      return collabAppCaricaVacanze().sort((a, b) => String(b.creata || "").localeCompare(String(a.creata || "")));
    }

    function adminRichiesteVacanzeRender(listaOpzionale) {
      const box = document.getElementById("adminRichiesteVacanzeLista");
      const stato = document.getElementById("adminRichiesteVacanzeStato");
      const badge = document.getElementById("adminRichiesteVacanzeBadge");
      if (!box) return;
      const lista = Array.isArray(listaOpzionale) ? listaOpzionale : adminRichiesteVacanzeTutte();
      const nuove = lista.filter(r => !r.letta && String(r.stato || "").toLowerCase() !== "approvata" && String(r.stato || "").toLowerCase() !== "rifiutata").length;
      if (badge) {
        badge.textContent = String(nuove);
        badge.style.display = nuove ? "inline-flex" : "none";
      }
      if (stato) stato.textContent = lista.length ? `${lista.length} richiesta/e vacanza trovate.` : "Nessuna richiesta vacanza trovata.";
      if (!lista.length) {
        box.innerHTML = '<p class="note">Nessuna richiesta salvata. Quando un collaboratore chiede vacanza, apparirà qui.</p>';
        return;
      }
      box.innerHTML = lista.map(r => `
        <div class="admin-vacanza-card ${!r.letta ? "nuova" : ""}">
          <div class="admin-vacanza-head">
            <div>
              <strong>${escapeHtml(r.nome || r.collaboratore_nome || "Collaboratore")}</strong><br>
              <span>${fmtData(r.dal)} - ${fmtData(r.al)}</span>
            </div>
            <span class="admin-vacanza-stato">${escapeHtml(r.stato || "Inviata")}</span>
          </div>
          ${r.motivo ? `<p>${escapeHtml(r.motivo)}</p>` : '<p class="note">Nessun messaggio.</p>'}
          <p class="note">Ricevuta: ${r.creata ? new Date(r.creata).toLocaleString("it-CH") : "-"}</p>
          <div class="admin-vacanza-actions">
            <button type="button" class="secondary small" onclick="adminRichiesteVacanzeImpostaStato('${escapeAttribute(r.id || "")}', 'Approvata')">Approva e segna verde</button>
            <button type="button" class="secondary small" onclick="adminRichiesteVacanzeImpostaStato('${escapeAttribute(r.id || "")}', 'Rifiutata')">Rifiuta</button>
            <button type="button" class="secondary small" onclick="adminRichiesteVacanzeEmail('${escapeAttribute(r.id || "")}')">Email risposta</button>
          </div>
        </div>
      `).join("");
    }

    function adminRichiesteVacanzeImpostaStato(id, statoNuovo) {
      const lista = collabAppCaricaVacanze();
      let richiestaAggiornata = null;
      const aggiornata = lista.map(r => {
        if (r.id !== id) return r;
        richiestaAggiornata = { ...r, stato: statoNuovo, letta: true, rispostaData: new Date().toISOString() };
        return richiestaAggiornata;
      });
      collabAppSalvaVacanze(aggiornata);
      if (statoNuovo === "Approvata" && richiestaAggiornata) {
        collabAppAggiungiVacanzaApprovataAlCalendario(richiestaAggiornata);
        alert("Vacanza approvata: i giorni vengono segnati in verde nel calendario/resoconto del collaboratore.");
      }
      adminRichiesteVacanzeRender();
      collabAppRenderVacanze();
    }

    function adminRichiesteVacanzeEmail(id) {
      const richiesta = collabAppCaricaVacanze().find(r => r.id === id);
      if (!richiesta) return;
      const oggetto = `Risposta richiesta vacanza ${richiesta.nome || "collaboratore"}`;
      const corpo = [
        `Buongiorno ${richiesta.nome || ""},`,
        ``,
        `abbiamo ricevuto la tua richiesta vacanza per il periodo ${fmtData(richiesta.dal)} - ${fmtData(richiesta.al)}.`,
        `Stato: ${richiesta.stato || "Inviata"}.`,
        ``,
        `Cordiali saluti,`,
        `Tecnoplafon`
      ].join("\n");
      window.location.href = `mailto:?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
    }

    async function adminRichiesteVacanzeCaricaOnline() {
      const stato = document.getElementById("adminRichiesteVacanzeStato");
      try {
        const client = inizializzaSupabase();
        const sessione = client ? await supabaseSessioneCorrente() : null;
        if (!client || !sessione) {
          if (stato) stato.textContent = "Non collegato online. Mostro le richieste salvate su questo dispositivo.";
          adminRichiesteVacanzeRender();
          return;
        }
        const { data, error } = await client.from("richieste_vacanze").select("*").order("creata", { ascending: false }).limit(80);
        if (error) {
          console.warn(error);
          if (stato) stato.textContent = "Tabella richieste_vacanze non trovata o non configurata. Per ora uso le richieste locali.";
          adminRichiesteVacanzeRender();
          return;
        }
        const locali = collabAppCaricaVacanze();
        const online = (data || []).map(r => ({
          id: String(r.id || creaId()),
          nome: r.collaboratore_nome || r.nome || "Collaboratore",
          dal: r.dal,
          al: r.al,
          motivo: r.motivo || "",
          stato: r.stato || "Inviata",
          letta: Boolean(r.letta),
          creata: r.creata || r.created_at || new Date().toISOString(),
          origine: "online"
        }));
        const mappa = new Map();
        [...online, ...locali].forEach(r => mappa.set(r.id || `${r.nome}-${r.dal}-${r.al}-${r.creata}`, r));
        const unite = Array.from(mappa.values()).sort((a, b) => String(b.creata || "").localeCompare(String(a.creata || "")));
        adminRichiesteVacanzeRender(unite);
      } catch (errore) {
        console.warn(errore);
        if (stato) stato.textContent = "Non riesco a leggere online. Mostro le richieste locali.";
        adminRichiesteVacanzeRender();
      }
    }

    function adminRichiesteVacanzeEsporta() {
      adminRichiesteVacanzeRender();
      window.print();
    }

    function collabAppStampaMese() {
      const nome = collabQuickNomeUtente();
      const filtro = document.getElementById("filtroCollaboratore");
      if (filtro) filtro.value = nome;
      if (typeof scegliCollaboratoreFiltro === "function") scegliCollaboratoreFiltro(nome);
      if (typeof stampaMensile === "function") stampaMensile();
      else window.print();
    }

    function collabAppStampaSchermata() {
      window.print();
    }

    const collabQuickApriChiudiOriginaleApp = collabQuickApriChiudi;
    collabQuickApriChiudi = function() {
      collabAppMostraSezione("ore");
      const btn = document.getElementById("collabQuickApriBtn");
      if (btn) btn.textContent = "Inserimento ore";
    };

    document.addEventListener("DOMContentLoaded", function() {
      collabAppInit();
      adminRichiesteVacanzeRender();
      setTimeout(function() { collabAppInit(); adminRichiesteVacanzeRender(); }, 500);
    });


/* Estratto da script inline HTML: id="ricercaRapidaSafeScript" */
(function() {
  function testoPulitoRicerca(testo) {
    return String(testo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }
  function filtraContenitore(input, contenitore) {
    if (!input || !contenitore) return;
    const query = testoPulitoRicerca(input.value);
    Array.from(contenitore.children || []).forEach(function(el) {
      const testo = testoPulitoRicerca(el.textContent);
      el.classList.toggle('ricerca-nascosto-safe', !!query && testo.indexOf(query) === -1);
    });
  }
  function aggiungiRicerca(idContenitore, placeholder) {
    const contenitore = document.getElementById(idContenitore);
    if (!contenitore || contenitore.dataset.ricercaRapidaSafe === '1') return;
    contenitore.dataset.ricercaRapidaSafe = '1';
    const box = document.createElement('div');
    box.className = 'ricerca-rapida-safe-box no-print';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = placeholder || 'Ricerca rapida...';
    input.autocomplete = 'off';
    box.appendChild(input);
    contenitore.parentNode.insertBefore(box, contenitore);
    input.addEventListener('input', function() { filtraContenitore(input, contenitore); });
    new MutationObserver(function() { filtraContenitore(input, contenitore); }).observe(contenitore, { childList: true, subtree: false });
  }
  function inizializzaRicercheRapide() {
    aggiungiRicerca('operaiListaAlta', 'Cerca operaio...');
    aggiungiRicerca('operaiListaSinistra', 'Cerca operaio...');
    aggiungiRicerca('collaboratoriSalvati', 'Cerca collaboratore...');
    aggiungiRicerca('cantieriSalvati', 'Cerca cantiere...');
    aggiungiRicerca('lavoriSalvati', 'Cerca tipologia di lavoro...');
  }
  document.addEventListener('DOMContentLoaded', function() {
    inizializzaRicercheRapide();
    setTimeout(inizializzaRicercheRapide, 500);
    if (typeof window.renderizza === 'function' && !window.renderizza.__ricercaRapidaSafePatch) {
      const renderizzaOriginale = window.renderizza;
      window.renderizza = function() {
        const risultato = renderizzaOriginale.apply(this, arguments);
        setTimeout(inizializzaRicercheRapide, 0);
        return risultato;
      };
      window.renderizza.__ricercaRapidaSafePatch = true;
    }
  });
})();

(function () {
  "use strict";

  const ID_REPARTI_PREDEFINITI = {
    "1": "Intonaco",
    "2": "Gesso",
    "3": "Isolazione",
    "4": "Cartongesso",
    "5": "Pittura",
    "6": "Artigiani",
    "7": "Dividere"
  };

  const VOCI_PREDEFINITE_PER_ID = [
    { id: 1, reparto: "Intonaco", voce: "Intonaco" },
    { id: 1, reparto: "Intonaco", voce: "Paraspigoli intonaco" },
    { id: 1, reparto: "Intonaco", voce: "Mazzette intonaco" },
    { id: 1, reparto: "Intonaco", voce: "Rete intonaco" },
    { id: 1, reparto: "Intonaco", voce: "Rasatura intonaco" },
    { id: 1, reparto: "Intonaco", voce: "Stabilitura intonaco" },
    { id: 2, reparto: "Gesso", voce: "Gesso" },
    { id: 2, reparto: "Gesso", voce: "Rasatura gesso" },
    { id: 3, reparto: "Isolazione", voce: "Isolazione" },
    { id: 4, reparto: "Cartongesso", voce: "Montaggio guide" },
    { id: 4, reparto: "Cartongesso", voce: "Montaggio lastre" },
    { id: 4, reparto: "Cartongesso", voce: "Controsoffitto" },
    { id: 5, reparto: "Pittura", voce: "Pittura" }
  ];

  const SUGGERIMENTI_PER_ID = [
    { id: 1, reparto: "Intonaco", parole: ["intonaco", "paraspigolo", "paraspigoli", "mazzette", "rasatura intonaco", "rete", "stabilitura", "arriccio"] },
    { id: 2, reparto: "Gesso", parole: ["gesso", "scagliola", "rasatura gesso", "lisciatura"] },
    { id: 3, reparto: "Isolazione", parole: ["isolazione", "isolamento", "lana", "cappotto"] },
    { id: 4, reparto: "Cartongesso", parole: ["cartongesso", "lastra", "lastre", "guide", "montanti", "controsoffitto", "parete"] },
    { id: 5, reparto: "Pittura", parole: ["pittura", "fondo", "smalto", "vernice", "tinteggio"] },
    { id: 6, reparto: "Artigiani", parole: ["artigiano", "artigiani", "regia"] },
    { id: 7, reparto: "Dividere", parole: ["dividere", "divisione", "ripartire"] }
  ];

  function pulisci(testo) {
    return String(testo || "").trim().replace(/\s+/g, " ");
  }

  function chiave(testo) {
    return pulisci(testo).toLocaleLowerCase("it-CH").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function idDaRicerca(testo) {
    const m = String(testo || "").toLowerCase().match(/(?:^|\s)(?:id\s*)?(\d+)(?:\s|$)/);
    return m ? Number(m[1]) : 0;
  }

  function accessoVociMenu() {
    try { if (typeof vociMenu === "object" && vociMenu) return vociMenu; } catch (e) {}
    return null;
  }

  function accessoOre() {
    try { if (Array.isArray(ore)) return ore; } catch (e) {}
    return [];
  }

  function suggerisciIdDaVoce(voce) {
    const testo = chiave(voce);
    if (!testo) return null;
    for (const regola of SUGGERIMENTI_PER_ID) {
      if (regola.parole.some(p => testo.includes(chiave(p)))) return { id: Number(regola.id), reparto: regola.reparto };
    }
    return null;
  }

  function normalizzaLavoriMeta() {
    const menu = accessoVociMenu();
    if (!menu) return {};
    if (!Array.isArray(menu.lavori)) menu.lavori = [];
    if (!menu.lavoriMeta || typeof menu.lavoriMeta !== "object" || Array.isArray(menu.lavoriMeta)) menu.lavoriMeta = {};

    // Precarica esempi utili per l'economico gestionale, senza duplicare le voci esistenti.
    VOCI_PREDEFINITE_PER_ID.forEach(item => {
      const esistente = menu.lavori.find(x => chiave(x) === chiave(item.voce));
      const voceFinale = esistente || item.voce;
      if (!esistente) menu.lavori.push(voceFinale);
      if (!menu.lavoriMeta[voceFinale]) menu.lavoriMeta[voceFinale] = { id: item.id, reparto: item.reparto };
    });

    menu.lavori.forEach(voce => {
      const nome = pulisci(voce);
      if (!nome) return;
      if (!menu.lavoriMeta[nome]) {
        const suggerita = suggerisciIdDaVoce(nome);
        if (suggerita) menu.lavoriMeta[nome] = suggerita;
      }
    });

    menu.lavori = Array.from(new Map(menu.lavori.map(x => [chiave(x), pulisci(x)])).values()).sort((a, b) => a.localeCompare(b));
    return menu.lavoriMeta;
  }

  function metaLavoro(voce) {
    const menu = accessoVociMenu();
    if (!menu) return { id: "", reparto: "" };
    const meta = normalizzaLavoriMeta();
    const nome = pulisci(voce);
    const salvata = (menu.lavori || []).find(x => chiave(x) === chiave(nome)) || nome;
    const m = meta[salvata] || meta[nome] || suggerisciIdDaVoce(nome) || {};
    return { id: m.id ? Number(m.id) : "", reparto: pulisci(m.reparto || ID_REPARTI_PREDEFINITI[String(m.id)] || "") };
  }

  function salvaMenu() {
    try { if (typeof salvaVociMenu === "function") salvaVociMenu(); return; } catch (e) {}
    try { if (typeof VOCI_KEY !== "undefined") localStorage.setItem(VOCI_KEY, JSON.stringify(accessoVociMenu())); } catch (e) {}
  }

  function lavoriConId(id) {
    const menu = accessoVociMenu();
    if (!menu || !id) return [];
    normalizzaLavoriMeta();
    return (menu.lavori || []).filter(voce => Number(metaLavoro(voce).id) === Number(id));
  }

  function etichettaLavoro(voce) {
    const meta = metaLavoro(voce);
    return meta.id ? "ID " + meta.id + " - " + meta.reparto + " - " + voce : voce;
  }

  function lavoriFiltratiConId(testo) {
    const menu = accessoVociMenu();
    const ricerca = chiave(testo || "");
    const id = idDaRicerca(testo);
    let lavori = [];
    if (menu) {
      normalizzaLavoriMeta();
      lavori = (menu.lavori || []).slice();
    }
    accessoOre().forEach(r => { if (r && r.lavoro) lavori.push(r.lavoro); });
    lavori = Array.from(new Map(lavori.map(x => [chiave(x), pulisci(x)])).values()).filter(Boolean).sort((a, b) => a.localeCompare(b));
    if (id) return lavori.filter(voce => Number(metaLavoro(voce).id) === Number(id)).slice(0, 30);
    if (!ricerca) return lavori.slice(0, 30);
    return lavori.filter(voce => {
      const meta = metaLavoro(voce);
      const testoCompleto = chiave([voce, meta.id ? "id" + meta.id : "", meta.id || "", meta.reparto || ""].join(" "));
      return testoCompleto.includes(ricerca);
    }).slice(0, 30);
  }

  window.aggiungiLavoroConId = function aggiungiLavoroConId() {
    const inputVoce = document.getElementById("nuovoLavoro");
    const inputId = document.getElementById("nuovoLavoroId");
    const inputReparto = document.getElementById("nuovoLavoroReparto");
    const voce = pulisci(inputVoce ? inputVoce.value : "");
    const id = Number(inputId ? inputId.value : 0);
    const reparto = pulisci(inputReparto ? inputReparto.value : "") || ID_REPARTI_PREDEFINITI[String(id)] || "";
    if (!voce) return alert("Scrivi la lavorazione. Esempio: Paraspigoli intonaco.");
    if (!id || id < 1) return alert("Inserisci ID. Esempio: 1 per Intonaco.");
    if (!reparto) return alert("Scrivi il gruppo/reparto. Esempio: Intonaco.");
    const menu = accessoVociMenu();
    if (!menu) return alert("Menu lavorazioni non ancora pronto. Riprova dopo il caricamento.");
    normalizzaLavoriMeta();
    const esistente = menu.lavori.find(x => chiave(x) === chiave(voce));
    const voceFinale = esistente || voce;
    if (!esistente) menu.lavori.push(voceFinale);
    menu.lavoriMeta[voceFinale] = { id, reparto };
    if (inputVoce) inputVoce.value = "";
    if (inputId) inputId.value = "";
    if (inputReparto) inputReparto.value = "";
    salvaMenu();
    aggiornaIdLavorazioniStorico();
    refreshWorkhub();
    alert("Lavorazione salvata: ID " + id + " - " + reparto + " - " + voceFinale);
  };

  window.mostraLavorazioniPerIdGestione = function mostraLavorazioniPerIdGestione() {
    const input = document.getElementById("richiamaLavoroId");
    const box = document.getElementById("lavoriPerIdGestione");
    if (!box) return;
    const id = idDaRicerca(input ? input.value : "");
    const valori = lavoriConId(id);
    if (!id) {
      box.innerHTML = '<p class="note">Scrivi un ID, per esempio 1.</p>';
      return;
    }
    if (!valori.length) {
      box.innerHTML = '<p class="note">Nessuna lavorazione trovata per ID ' + id + '.</p>';
      return;
    }
    box.innerHTML = valori.map(voce => {
      const meta = metaLavoro(voce);
      return '<button type="button" class="tag lavoro-id-tag" data-voce="' + escapeAttribute(voce) + '" onclick="selezionaLavoroGestione(this.dataset.voce)"><strong>ID ' + meta.id + '</strong> ' + escapeHtml(meta.reparto) + ' - ' + escapeHtml(voce) + '</button>';
    }).join("");
  };

  window.workhubMetaLavoro = metaLavoro;
  window.workhubLavoriFiltratiConId = lavoriFiltratiConId;

  function aggiornaIdLavorazioniStorico() {
    accessoOre().forEach(riga => {
      const meta = metaLavoro(riga.lavoro || "");
      if (meta.id) {
        riga.lavoro_id = meta.id;
        riga.lavoro_reparto = meta.reparto;
      }
    });
    try { if (typeof STORAGE_KEY !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(accessoOre())); } catch (e) {}
  }
  window.aggiornaIdLavorazioniStorico = aggiornaIdLavorazioniStorico;

  function patchRenderSuggerimenti() {
    if (typeof renderSuggerimentiRicerca === "function" && !renderSuggerimentiRicerca.__idEconomico) {
      const originale = renderSuggerimentiRicerca;
      const patch = function (boxId, valori, selezionaFnNome) {
        if (boxId === "suggerimentiLavoro") {
          const box = document.getElementById(boxId);
          if (!box) return;
          if (!valori.length) {
            box.innerHTML = '<div class="suggerimento-vuoto">Nessuna voce trovata.</div>';
            box.classList.add("aperto");
            return;
          }
          box.innerHTML = valori.map(voce => '<button type="button" class="suggerimento-voce" data-voce="' + escapeAttribute(voce) + '" onclick="' + selezionaFnNome + '(this.dataset.voce)">' + escapeHtml(etichettaLavoro(voce)) + '</button>').join("");
          box.classList.add("aperto");
          return;
        }
        return originale.apply(this, arguments);
      };
      patch.__idEconomico = true;
      try { renderSuggerimentiRicerca = patch; } catch (e) {}
    }

    if (typeof collabQuickRenderSuggerimenti === "function" && !collabQuickRenderSuggerimenti.__idEconomico) {
      const originaleQuick = collabQuickRenderSuggerimenti;
      const patchQuick = function (boxId, valori, nomeFunzioneScelta) {
        if (boxId === "collabQuickSuggerimentiLavoro") {
          const box = document.getElementById(boxId);
          if (!box) return;
          box.setAttribute("role", "listbox");
          if (!valori.length) {
            box.innerHTML = '<div class="suggerimento-vuoto">Nessuna voce trovata.</div>';
            box.classList.add("aperto");
            return;
          }
          box.innerHTML = valori.map(voce => '<button type="button" class="suggerimento-voce" role="option" data-voce="' + escapeAttribute(voce) + '" onclick="' + nomeFunzioneScelta + '(this.dataset.voce)" onpointerdown="event.preventDefault(); ' + nomeFunzioneScelta + '(this.dataset.voce)" ontouchstart="event.preventDefault(); ' + nomeFunzioneScelta + '(this.dataset.voce)">' + escapeHtml(etichettaLavoro(voce)) + '</button>').join("");
          box.classList.add("aperto");
          return;
        }
        return originaleQuick.apply(this, arguments);
      };
      patchQuick.__idEconomico = true;
      try { collabQuickRenderSuggerimenti = patchQuick; } catch (e) {}
    }
  }

  function patchFunzioniLavori() {
    if (typeof mostraSuggerimentiLavoro === "function" && !mostraSuggerimentiLavoro.__idEconomico) {
      const patch = function () {
        try { if (typeof aggiornaMenuTendinaBase === "function") aggiornaMenuTendinaBase(); } catch (e) {}
        const testo = document.getElementById("lavoro")?.value || "";
        renderSuggerimentiRicerca("suggerimentiLavoro", lavoriFiltratiConId(testo), "scegliSuggerimentoLavoro");
      };
      patch.__idEconomico = true;
      try { mostraSuggerimentiLavoro = patch; } catch (e) {}
    }

    if (typeof collabQuickMostraSuggerimentiLavoro === "function" && !collabQuickMostraSuggerimentiLavoro.__idEconomico) {
      const patchQuick = function () {
        try { if (typeof collabQuickAggiornaScelte === "function") collabQuickAggiornaScelte(); } catch (e) {}
        const testo = document.getElementById("collabQuickLavoro")?.value || "";
        document.getElementById("collabQuickSuggerimentiCantiere")?.classList.remove("aperto");
        collabQuickRenderSuggerimenti("collabQuickSuggerimentiLavoro", lavoriFiltratiConId(testo), "collabQuickScegliLavoro");
      };
      patchQuick.__idEconomico = true;
      try { collabQuickMostraSuggerimentiLavoro = patchQuick; } catch (e) {}
    }

    if (typeof aggiornaSelectLavoriGestione === "function" && !aggiornaSelectLavoriGestione.__idEconomico) {
      const patchSelect = function () {
        const select = document.getElementById("selectLavoroGestione");
        if (!select) return;
        const valoreCorrente = select.value;
        const lavori = lavoriFiltratiConId("");
        select.innerHTML = '<option value="">Seleziona lavoro svolto</option>';
        lavori.forEach(lavoro => {
          const opt = document.createElement("option");
          opt.value = lavoro;
          opt.textContent = etichettaLavoro(lavoro);
          select.appendChild(opt);
        });
        select.value = lavori.includes(valoreCorrente) ? valoreCorrente : "";
      };
      patchSelect.__idEconomico = true;
      try { aggiornaSelectLavoriGestione = patchSelect; } catch (e) {}
    }

    if (typeof aggiornaMenuTendinaBase === "function" && !aggiornaMenuTendinaBase.__idEconomico) {
      const originale = aggiornaMenuTendinaBase;
      const patchBase = function () {
        const risultato = originale.apply(this, arguments);
        try { riempiDatalist("listaLavori", lavoriFiltratiConId("")); } catch (e) {}
        try { riempiDatalist("collabQuickListaLavori", lavoriFiltratiConId("")); } catch (e) {}
        return risultato;
      };
      patchBase.__idEconomico = true;
      try { aggiornaMenuTendinaBase = patchBase; } catch (e) {}
    }
  }

  function patchSalvataggio() {
    if (typeof salvaStorage === "function" && !salvaStorage.__idEconomico) {
      const originale = salvaStorage;
      const patch = function () { aggiornaIdLavorazioniStorico(); return originale.apply(this, arguments); };
      patch.__idEconomico = true;
      try { salvaStorage = patch; } catch (e) {}
    }
    if (typeof salvaOra === "function" && !salvaOra.__idEconomico) {
      const originale = salvaOra;
      const patch = function () { const res = originale.apply(this, arguments); setTimeout(function () { aggiornaIdLavorazioniStorico(); refreshWorkhub(false); }, 0); return res; };
      patch.__idEconomico = true;
      try { salvaOra = patch; } catch (e) {}
    }
    if (typeof collabQuickSalva === "function" && !collabQuickSalva.__idEconomico) {
      const originale = collabQuickSalva;
      const patch = function () { const res = originale.apply(this, arguments); setTimeout(function () { aggiornaIdLavorazioniStorico(); refreshWorkhub(false); }, 0); return res; };
      patch.__idEconomico = true;
      try { collabQuickSalva = patch; } catch (e) {}
    }
  }

  function mostraBadgeLavori() {
    const box = document.getElementById("lavoriSalvati");
    const menu = accessoVociMenu();
    if (!box || !menu) return;
    setTimeout(function () {
      box.querySelectorAll(".tag").forEach(tag => {
        if (tag.querySelector(".workhub-id-badge")) return;
        const testo = tag.textContent || "";
        const voce = (menu.lavori || []).find(x => testo.includes(x));
        if (!voce) return;
        const meta = metaLavoro(voce);
        if (!meta.id) return;
        const badge = document.createElement("span");
        badge.className = "workhub-id-badge";
        badge.textContent = "ID " + meta.id + " " + meta.reparto;
        tag.insertBefore(badge, tag.firstChild);
      });
    }, 0);
  }

  function patchRender() {
    if (typeof aggiornaVociVisibili === "function" && !aggiornaVociVisibili.__idEconomico) {
      const originale = aggiornaVociVisibili;
      const patch = function () { const res = originale.apply(this, arguments); mostraBadgeLavori(); return res; };
      patch.__idEconomico = true;
      try { aggiornaVociVisibili = patch; } catch (e) {}
    }
  }

  function refreshWorkhub(renderizzaAnche) {
    try { if (typeof aggiornaMenuTendina === "function") aggiornaMenuTendina(); } catch (e) {}
    try { if (typeof aggiornaVociVisibili === "function") aggiornaVociVisibili(); } catch (e) {}
    if (renderizzaAnche !== false) try { if (typeof renderizza === "function") renderizza(); } catch (e) {}
  }

  function avvio() {
    normalizzaLavoriMeta();
    salvaMenu();
    aggiornaIdLavorazioniStorico();
    patchRenderSuggerimenti();
    patchFunzioniLavori();
    patchSalvataggio();
    patchRender();
    refreshWorkhub(false);
    mostraBadgeLavori();
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(avvio, 300);
    setTimeout(avvio, 1200);
  });
  setTimeout(avvio, 800);
})();
/* === FIX RICHIESTE VACANZE SUPABASE === */
(function () {
  const TABELLA = "richieste_vacanze";
  const AZIENDA_ID = "21af7afa-cbcb-45b9-9a84-f9f9ad68b7fd";

  function pulito(v) {
    return String(v == null ? "" : v).trim();
  }

  function nuovoId() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (_) {}
    return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function prendiClientSupabase() {
    try {
      if (typeof inizializzaSupabase === "function") {
        const c = inizializzaSupabase();
        if (c && typeof c.from === "function") return c;
      }
    } catch (_) {}

    const possibili = [
      window.supabaseClient,
      window.supabaseDb,
      window.supabaseClientOnline,
      window.clientSupabase,
      window.supabaseWorkhub
    ];

    for (const c of possibili) {
      if (c && typeof c.from === "function") return c;
    }

    return null;
  }

  async function emailCorrente(client) {
    try {
      if (window.supabaseUtente && window.supabaseUtente.email) {
        return String(window.supabaseUtente.email);
      }

      if (client && client.auth && typeof client.auth.getUser === "function") {
        const res = await client.auth.getUser();
        if (res && res.data && res.data.user && res.data.user.email) {
          return String(res.data.user.email);
        }
      }
    } catch (_) {}

    return "";
  }

  function normalizzaRichiesta(r) {
    return {
      id: String(r.id || nuovoId()),
      nome: pulito(r.collaboratore || r.collaboratore_nome || r.nome || "Collaboratore"),
      collaboratore: pulito(r.collaboratore || r.collaboratore_nome || r.nome || "Collaboratore"),
      email_collaboratore: pulito(r.email_collaboratore || r.email || ""),
      dal: pulito(r.dal || r.data_dal || r.inizio || ""),
      al: pulito(r.al || r.data_al || r.fine || ""),
      motivo: pulito(r.nota || r.motivo || r.messaggio || ""),
      stato: pulito(r.stato || "in_attesa"),
      letta: String(r.stato || "").toLowerCase() !== "in_attesa",
      creata: pulito(r.creata || r.creato_il || r.created_at || r.dal || new Date().toISOString()),
      origine: "online"
    };
  }

  function caricaVacanzeLocaleFix() {
    if (typeof collabAppCaricaVacanze === "function") {
      return collabAppCaricaVacanze();
    }

    try {
      return JSON.parse(localStorage.getItem("richieste_vacanze") || "[]");
    } catch (_) {
      return [];
    }
  }

  function salvaVacanzeLocaleFix(lista) {
    if (typeof collabAppSalvaVacanze === "function") {
      collabAppSalvaVacanze(lista);
      return;
    }

    try {
      localStorage.setItem("richieste_vacanze", JSON.stringify(lista));
    } catch (_) {}
  }

  function unisciOnlineLocale(righeOnline) {
    const mappa = new Map();

    (righeOnline || []).forEach(r => {
      const item = normalizzaRichiesta(r);
      mappa.set(String(item.id), item);
    });

    caricaVacanzeLocaleFix().forEach(r => {
      const id = String(r.id || `${r.nome || r.collaboratore}-${r.dal}-${r.al}`);
      if (!mappa.has(id)) mappa.set(id, r);
    });

    const lista = Array.from(mappa.values()).sort((a, b) =>
      String(b.creata || b.dal || "").localeCompare(String(a.creata || a.dal || ""))
    );

    salvaVacanzeLocaleFix(lista);
    return lista;
  }

  window.collabAppSalvaVacanzaOnline = async function (richiesta) {
    const client = prendiClientSupabase();

    if (!client) {
      console.warn("Supabase non trovato: salvo solo locale.");
      return false;
    }

    try {
      const email = await emailCorrente(client);

      const payload = {
        azienda_id: AZIENDA_ID,
        collaboratore: pulito(richiesta.nome || richiesta.collaboratore || "Collaboratore"),
        email_collaboratore: email || pulito(richiesta.email_collaboratore || ""),
        dal: richiesta.dal,
        al: richiesta.al,
        nota: pulito(richiesta.motivo || richiesta.nota || ""),
        stato: "in_attesa"
      };

      const res = await client
        .from(TABELLA)
        .insert(payload)
        .select("*")
        .single();

      if (res.error) throw res.error;

      if (res.data) {
        richiesta.id = res.data.id || richiesta.id;
        richiesta.origine = "online";
        richiesta.stato = res.data.stato || "in_attesa";
      }

      return true;
    } catch (err) {
      console.warn("Errore salvataggio Supabase richiesta vacanza:", err);
      return false;
    }
  };

  window.adminRichiesteVacanzeCaricaOnline = async function () {
    const stato = document.getElementById("adminRichiesteVacanzeStato");
    const client = prendiClientSupabase();

    if (!client) {
      if (stato) stato.textContent = "Supabase non trovato. Mostro solo richieste salvate su questo dispositivo.";
      if (typeof adminRichiesteVacanzeRender === "function") adminRichiesteVacanzeRender();
      return;
    }

    try {
      if (stato) stato.textContent = "Carico richieste vacanze da Supabase...";

      const res = await client
        .from(TABELLA)
        .select("*")
        .order("dal", { ascending: false })
        .limit(200);

      if (res.error) throw res.error;

      const lista = unisciOnlineLocale(res.data || []);

      if (typeof adminRichiesteVacanzeRender === "function") {
        adminRichiesteVacanzeRender(lista);
      }

      if (stato) {
        stato.textContent = "Richieste caricate da Supabase: " + (res.data || []).length + ".";
      }
    } catch (err) {
      console.warn("Errore caricamento richieste vacanze:", err);
      if (stato) stato.textContent = "Errore caricamento Supabase: " + (err.message || err);
      if (typeof adminRichiesteVacanzeRender === "function") adminRichiesteVacanzeRender();
    }
  };

  window.adminRichiesteVacanzeImpostaStato = async function (id, statoNuovo) {
    const lista = caricaVacanzeLocaleFix();

    const aggiornata = lista.map(r => {
      if (String(r.id) !== String(id)) return r;
      return {
        ...r,
        stato: statoNuovo,
        letta: true,
        rispostaData: new Date().toISOString()
      };
    });

    salvaVacanzeLocaleFix(aggiornata);

    try {
      const client = prendiClientSupabase();
      if (client && id) {
        await client.from(TABELLA).update({ stato: statoNuovo }).eq("id", id);
      }
    } catch (err) {
      console.warn("Stato richiesta aggiornato solo locale:", err);
    }

    if (typeof adminRichiesteVacanzeRender === "function") {
      adminRichiesteVacanzeRender(aggiornata);
    }

    if (typeof collabAppRenderVacanze === "function") {
      collabAppRenderVacanze();
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      if (typeof adminRichiesteVacanzeCaricaOnline === "function") {
        adminRichiesteVacanzeCaricaOnline();
      }
    }, 1500);
  });
})();
