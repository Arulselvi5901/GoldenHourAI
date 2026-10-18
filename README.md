# GoldenHourAI – AI Emergency Response for Places Technology Forgets

**Google Cloud AI Builder Cup 2026 (JAPAC) · Theme: Sustainability & Social Impact**

> Uber can find you a cab in five seconds. In a village with no internet, no smartphone and no street address, getting an ambulance can take an hour. GoldenHourAI turns one phone call, in any language, into a located, triaged and dispatched emergency response, with a doctor on the line.

- **Live demo:** https://goldenhourai-rural-emergency-response-assistant.ai.studio
- **Demo video (under 4 min):**(https://drive.google.com/file/d/1yb8whJrPVz_nVoVAVUvx5iQLmDNUi8v2/view?usp=drive_link)
- **Pitch deck:**https://drive.google.com/file/d/1eA3KfXoZwbN2liDuD1oX3p72jlbCvZPb/view?usp=drive_link
- **Team GoldenHourAI:** Arulselvi T S · Janarakshaa J

---

## The problem

In rural and remote areas across JAPAC, the "golden hour" after a heart attack, stroke, snakebite or accident is often lost before help even starts moving:

- Callers have **no street address** ("behind the school, near the water tank").
- Many use **basic keypad phones** with weak signal and **no internet**.
- They speak in **panic, dialects and mixed languages**.
- The **nearest hospital is not always one that can treat** the emergency.
- Families **don't know what to do** while they wait.

## The solution

GoldenHourAI is an **AI layer for existing emergency numbers** (112, 108, 119, 120, 911…). The caller only has to talk and press numbers:

1. **Speak:** the caller dials the local emergency number and describes what happened, in any language.
2. **Locate:** Gemini extracts place names and landmarks, then geocodes them with OpenStreetMap.
3. **Triage:** a spoken "Press 1 / Press 2" voice menu in the caller's language sets the risk level.
4. **Dispatch:** the nearest ambulance, the **right-capability** hospital and a nearby community responder are chosen using distances computed in code.
5. **Guide:** step-by-step first aid is spoken aloud and shown on screen.
6. **Doctor:** a live doctor joins the call; Gemini translates both ways. The hospital is pre-alerted and a handover note is written.

## Three views

| Route | Who uses it | What it shows |
|---|---|---|
| `/` | Demo | Split view: caller phone and operations side by side |
| `/caller` | The person in the emergency | A simple keypad phone: voice, voice menu, first aid, ETAs |
| `/ops` | Emergency operations and the doctor | Incoming call, live map, AI pipeline log, hospital pre-alert, Doctor Console with live translation |
| `/registry` | Central system (simulated) | Serving cell tower, registered facilities and ambulances, on-duty specialists, 3-rule dispatch scoring |

Each session gets a private 6-character **room code** (`?room=ABC123`). Open `/caller?room=CODE` on a phone and `/ops?room=CODE` on a laptop (or scan the QR code on the Operations view) to pair them; both stay in sync every second.

## How Gemini is used

| Step | Gemini's role |
|---|---|
| Multilingual audio | Transcribes the caller's speech in any language or dialect |
| Language & country | Infers the country and local emergency number |
| Landmark location | Turns landmark descriptions into a searchable place for geocoding |
| Triage & voice menu | Sets a risk level (not a diagnosis) and writes numbered menu options |
| Dispatch reasoning | Chooses ambulance, hospital and responder from computed distances and capabilities |
| Voice & translation | Text-to-speech in the caller's language; doctor–caller translation both ways |
| Handover | Writes the hospital pre-alert and the ambulance crew handover note |

Responses use structured JSON, and a model fallback pool improves reliability on the free tier.

## Tech stack

- **Google AI Studio** (Build mode) and the **Gemini API** (`@google/genai`)
- **Google Cloud Run** (deployed via AI Studio)
- React + Vite + Tailwind (frontend), Node.js + Express (API)
- Leaflet + OpenStreetMap (map tiles, Nominatim geocoding, Overpass hospital data)

## Responsible AI

- Shows a **risk level with confidence, never a diagnosis**; first-aid guidance only, no medicines.
- A **human doctor stays in the loop**; any AI doctor stand-in is labelled as simulated.
- **No silent fallback** to sample data: failures show a clear message.
- Uncertain locations trigger a confirmation question to the caller.
- All demo data is fictional; no real personal data is stored.

## What is real and what is simulated

| Real in this prototype | Simulated in this prototype |
|---|---|
| Gemini transcription, triage, translation and voice | The phone call itself (browser-based) |
| Geocoding and real nearby hospitals (OpenStreetMap) | Ambulances, volunteers and their availability |
| Distance and ETA calculation | Hospital doctor availability and the central registry |
| Room-based sync between phone and dashboard | Serving cell tower location |

Medical content is illustrative and must be validated by clinicians before real use.

## Run locally

**Prerequisites:** Node.js 20+ and a Gemini API key from https://aistudio.google.com

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY in .env.local
npm run dev                  # opens on http://localhost:3000
```

Never commit your API key. `.env*` files are listed in `.gitignore`.

## Roadmap

- **Central emergency registry (simulated in this prototype):** connect it to real ambulance fleets and to live bed, ICU and on-duty specialist availability across government, primary health centre and private hospitals.
- **Telecom location (simulated cell tower in this prototype):** real cell-tower and device location from operators, refined by landmarks.
- **Affordability-aware routing:** clinical need first; then prefer free government care or hospitals accepting public health insurance. Asked, never assumed.
- **SMS and voice gateway** integration with national emergency numbers, and a pilot in one rural district.
