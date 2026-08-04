# Gruszka — kontekst projektu dla Claude Code

## Co to jest
PWA (progresywna aplikacja webowa) do nauki angielskiego w stylu Duolingo, motyw zielono-gruszkowy.
Rozdział 1 "Podstawy" zawiera 1430 słówek EN–PL w 101 lekcjach po ~15 słówek (fiszki + quiz).
Każde słówko ma wymowę: zapis IPA, uproszczony zapis polski i odtwarzanie na głos.
Zbudowana w Claude.ai (chat), teraz kontynuowana lokalnie w Claude Code.

## Gdzie to żyje
- Repo: https://github.com/MichalGruszka117/gruszka-app (publiczne, branch `main`)
- Live: https://michalgruszka117.github.io/gruszka-app/ (GitHub Pages, root `/`, build ~30 s po push)

## Stack
Czysty HTML/CSS/JS (bez frameworka, bez build stepu). Działa od razu po otwarciu index.html
lub po wystawieniu na hosting. Fonty z Google Fonts (Baloo 2 + Nunito) ładowane przez CDN w <head>.

## Struktura plików
- `index.html` — wszystkie ekrany appki (home/ścieżka, intro lekcji, fiszki, quiz, brak serc, wyniki, profil)
- `style.css` — cały design, zmienne kolorów w :root na górze pliku
- `app.js` — logika: stan w localStorage (klucz `gruszka_state_v1`), nawigacja, fiszki, quiz, serca/XP/streak
- `data.js` — dane słówek jako `const CHAPTER1 = {...}`; lekcja ma pola
  `id`, `theme` (numer tematu 1–30, potrzebny do migracji postępu), `title`, `part`, `partCount`, `words`.
  Słówko ma `en`, `pl`, `ipa` (np. `ˈwɔːtər`), `fon` (polski zapis, np. `ŁO-ter`, WIELKIE = akcent)
- `manifest.json` — konfiguracja PWA (nazwa, ikony, kolory)
- `service-worker.js` — cache offline
- `icons/` — wygenerowane programowo ikony w kształcie gruszki (PIL/Python)

## Aktualny cel użytkownika
Wystawić appkę na GitHub Pages (albo inny darmowy hosting), żeby dało się ją zainstalować
jako PWA na telefonie (Android przez Chrome, iOS przez Safari → "Dodaj do ekranu początkowego").

Kroki do wykonania w Claude Code, jeśli user o to poprosi:
1. Sprawdzić czy jest zainicjowane repo git w tym folderze (`git status`), jeśli nie — `git init`.
2. Pomóc userowi stworzyć repo na GitHubie (albo użyć `gh` CLI jeśli jest zalogowany) i podłączyć remote.
3. Commit + push wszystkich plików.
4. Włączyć GitHub Pages dla brancha `main`, root `/` (przez `gh api` albo instrukcję w UI).
5. Podać finalny link do zainstalowania na telefonie.

## Plany na przyszłość (info dla kontekstu, nie rób od razu)
- Rozdział 2 — kolejna seria słówek, w tym samym formacie co CHAPTER1 w data.js (np. jako CHAPTER2).
  Trzeba będzie dodać ekran wyboru rozdziału w app.js/index.html, zachowując istniejący postęp
  (localStorage) z Rozdziału 1.
- Ewentualnie: prawdziwe natywne appki (Swift/Kotlin) gdyby PWA było niewystarczające —
  to osobny, znacznie większy projekt, do rozważenia dopiero jeśli PWA się sprawdzi.

## Ważne przy edycji
- Zachowaj klucz `gruszka_state_v1` w localStorage przy każdej zmianie app.js — inaczej user straci postęp.
- **Przy każdej zmianie plików podbij `CACHE_NAME` w `service-worker.js`** — bez tego telefony
  z zainstalowaną appką mogą długo serwować starą wersję z cache.
- **Nie usuwaj `<meta name="robots" content="noindex, nofollow">` z index.html.** User chce,
  żeby appka była dostępna tylko z bezpośredniego linku, nie z wyszukiwarek. `robots.txt` tego
  nie załatwi — strona stoi w podkatalogu `/gruszka-app/`, a wyszukiwarki czytają robots.txt
  wyłącznie z korzenia domeny.
- **Zmiana numeracji lekcji wymaga migracji.** W app.js jest `DATA_VERSION` i funkcja `migrate()`.
  Przy v1→v2 (podział 30 tematów na 101 porcji) postęp z tematu przepisywany jest na wszystkie
  jego porcje po polu `theme`. Jeśli znów zmienisz podział — podbij `DATA_VERSION` i dopisz kolejny krok.
- Dane w data.js są generowane programowo z listy słówek — jeśli user chce zmienić/dodać słówka,
  najprościej edytować bezpośrednio strukturę JSON w data.js (pola: id, title, words: [{en, pl, ipa, fon}]).
- Transkrypcje generuje skrypt z CMUdict (`pip install cmudict`) — mapowanie ARPAbet→IPA
  i ARPAbet→polski, z sylabizacją wg zasady maximal onset. Nowe słówka trzeba przepuścić tym samym
  skryptem, żeby zapis był spójny; ręczne dopisywanie grozi niespójnością.
- Design trzyma się palety zielono-gruszkowej zdefiniowanej w :root w style.css — nowe elementy
  powinny z niej korzystać, nie wprowadzać nowych kolorów ad-hoc.
