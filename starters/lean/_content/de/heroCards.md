---
title: Warum Blyss
---

#### Markdown++
- **Formeln**: LaTeX in Markdown wird zu MathML in HTML – mit [Temml.org](https://temml.org/).
- **Diagramme**: Umfangreiche Diagramme – mit [Flowchart.js](https://flowchart.js.org/), [Mermaid](https://mermaid.js.org/) und sogar [Vega-Lite](https://vega.github.io/vega-lite/).
- **Hinweise und Abbildungen**: Hinweise, Bilder und Abbildungen als [MyST](https://mystmd.org/)-Direktiven sowie GitHub Alerts.
- **Labels, Nummern und Referenzen**: Nummerierte Abbildungen und Formeln sowie Referenzen, die ihren Text selbst ergänzen.
- **Syntaxhervorhebung**: Unterstützt fast 200 Sprachen – mit [Highlight.js](https://highlightjs.org/).
- **Aufgabenlisten**: `- [x]` und `- [ ]` als Checkboxen.
- **Fußnoten**: `[^footnote]`
- **Kompatibilität**: [Marktext.me](https://marktext.me), [Obsidian.md](https://obsidian.md) usw.

#### Inhalte erstellen
- **3 Inhaltstypen**: Dokument, Seite, Beitrag.
    - Beliebig viele Bücher, jedes mit eigener Navigation.
    - `draft: true` im Front Matter.
    - Inhalte im Browser bearbeiten mit [Decap CMS](https://decapcms.org/) oder [Tina](https://tina.io/).
- **KI-Co-Authoring**: Wechsel von Mensch und Agent als zugeschriebene, datierte `{contribution}`-Blöcke.
    - `AGENTS.md` und `_authoring/` im Starter.
- **Gestaltbar**: Blyss bringt einen schlanken Starter mit.
- **Kombinierbar**: Markdown-Komponenten und ihre Fragmente lassen sich überall verwenden.
- **Konfigurierbar**: Über blyss.config.js und das Markdown der Komponenten.
- **Mehrsprachig**: EN/DE sind die Voreinstellung und lassen sich erweitern.
- **AIO und SEO**: Semantischer RDF-Graph (in JSON-LD) und eine klassische sitemap.xml.

#### Lokale Kontrolle und Cybersicherheit
> [!IMPORTANT]
> - **Local-first**: Volle Kontrolle für Entwickler und Autoren. Ideal für Git-basierte Workflows.
> - **Cybersicherheit**:
>     - 0 (NULL) Abhängigkeiten im Node.js-Server!
>     - 3 (DREI) Abhängigkeiten in der SSG-Engine: `highlight.js`, `marked`, `temml` (und keine weiteren Abhängigkeiten)!
- **Bibliotheks-API**: `import { build, check, createContent } from "@blooniverse/blyss"`.
- **Live-Vorschau und Prüfungen**: Bei Änderungen neu bauen und neu laden; Inhalte samt Entwürfen prüfen, mit JSON-Berichten für Agenten und Skripte.
