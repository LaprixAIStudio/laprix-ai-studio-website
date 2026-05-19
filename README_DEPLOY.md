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
