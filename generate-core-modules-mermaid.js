const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('madge-graph.json', 'utf-8'));

function isModule(file) {
  return file.endsWith('.module.ts');
}
function safeName(name) {
  return name.replace(/[\/.]/g, '_');
}

let lines = ['graph TD'];
const modules = Object.keys(graph).filter(isModule);
for (const from of modules) {
  for (const to of graph[from]) {
    if (isModule(to)) {
      lines.push(`  ${safeName(from)} --> ${safeName(to)}`);
    }
  }
}
fs.writeFileSync('core-modules-graph.mmd', lines.join('\n'));
