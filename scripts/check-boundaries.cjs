const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const serverPackages = /^(?:firebase-admin|@prisma\/client|@clerk\/backend|@mux\/mux-node|livekit-server-sdk|resend|uploadthing\/server|server-only)(?:\/|$)/;

function imports(source) {
  const edges = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = ts.isImportDeclaration(node) ? node.importClause : node.exportClause;
      const bindings = ts.isImportDeclaration(node) ? clause?.namedBindings : clause;
      const typeOnly = !!node.isTypeOnly || !!clause?.isTypeOnly ||
        (bindings && !clause?.name && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) &&
          bindings.elements.length > 0 && bindings.elements.every(item => item.isTypeOnly));
      edges.push({ module: node.moduleSpecifier.text, typeOnly, node });
    }
    if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')) {
      edges.push({ module: node.arguments[0].text, typeOnly: false, node });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return edges;
}

function resolveLocal(filename, module, files) {
  const base = module.startsWith('@/') ? module.slice(2)
    : module.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(filename), module)) : null;
  if (base === null) return null;
  return [base, base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx'].find(candidate => files.has(candidate)) || base;
}

function checkBoundaries(files) {
  const errors = [];
  const graph = new Map();
  const clientRoots = [];
  for (const [filename, content] of files) {
    const source = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
    const edges = imports(source);
    graph.set(filename, edges);
    const isClient = source.statements.some(statement => ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression) && statement.expression.text === 'use client');
    if (filename.startsWith('frontend/') || isClient) clientRoots.push(filename);
    if (filename.startsWith('server/') && !edges.some(edge => edge.module === 'server-only' && !edge.typeOnly)) {
      errors.push(`${filename}: backend modules must import 'server-only'.`);
    }
    for (const edge of edges) {
      const target = resolveLocal(filename, edge.module, files);
      if (target !== null && !files.has(target) && !/\.(css|svg|png|jpe?g|webp)$/.test(target)) errors.push(`${filename}: unresolved local import ${edge.module}.`);
      if (filename.startsWith('server/') && (target?.startsWith('frontend/') || target?.startsWith('app/'))) {
        errors.push(`${filename}: backend cannot import presentation/routing code (${edge.module}).`);
      }
      if (filename.startsWith('shared/')) {
        const uploadBridge = filename === 'shared/contracts/uploads.ts' && edge.typeOnly && target === 'server/integrations/uploadthing.ts';
        if (!uploadBridge && (target?.startsWith('server/') || target?.startsWith('frontend/') || target?.startsWith('app/') || serverPackages.test(edge.module))) {
          errors.push(`${filename}: shared code cannot depend on application layers (${edge.module}).`);
        }
      }
      if (filename.startsWith('app/') && !filename.startsWith('app/api/') &&
        (serverPackages.test(edge.module) || target === 'server/db.ts' || target?.startsWith('server/http/') || target?.startsWith('server/integrations/'))) {
        errors.push(`${filename}: pages must use backend queries/services, not persistence or HTTP implementations.`);
      }
      if (edge.module.startsWith('@/lib/') || edge.module.startsWith('@/actions/') || edge.module.startsWith('@/components/') || edge.module.startsWith('@/hooks/')) {
        errors.push(`${filename}: legacy import path ${edge.module}.`);
      }
    }
    if (filename.startsWith('app/api/')) {
      // API entry points expose existing URLs and static Next configuration only.
      for (const statement of source.statements) {
        if (ts.isExportDeclaration(statement) && statement.moduleSpecifier?.text.startsWith('@/server/http/')) continue;
        if (ts.isVariableStatement(statement) && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) &&
          statement.declarationList.declarations.every(declaration => /^(dynamic|revalidate|runtime|fetchCache|preferredRegion|maxDuration)$/.test(declaration.name.getText(source)))) continue;
        errors.push(`${filename}: API adapters must delegate handlers to server/http/.`);
      }
    }
  }

  const visited = new Set();
  function visitClient(filename, chain) {
    if (visited.has(filename)) return;
    visited.add(filename);
    for (const edge of graph.get(filename) || []) {
      const target = resolveLocal(filename, edge.module, files);
      const bridge = filename === 'shared/contracts/uploads.ts' && edge.typeOnly;
      if (!bridge && (target?.startsWith('server/') || serverPackages.test(edge.module))) {
        errors.push(`${[...chain, filename].join(' -> ')}: browser dependency on ${edge.module}.`);
      }
      if (!edge.typeOnly && target && files.has(target)) visitClient(target, [...chain, filename]);
    }
    // A public frontend variable must be explicitly marked for browser exposure.
    const content = files.get(filename) || '';
    for (const match of content.matchAll(/process\.env\.([A-Z_][A-Z_0-9]*)/g)) {
      if (!match[1].startsWith('NEXT_PUBLIC_') && match[1] !== 'NODE_ENV') {
        errors.push(`${filename}: private environment variable ${match[1]} is reachable by browser code.`);
      }
    }
  }
  clientRoots.forEach(filename => visitClient(filename, []));
  return [...new Set(errors)];
}

function repositoryFiles() {
  const files = new Map();
  function walk(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const filename = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(filename);
      else if (/\.tsx?$/.test(filename)) files.set(filename, fs.readFileSync(path.join(root, filename), 'utf8'));
    }
  }
  ['app', 'frontend', 'server', 'shared'].forEach(walk);
  return files;
}

if (require.main === module) {
  const errors = checkBoundaries(repositoryFiles());
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Architecture boundaries passed: UI, backend, shared contracts, and API adapters.');
}

module.exports = { checkBoundaries };
