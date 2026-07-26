const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to replace - most specific first
const replacements = [
  // Effect service tags (already done via @opencode/ → @zoya/)
  // Package imports (already done via @opencode-ai/ → @zoya/)
  
  // Directory references
  [/\.opencode/g, '.zoya'],
  
  // Platform-specific directory
  ['"opencode"', '"zoya"'],
  ["'opencode'", "'zoya'"],
  ['`opencode`', '`zoya`'],
  
  // File paths
  ['/opencode/', '/zoya/'],
  ['\\opencode\\', '\\zoya\\'],
  
  // Binary names in bin arrays
  ['"opencode"', '"zoya"'],
  
  // Provider reference strings
  ['providerID === "opencode"', 'providerID === "zoya"'],
  ["providerID === 'opencode'", "providerID === 'zoya'"],
  
  // Plugin IDs
  ['PluginV2.ID.make("opencode")', 'PluginV2.ID.make("zoya")'],
  ["PluginV2.ID.make('opencode')", "PluginV2.ID.make('zoya')"],
  
  // Server route mentions
  ['"opencode"', '"zoya"'],
];

// Get all source files
const result = execSync('rg -l "opencode" "F:/ZOYA_009/backend/packages" -g "*.ts" -g "*.tsx" -g "*.js" -g "*.jsx" -g "*.mjs" -g "*.cjs" -g "*.json" -g "*.md" -g "*.css" -g "*.html" -g "!node_modules" -g "!.git" -g "!out" -g "!dist" -g "!*.patch"', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const files = result.trim().split('\n').filter(Boolean);
console.log('Found ' + files.length + ' files with opencode references');

// Also find files in root and other dirs
const result2 = execSync('rg -l "opencode" "F:/ZOYA_009/backend" -g "*.ts" -g "*.tsx" -g "*.js" -g "*.jsx" -g "*.json" -g "*.md" -g "*.css" -g "*.html" -g "!node_modules" -g "!.git" -g "!packages" -g "!out" -g "!dist" -g "!*.patch" -g "!_replace.cjs" -g "!install" -g "!bun.lock"', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const files2 = result2.trim().split('\n').filter(Boolean);
const allFiles = [...new Set([...files, ...files2])];
console.log('Total unique files: ' + allFiles.length);

let totalReplacements = 0;
for (const file of allFiles) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    for (const [pattern, replacement] of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        changed = true;
      }
    }
    
    // Additional manual replacements
    if (content.includes('opencode') && !file.includes('node_modules') && !file.endsWith('.patch')) {
      // Replace "opencode" as standalone word in certain contexts
      // But be careful not to replace inside already-changed @zoya references
    }
    
    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      totalReplacements++;
    }
  } catch(e) {
    console.error('Error processing', file, e.message);
  }
}
console.log('Processed ' + totalReplacements + ' files with replacements');
