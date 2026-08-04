# Gruszka 🍐 — nauka angielskiego

Aplikacja webowa (PWA) w stylu Duolingo — instaluje się na telefonie jak zwykła appka (ikona na ekranie głównym, działa offline), ale bez sklepu App Store / Google Play. To jeden kod, który działa identycznie na Androidzie i iOS.

**Rozdział 1 „Podstawy"** — 1430 słówek w 30 tematycznych lekcjach (fiszki + quiz), system serii (streak), punkty XP, serca.

## Jak to uruchomić

### Opcja A — najszybciej: hosting za darmo (polecane)
Żeby zainstalować appkę na telefonie, musi być dostępna pod adresem `https://...` (PWA wymaga HTTPS, poza `localhost`). Najprościej przez **GitHub Pages**:

1. Załóż darmowe konto na [github.com](https://github.com) (jeśli nie masz).
2. Stwórz nowe repozytorium, np. `gruszka-app`.
3. Wgraj do niego wszystkie pliki z tego folderu (przez stronę GitHuba: "Add file → Upload files", przeciągnij wszystkie pliki i folder `icons`).
4. Wejdź w repo → **Settings → Pages** → w "Branch" wybierz `main` i `/ (root)` → Save.
5. Po chwili appka będzie dostępna pod adresem typu `https://twoja-nazwa.github.io/gruszka-app/`.
6. Otwórz ten adres na telefonie.

### Opcja B — na szybko do testów na tym samym Wi-Fi
W folderze z plikami odpal lokalny serwer (np. z laptopa):
```
python3 -m http.server 8000
```
Na telefonie (w tej samej sieci Wi-Fi) wejdź na `http://ADRES-IP-KOMPUTERA:8000`. Uwaga: bez HTTPS telefon nie pozwoli "zainstalować" appki jako PWA (nie będzie działać offline), ale możesz ją normalnie przeglądać w przeglądarce.

## Instalacja na telefonie (po wejściu na adres HTTPS)

**Android (Chrome):** otwórz link → menu (trzy kropki) → **"Dodaj do ekranu głównego"** / "Zainstaluj aplikację".

**iPhone (Safari — musi być Safari, nie Chrome):** otwórz link → ikona **Udostępnij** (kwadrat ze strzałką) → **"Dodaj do ekranu początkowego"**.

Od teraz appka ma swoją ikonę na ekranie głównym i otwiera się na pełnym ekranie, bez paska przeglądarki.

## Struktura projektu

```
index.html          – szkielet aplikacji, wszystkie ekrany
style.css            – cały design (motyw zielono-gruszkowy)
app.js               – logika: postęp, fiszki, quizy, serca, XP, streak
data.js              – dane: 30 lekcji, 1430 par słówek (EN–PL)
manifest.json        – konfiguracja PWA (nazwa, ikony, kolory)
service-worker.js    – działanie offline
icons/               – ikony aplikacji
```

## Jak dodać Rozdział 2 (na przyszłość)

W `data.js` jest struktura `CHAPTER1` z listą lekcji. Rozdział 2 najprościej dodać jako `CHAPTER2` w tym samym formacie (te same pola `id`, `title`, `words: [{en, pl}]`), a potem rozszerzyć `app.js`, żeby ekran główny pokazywał wybór rozdziału. Daj znać, jak zbierzesz słownictwo na kolejną serię — dorobimy to razem tak, żeby postęp z Rozdziału 1 się zachował.

## Postęp użytkownika

Postęp (XP, serca, seria, gwiazdki za lekcje) zapisuje się lokalnie w telefonie (`localStorage`) — nie wymaga konta ani internetu po pierwszym wczytaniu. Reset postępu jest dostępny w zakładce **Statystyki**.
