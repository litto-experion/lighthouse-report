import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import 'dotenv/config';

if (!process.env.GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY is not set.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function runLighthouse(url, formFactor) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--remote-debugging-port=9222']
    });

    const options = {
      logLevel: 'silent',
      output: ['json'],
      port: 9222,
      formFactor,
      screenEmulation: formFactor === 'mobile'
        ? { mobile: true, width: 360, height: 640, deviceScaleFactor: 2, disabled: false }
        : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
    };

    const runnerResult = await lighthouse(url, options);
    if (!runnerResult || !runnerResult.report || !runnerResult.report[0]) {
      throw new Error("Lighthouse did not return a valid report.");
    }

    const jsonFile = `lighthouse-report-${formFactor}.json`;
    fs.writeFileSync(jsonFile, runnerResult.report[0]);
    console.log(`Report saved: ${jsonFile}`);
    return jsonFile;
  } finally {
    if (browser) await browser.close();
  }
}

async function analyzeWithGemini(file) {
  const data = fs.readFileSync(file, 'utf-8');
  const json = JSON.parse(data);

  const audits = json.audits;
  const missingAltTags = audits['image-alt']?.details?.items || [];
  const unoptimizedImages = audits['uses-optimized-images']?.details?.items || [];
  const responsiveImageIssues = audits['uses-responsive-images']?.details?.items || [];

  const summary = {
    accessibilityScore: json.categories.accessibility?.score
      ? `${Math.round(json.categories.accessibility.score * 100)}%`
      : "N/A",
    missingAltCount: missingAltTags.length,
    unoptimizedImageCount: unoptimizedImages.length,
    responsiveImageIssuesCount: responsiveImageIssues.length,
  };

  const prompt = `
  The following is a Lighthouse report for a ${file.includes("mobile") ? "mobile" : "desktop"} site.

  Accessibility Issues:
  - Images missing alt text: ${summary.missingAltCount}

  Performance Issues (Images):
  - Unoptimized images: ${summary.unoptimizedImageCount}
  - Images not sized for different screens (responsive issues): ${summary.responsiveImageIssuesCount}

  Please provide a **short, non-technical summary for CMS managers**.
  `;

  let geminiSummary = "";
  try {
    const result = await model.generateContent(prompt);
    geminiSummary = result.response.text();
  } catch (err) {
    geminiSummary = `Gemini API call failed: ${err.message}`;
  }

  return {
    geminiSummary,
    accessibilityScore: summary.accessibilityScore,
    missingAltImages: missingAltTags.map(img => ({
      name: (img.url || "unknown").split("/").pop()
    })),
    unoptimizedImages: unoptimizedImages.map(img => ({
      name: (img.url || "unknown").split("/").pop().split("?")[0],
      savingsKB: img.wastedBytes ? Math.trunc(img.wastedBytes / 1024) : "N/A"
    }))
  };
}

export async function runAudit(url) {
  const results = {};
  try {
    console.log(`Running Lighthouse audit for mobile: ${url}`);
    results.mobile = await analyzeWithGemini(await runLighthouse(url, 'mobile'));
  } catch (err) {
    results.mobile = `Mobile audit failed: ${err.message}`;
  }
  try {
    console.log(`Running Lighthouse audit for desktop: ${url}`);
    results.desktop = await analyzeWithGemini(await runLighthouse(url, 'desktop'));
  } catch (err) {
    results.desktop = `Desktop audit failed: ${err.message}`;
  }
  return results;
}