const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');

function extractExports(filePath, mainObjName) {
    const code = fs.readFileSync(filePath, 'utf8');
    const ast = acorn.parse(code, { ecmaVersion: 2020, locations: false });
    
    const functions = {};
    
    // First pass: collect all FunctionDeclarations
    walk.simple(ast, {
        FunctionDeclaration(node) {
            if (node.id) {
                const args = node.params.map(p => p.type === 'Identifier' ? p.name : (p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? p.left.name : 'arg'));
                functions[node.id.name] = args;
            }
        },
        FunctionExpression(node) {
            if (node.id) {
                const args = node.params.map(p => p.type === 'Identifier' ? p.name : 'arg');
                functions[node.id.name] = args;
            }
        }
    });

    const exports = {};

    // Second pass: find what is exported or attached to mainObjName
    walk.simple(ast, {
        AssignmentExpression(node) {
            if (node.left.type === 'MemberExpression') {
                let objName = '';
                if (node.left.object.type === 'Identifier') objName = node.left.object.name;
                
                if (objName === mainObjName || (objName === 'module' && node.left.property.name === 'exports')) {
                    const propName = node.left.property.name || (node.left.property.value);
                    if (propName) {
                        if (node.right.type === 'Identifier') {
                            if (functions[node.right.name]) {
                                exports[propName] = functions[node.right.name];
                            }
                        } else if (node.right.type === 'FunctionExpression' || node.right.type === 'ArrowFunctionExpression') {
                            const args = node.right.params.map(p => p.type === 'Identifier' ? p.name : 'arg');
                            exports[propName] = args;
                        }
                    }
                }
            }
        }
    });
    
    // Add the main object itself if it is a function
    if (functions[mainObjName]) {
        exports[mainObjName] = functions[mainObjName];
    }
    
    return exports;
}

const lodashOld = extractExports('./seed-repo-vulnerable/node_modules/lodash/lodash.js', 'lodash');
console.log('Lodash zipObjectDeep old:', lodashOld.zipObjectDeep);

const markedOld = extractExports('./seed-repo-vulnerable/node_modules/marked/lib/marked.js', 'marked');
console.log('Marked old:', markedOld.marked);

