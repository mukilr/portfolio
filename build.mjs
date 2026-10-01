import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });

for (const file of ["index.html", "resume.html", "styles.css", "resume.css", "script.js"]) {
  await cp(file, `dist/${file}`);
}

await cp("assets/Mukil_Rajeev_Resume.pdf", "dist/assets/Mukil_Rajeev_Resume.pdf");
