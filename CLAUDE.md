# Gruszka — kontekst projektu dla Claude Code

## Co to jest
PWA (progresywna aplikacja webowa) do nauki angielskiego w stylu Duolingo, motyw zielono-gruszkowy.
Rozdział 1 "Podstawy" zawiera 1430 słówek EN–PL w 30 tematycznych lekcjach (fiszki + quiz).
Zbudowana w Claude.ai (chat), teraz kontynuowana lokalnie w Claude Code.

## Stack
Czysty HTML/CSS/JS (bez frameworka, bez build stepu). Działa od razu po otwarciu index.html
lub po wystawieniu na hosting. Fonty z Google Fonts (Baloo 2 + Nunito) ładowane przez CDN w <head>.

## Struktura plików
- `index.html` — wszystkie ekrany appki (home/ścieżka, intro lekcji, fiszki, quiz, brak serc, wyniki, profil)
- `style.css` — cały design, zmienne kolorów w :root na górze pliku
- `app.js` — logika: stan w localStorage (klucz `gruszka_state_v1`), nawigacja, fiszki, quiz, serca/XP/streak
- `data.js` — dane słówek jako `const CHAPTER1 = {...}`, wygenerowane z markdown listy słówek
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
- Dane w data.js są generowane programowo z listy słówek — jeśli user chce zmienić/dodać słówka,
  najprościej edytować bezpośrednio strukturę JSON w data.js (pola: id, title, words: [{en, pl}]).
- Design trzyma się palety zielono-gruszkowej zdefiniowanej w :root w style.css — nowe elementy
  powinny z niej korzystać, nie wprowadzać nowych kolorów ad-hoc.
