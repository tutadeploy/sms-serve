const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('madge-graph.json', 'utf-8'));

function safeName(name) {
  return name.replace(/[\/.]/g, '_');
}

let lines = ['graph TD'];
for (const [from, tos] of Object.entries(graph)) {
  for (const to of tos) {
    lines.push(`  ${safeName(from)} --> ${safeName(to)}`);
  }
}
fs.writeFileSync('madge-graph.mmd', lines.join('\n'));
