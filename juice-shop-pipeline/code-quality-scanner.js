const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ESLint } = require('eslint');

/**
 * Recursively find all js, ts, jsx, tsx files in a directory ignoring build/modules.
 */
function findSourceFiles(dir, fileList = []) {
    let entries = [];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return fileList;
    }
    for (const entry of entries) {
        if (['node_modules', 'dist', 'build', '.git', 'coverage', '.temp_jscpd_out'].includes(entry.name) || entry.name.startsWith('.')) {
            continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findSourceFiles(fullPath, fileList);
        } else if (/\.(js|ts|jsx|tsx)$/.test(entry.name) && !entry.name.endsWith('.min.js')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

/**
 * Runs independent Code Quality Scan on targetDir without modifying any code
 * or touching security pipeline files (advisories.json, reachability.json, etc.).
 */
async function runCodeQualityScan(targetDir, outputFile) {
    const absDir = path.resolve(targetDir);
    const absOut = outputFile ? path.resolve(outputFile) : path.join(__dirname, 'code_quality_report.json');

    console.log(`[code-quality-scanner] Starting independent code quality scan on: ${absDir}`);
    const issues = [];
    const sourceFiles = findSourceFiles(absDir);
    console.log(`[code-quality-scanner] Found ${sourceFiles.length} source files to inspect.`);

    // ==========================================================
    // 1. ESLint Rule-Based Detection (Dead/Unused Code & Complexity)
    // ==========================================================
    if (sourceFiles.length > 0) {
        try {
            console.log(`[code-quality-scanner] Running programmatic ESLint analysis...`);
            const eslint = new ESLint({
                cwd: absDir,
                overrideConfigFile: true,
                errorOnUnmatchedPattern: false,
                overrideConfig: [
                    {
                        files: ["**/*.js", "**/*.ts", "**/*.jsx", "**/*.tsx"],
                        languageOptions: {
                            ecmaVersion: 2022,
                            sourceType: "module",
                            globals: {
                                console: "readonly",
                                process: "readonly",
                                require: "readonly",
                                module: "readonly",
                                __dirname: "readonly",
                                __filename: "readonly",
                                exports: "readonly"
                            }
                        },
                        rules: {
                            "no-unused-vars": "warn",
                            "no-unreachable": "warn",
                            "no-empty": "warn",
                            "no-unused-labels": "warn",
                            "complexity": ["warn", 10],
                            "max-lines-per-function": ["warn", { "max": 60, "skipComments": true, "skipBlankLines": true }],
                            "max-depth": ["warn", 4],
                            "max-nested-callbacks": ["warn", 4]
                        }
                    }
                ]
            });

            const results = await eslint.lintFiles(sourceFiles);

            for (const res of results) {
                const relativePath = path.relative(absDir, res.filePath).replace(/\\/g, '/');
                let fileLines = [];
                try {
                    fileLines = fs.readFileSync(res.filePath, 'utf8').split(/\r?\n/);
                } catch (e) {
                    // Ignore read errors
                }

                for (const msg of res.messages) {
                    if (msg.message.includes('ignored because outside of base path')) continue;

                    let issueType = 'unused_code';
                    if (['complexity', 'max-lines-per-function', 'max-depth', 'max-nested-callbacks'].includes(msg.ruleId)) {
                        issueType = 'high_complexity';
                    }

                    const startLine = msg.line || 1;
                    const endLine = msg.endLine || startLine;
                    const snippet = fileLines.slice(Math.max(0, startLine - 1), Math.min(fileLines.length, endLine)).join('\n');

                    issues.push({
                        file: relativePath,
                        line_range: [startLine, endLine],
                        issue_type: issueType,
                        description: `${msg.ruleId ? `[${msg.ruleId}] ` : ''}${msg.message}`,
                        severity: msg.severity === 2 ? 'warning' : 'info',
                        snippet: snippet.trim()
                    });
                }
            }
            console.log(`[code-quality-scanner] ESLint detected ${issues.length} issues.`);
        } catch (err) {
            console.error(`[code-quality-scanner] ESLint detection error:`, err.message);
        }
    }

    // ==========================================================
    // 2. JSCPD Duplicate Code Detection (Copy-Paste Detector)
    // ==========================================================
    try {
        console.log(`[code-quality-scanner] Running jscpd copy-paste duplication detector...`);
        const tempOutDir = path.join(__dirname, '.temp_jscpd_out');
        if (!fs.existsSync(tempOutDir)) fs.mkdirSync(tempOutDir, { recursive: true });

        const jscpdCmd = `npx.cmd jscpd "${absDir}" --format javascript,typescript,jsx,tsx --min-tokens 25 --min-lines 4 --reporters json --output "${tempOutDir}" --silent --ignore "**/node_modules/**,**/dist/**,**/build/**"`;
        try {
            execSync(jscpdCmd, { cwd: __dirname, stdio: 'ignore' });
        } catch (e) {
            // jscpd exits with code 1 if duplicates are found
        }

        const reportPath = path.join(tempOutDir, 'jscpd-report.json');
        if (fs.existsSync(reportPath)) {
            const jscpdData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            const duplicates = jscpdData.duplicates || [];

            for (const dup of duplicates) {
                const relativeFile = dup.firstFile?.name || 'unknown';
                const startLine = dup.firstFile?.startLoc?.line || dup.firstFile?.start || 1;
                const endLine = dup.firstFile?.endLoc?.line || dup.firstFile?.end || startLine;
                const targetFile = dup.secondFile?.name || 'unknown';
                const targetStart = dup.secondFile?.startLoc?.line || dup.secondFile?.start || 1;
                const targetEnd = dup.secondFile?.endLoc?.line || dup.secondFile?.end || targetStart;

                issues.push({
                    file: relativeFile.replace(/\\/g, '/'),
                    line_range: [startLine, endLine],
                    issue_type: 'duplicate_code',
                    description: `Duplicate code block (${dup.lines} lines, ${dup.tokens} tokens) identical to ${targetFile.replace(/\\/g, '/')}:${targetStart}-${targetEnd}`,
                    severity: 'warning',
                    snippet: (dup.fragment || '').trim()
                });
            }
            console.log(`[code-quality-scanner] JSCPD detected ${duplicates.length} duplicate blocks.`);
        }
        // Cleanup temp out
        try { fs.rmSync(tempOutDir, { recursive: true, force: true }); } catch (_) {}
    } catch (err) {
        console.error(`[code-quality-scanner] JSCPD error:`, err.message);
    }

    // ==========================================================
    // 3. Compute Deterministic Code Quality Score
    // ==========================================================
    let penalty = 0;
    for (const item of issues) {
        if (item.issue_type === 'high_complexity') penalty += 5;
        else if (item.issue_type === 'duplicate_code') penalty += 4;
        else if (item.issue_type === 'unused_code') penalty += 2;
    }
    const score = Math.max(0, 100 - penalty);

    const report = {
        score,
        total_issues: issues.length,
        timestamp: new Date().toISOString(),
        issues: issues.sort((a, b) => a.file.localeCompare(b.file) || a.line_range[0] - b.line_range[0])
    };

    fs.writeFileSync(absOut, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[code-quality-scanner] Quality scan completed. Score: ${score}/100 (${issues.length} total issues).`);
    console.log(`[code-quality-scanner] Report written to: ${absOut}`);
    return report;
}

if (require.main === module) {
    const targetDir = process.argv[2] || path.join(__dirname, '..', 'seed-repo-vulnerable');
    const outPath = process.argv[3] || path.join(__dirname, 'code_quality_report.json');
    runCodeQualityScan(targetDir, outPath).catch(console.error);
}

module.exports = { runCodeQualityScan };
