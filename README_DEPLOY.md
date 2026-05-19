# Laprix AI Studio V0 landing oldal

Ez egy külön, statikus Laprix AI Studio főoldal, amely nem módosítja a FoglalóFlow kódját.

## Fájlok

- `index.html` – fő landing oldal
- `styles.css` – teljes reszponzív design
- `adatkezeles.html` – V0 adatkezelési tájékoztató, cookie/form nélküli oldalhoz
- `favicon.svg` – egyszerű Laprix AI Studio favicon
- `robots.txt`
- `sitemap.xml`

## Javasolt domain

```text
https://laprixaistudio.hu
```

## Render Static Site beállítás

1. GitHub repo létrehozása vagy meglévő Laprix AI Studio repo használata.
2. A fájlokat tedd a repo gyökerébe.
3. Render → New → Static Site.
4. Build Command:
   ```text
   nincs / üres
   ```
5. Publish Directory:
   ```text
   .
   ```
6. Custom domain:
   ```text
   laprixaistudio.hu
   www.laprixaistudio.hu
   ```

## DNS irány

Render Static Site custom domainhez Render megadja a pontos CNAME/A rekordokat.
Rackhost DNS-ben csak azokat állítsd be, amelyeket Render mutat.

## Fontos

- A főoldal nem tartalmaz Google Ads / GA4 mérőkódot.
- Ha később mérőkód kerül be, az `adatkezeles.html` szövegét frissíteni kell.
- A FoglalóFlow marad külön termékoldal:
  `https://foglaloflow.laprixaistudio.hu`


## V0.1 frissítés – Egyedi fejlesztési ajánlatkérés

Hozzáadva a főoldalhoz:

- `Egyedi fejlesztés` navigációs link
- `#egyedi-fejlesztes` szekció
- AI/programfejlesztési ajánlatkérő blokk
- mailto ajánlatkérő gomb előre kitöltött e-mail sablonnal

Deploy:
1. Cseréld a GitHub repóban az `index.html` és `styles.css` fájlokat erre a verzióra.
2. Commit:
   `Add custom software request section`
3. Render automatikusan redeployolja az oldalt.
