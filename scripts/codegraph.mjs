import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SRC_DIR = path.resolve(process.cwd(), 'src');

/**
 * 递归收集目录下的 ts / tsx 文件
 */
function getTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getTsFiles(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * 格式化相对路径
 */
function toRelPath(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}

/**
 * 构建全仓代码图谱 (CodeGraph)
 */
export function buildCodeGraph() {
  const files = getTsFiles(SRC_DIR);
  const graph = {
    files: {}, // relPath -> FileNode
    symbols: {}, // symbolKey -> SymbolNode
    calls: [], // { fromSymbol, toSymbol, file }
    imports: [], // { fromFile, toFile, specifiers }
  };

  const sourceFiles = new Map();

  for (const filePath of files) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );
    const relPath = toRelPath(filePath);
    sourceFiles.set(relPath, { sourceFile, code });

    graph.files[relPath] = {
      path: relPath,
      imports: [],
      exports: [],
      symbols: [],
      sizeBytes: Buffer.byteLength(code, 'utf-8'),
    };
  }

  // 遍历并分析每个文件
  for (const [relPath, { sourceFile, code }] of sourceFiles.entries()) {
    const fileNode = graph.files[relPath];

    function visit(node) {
      // 1. 分析 import 语句
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier.text;
        const namedBindings = [];
        let defaultImport = null;

        if (node.importClause) {
          if (node.importClause.name) {
            defaultImport = node.importClause.name.text;
          }
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const elem of node.importClause.namedBindings.elements) {
                namedBindings.push(elem.name.text);
              }
            }
          }
        }

        fileNode.imports.push({
          source: moduleSpecifier,
          defaultImport,
          namedBindings,
        });

        graph.imports.push({
          fromFile: relPath,
          source: moduleSpecifier,
          namedBindings,
          defaultImport,
        });
      }

      // 2. 分析类型定义 (interface / type)
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const signature = node.getText(sourceFile);
        recordSymbol(relPath, name, 'interface', signature, isExported);
      } else if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const signature = node.getText(sourceFile);
        recordSymbol(relPath, name, 'type', signature, isExported);
      }

      // 3. 分析函数与组件声明
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const sig = extractFunctionSignature(node, sourceFile);
        recordSymbol(relPath, name, isReactComponent(name) ? 'component' : 'function', sig, isExported);
      }

      // 4. 分析变量声明 (如 const MyComp = () => ... 或导出常量)
      if (ts.isVariableStatement(node)) {
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
              const sig = extractArrowFunctionSignature(name, decl.initializer, sourceFile);
              recordSymbol(relPath, name, isReactComponent(name) ? 'component' : 'function', sig, isExported);
            } else if (isExported) {
              const sig = decl.getText(sourceFile);
              recordSymbol(relPath, name, 'const', sig.length > 100 ? `${name}: [data]` : sig, isExported);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    function recordSymbol(file, name, kind, signature, isExported) {
      const symKey = `${file}#${name}`;
      const symObj = {
        key: symKey,
        name,
        kind,
        file,
        signature: signature?.trim(),
        isExported,
      };
      graph.symbols[symKey] = symObj;
      fileNode.symbols.push(symKey);
      if (isExported) {
        fileNode.exports.push({ name, kind, key: symKey });
      }
    }

    visit(sourceFile);
  }

  return graph;
}

function hasModifier(node, kind) {
  return node.modifiers?.some((m) => m.kind === kind) ?? false;
}

function isReactComponent(name) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function extractFunctionSignature(node, sourceFile) {
  const name = node.name ? node.name.text : 'anonymous';
  const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
  const retType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
  return `function ${name}(${params})${retType}`;
}

function extractArrowFunctionSignature(name, node, sourceFile) {
  const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
  const retType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
  return `const ${name} = (${params})${retType}`;
}

// ----------------- CLI 交互指令 -----------------

const args = process.argv.slice(2);
const command = args[0] || 'overview';
const target = args[1];

const graph = buildCodeGraph();

