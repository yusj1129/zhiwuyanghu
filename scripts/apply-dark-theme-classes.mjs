import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectionsDir = path.join(__dirname, '../src/sections');

const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.tsx')) files.push(p);
  }
}
walk(sectionsDir);

for (const f of [
  path.join(__dirname, '../src/components/RequireAuth.tsx'),
  path.join(__dirname, '../src/App.tsx'),
]) {
  if (fs.existsSync(f)) files.push(f);
}

const rules = [
  [/text-\[#333333\]/g, 'text-foreground'],
  [/text-\[#757575\]/g, 'text-muted-foreground'],
  [/text-\[#BDBDBD\]/g, 'text-muted-foreground'],
  [/text-\[#616161\]/g, 'text-muted-foreground'],
  [/text-\[#555555\]/g, 'text-muted-foreground'],
  [/text-\[#9E9E9E\]/g, 'text-muted-foreground'],
  [/border-\[#F0F0F0\]/g, 'border-border'],
  [/border-\[#E0E0E0\]/g, 'border-border'],
  [/bg-\[#F5F5F5\]/g, 'bg-background'],
  [/bg-\[#F8F9FA\]/g, 'bg-background'],
  [/border-2 border-dashed border-\[#E0E0E0\]/g, 'border-2 border-dashed border-border'],
  [/hover:bg-gray-100/g, 'hover:bg-muted'],
  [/hover:bg-gray-200/g, 'hover:bg-muted'],
  [/hover:bg-\[#FAFAFA\]/g, 'hover:bg-muted'],
  [/hover:bg-\[#F5F5F5\]/g, 'hover:bg-muted'],
  [/bg-white\/90/g, 'bg-card/90'],
  [/bg-white\/80/g, 'bg-card/80'],
  [/bg-white\/95/g, 'bg-card/95'],
  [/\bbg-white\b/g, 'bg-card'],
  [/border-\[#F5F5F5\]/g, 'border-border'],
  [/border-\[#F0F0F0\]/g, 'border-border'],
  [/before:bg-\[#F0F0F0\]/g, 'before:bg-border'],
  [/bg-\[#E0E0E0\]/g, 'bg-muted'],
  [/bg-\[#F0F0F0\]/g, 'bg-muted'],
  [/text-black\b/g, 'text-foreground'],
  [/hover:bg-red-50/g, 'hover:bg-destructive/10'],
  [/hover:bg-\[#E8F5E9\]/g, 'hover:bg-primary/10'],
  [/active:bg-\[#E3F2FD\]/g, 'active:bg-accent'],
];

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  for (const [re, rep] of rules) s = s.replace(re, rep);
  if (s !== orig) {
    fs.writeFileSync(file, s);
    console.log('updated', path.relative(path.join(__dirname, '..'), file));
  }
}
