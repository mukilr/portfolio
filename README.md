# Mukil Rajeev Portfolio

A responsive personal portfolio for Mukil Rajeev, Senior Member of Technical Staff at Oracle.

## Run locally

The secure email reveal uses Google reCAPTCHA and a server-side verification endpoint. The local server uses Google's official reCAPTCHA test keys; provide the protected email as an environment value.

```sh
CONTACT_EMAIL=you@example.com npm run dev
```

Then visit `http://127.0.0.1:4174`.

## Production configuration

Create a Google reCAPTCHA v2 checkbox key for the deployed domain, then configure these runtime values without committing them to Git:

- `RECAPTCHA_SITE_KEY` — the public Google site key.
- `RECAPTCHA_SECRET_KEY` — the private Google secret key.
- `CONTACT_EMAIL` — the address returned after successful verification.
- `ALLOWED_ORIGIN` — the complete deployed origin, such as `https://example.com`.
- `ALLOWED_HOSTNAME` — the deployed hostname, such as `example.com`.

The server verifies each single-use Google token before returning the email address. The private key and protected address are never included in the browser bundle.

## Structure

- `index.html` contains the page content and semantic structure.
- `styles.css` contains the responsive visual system.
- `script.js` adds terminal animation, commands, and the reCAPTCHA client flow.
- `server/index.js` verifies reCAPTCHA tokens and returns the protected email.
- `resume.html` presents the resume as a matching web page.
- `resume.css` styles the resume for screen and printing.
- `assets/Mukil_Rajeev_Resume.pdf` is the downloadable resume.