if (command === 'overview') {
  console.log('=== [CodeGraph] 项目全局符号骨架 (极低 Token 大纲) ===\n');
  for (const [file, fInfo] of Object.entries(graph.files)) {
    if (fInfo.exports.length === 0 && fInfo.symbols.length === 0) continue;
    console.log(`📁 ${file} (${Math.round(fInfo.sizeBytes / 1024)}KB)`);
    if (fInfo.imports.length > 0) {
      const impList = fInfo.imports
        .map((i) => (i.namedBindings.length ? `{ ${i.namedBindings.join(', ')} }` : i.defaultImport || i.source))
        .join(', ');
      console.log(`  🔗 依赖: ${impList}`);
    }
    for (const exp of fInfo.exports) {
      const sym = graph.symbols[exp.key];
      const sigSummary = sym.kind === 'interface' || sym.kind === 'type' 
        ? `${sym.kind} ${sym.name}` 
        : sym.signature;
      console.log(`  ⭐ [${sym.kind.toUpperCase()}] ${sigSummary}`);
    }
    console.log('');
  }
} else if (command === 'impact') {
  if (!target) {
    console.error('用法: node scripts/codegraph.mjs impact <SymbolName|FileName>');
    process.exit(1);
  }
  console.log(`=== [CodeGraph] 影响面分析: "${target}" ===\n`);

  // 1. 查找被谁引用 (Imports)
  const incomingImports = graph.imports.filter((imp) => {
    return (
      imp.source.includes(target) ||
      imp.defaultImport === target ||
      imp.namedBindings.includes(target)
    );
  });

  if (incomingImports.length === 0) {
    console.log(`未找到对 "${target}" 的直接 import 引用。`);
  } else {
    console.log(`🔍 引用 "${target}" 的上游文件:`);
    for (const imp of incomingImports) {
      console.log(`  - 📄 ${imp.fromFile}`);
      if (imp.namedBindings.length) console.log(`    导入符号: ${imp.namedBindings.join(', ')}`);
      if (imp.defaultImport) console.log(`    默认导入: ${imp.defaultImport}`);
    }
  }

  // 2. 匹配对应符号签名
  const matchedSymbols = Object.values(graph.symbols).filter(
    (s) => s.name === target || s.key.includes(target)
  );
  if (matchedSymbols.length > 0) {
    console.log('\n📐 目标符号签名与结构:');
    for (const s of matchedSymbols) {
      console.log(`\n--- [${s.kind}] ${s.key} ---`);
      console.log(s.signature);
    }
  }
} else if (command === 'subgraph') {
  if (!target) {
    console.error('用法: node scripts/codegraph.mjs subgraph <SymbolName|FileName>');
    process.exit(1);
  }
  console.log(`=== [CodeGraph] 精简上下文子图: "${target}" ===\n`);

  const matchedFile = Object.keys(graph.files).find((f) => f.includes(target));
  if (matchedFile) {
    const fInfo = graph.files[matchedFile];
    console.log(`🎯 目标文件: ${matchedFile} (原始大小: ${fInfo.sizeBytes} 字节)`);
    console.log('\n[外部依赖模块]:');
    for (const imp of fInfo.imports) {
      console.log(`  import ${imp.defaultImport ? imp.defaultImport : ''} { ${imp.namedBindings.join(', ')} } from '${imp.source}'`);
    }
    console.log('\n[内部符号骨架与类型声明]:');
    for (const symKey of fInfo.symbols) {
      const sym = graph.symbols[symKey];
      console.log(`\n// ${sym.kind}: ${sym.name}`);
      console.log(sym.signature);
    }
  } else {
    const matchedSymbols = Object.values(graph.symbols).filter((s) => s.name === target);
    for (const s of matchedSymbols) {
      console.log(`符号: ${s.key}`);
      console.log(s.signature);
    }
  }
} else if (command === 'stats') {
  const fileCount = Object.keys(graph.files).length;
  const symbolCount = Object.keys(graph.symbols).length;
  console.log(`=== [CodeGraph] 索引概况 ===`);
  console.log(`📁 索引文件数: ${fileCount}`);
  console.log(`🧩 解析符号数: ${symbolCount}`);
  console.log(`🔗 依赖引入数: ${graph.imports.length}`);
}
