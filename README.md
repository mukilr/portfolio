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

## Deploy to AWS from GitHub Actions

Every push to `main` runs `.github/workflows/deploy.yml`. The workflow builds the site, deploys the reCAPTCHA endpoint with AWS SAM and a Lambda Function URL, uploads the site to a private S3 bucket, and serves both through CloudFront over HTTPS.

Complete this one-time setup:

1. In AWS IAM, add GitHub as an OpenID Connect provider with URL `https://token.actions.githubusercontent.com` and audience `sts.amazonaws.com`.
2. Create an IAM role that trusts the `mukilr/portfolio` repository's `prod` environment and grants the deployment permissions needed for CloudFormation/SAM, S3, CloudFront, Lambda, IAM role creation, and CloudWatch Logs.
3. In the GitHub repository, open **Settings → Environments**, create an environment named `prod`, and add these secrets:
   - `AWS_DEPLOY_ROLE_ARN` — ARN of the IAM role from step 2.
   - `RECAPTCHA_SITE_KEY` — Google reCAPTCHA v2 checkbox site key.
   - `RECAPTCHA_SECRET_KEY` — matching private key.
   - `CONTACT_EMAIL` — email revealed after successful verification.
4. Add these environment variables:
   - `AWS_REGION` — for example, `us-east-1`.
   - `ALLOWED_HOSTNAME` — the exact hostname registered in reCAPTCHA, without `https://`.

The first workflow run creates the S3 bucket, CloudFront distribution, Lambda endpoint, and Lambda function. Its **Summary** page contains the generated CloudFront URL. Add that hostname to the Google reCAPTCHA key and set `ALLOWED_HOSTNAME` to the same value, then rerun the workflow.

## Custom domain: `www.mukil.xyz`

1. In AWS Certificate Manager in **us-east-1**, request a public certificate for `www.mukil.xyz`.
2. Choose DNS validation and add the ACM validation CNAME to the `mukil.xyz` DNS records in GoDaddy.
3. After ACM shows the certificate as **Issued**, add these variables to the GitHub `prod` environment:
   - `CUSTOM_DOMAIN_NAME` = `www.mukil.xyz`
   - `ACM_CERTIFICATE_ARN` = the issued certificate ARN
   - `ALLOWED_HOSTNAME` = `www.mukil.xyz`
4. Add `www.mukil.xyz` to the allowed domains for the Google reCAPTCHA site key.
5. Run the deployment workflow. Its summary includes the CloudFront hostname.
6. In GoDaddy DNS, add a CNAME with name `www` and value equal to that CloudFront hostname, without `https://`.
7. In GoDaddy forwarding, permanently forward `mukil.xyz` to `https://www.mukil.xyz` with HTTPS enabled.

The deployment only enables the CloudFront custom-domain settings when both custom-domain variables are present, so the generated CloudFront URL remains usable while the certificate is being validated.

## Structure

- `index.html` contains the page content and semantic structure.
- `styles.css` contains the responsive visual system.
- `script.js` adds terminal animation, commands, and the reCAPTCHA client flow.
- `server/index.js` verifies reCAPTCHA tokens and returns the protected email.
- `resume.html` presents the resume as a matching web page.
- `resume.css` styles the resume for screen and printing.
- `assets/Mukil_Rajeev_Resume.pdf` is the downloadable resume.
