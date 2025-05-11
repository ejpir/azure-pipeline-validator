/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.YAMLDocumentSymbols = void 0;
var vscode_languageserver_types_1 = require("vscode-languageserver-types");
var YAMLDocumentSymbols = /** @class */ (function () {
    function YAMLDocumentSymbols() {
    }
    YAMLDocumentSymbols.prototype.findDocumentSymbols = function (document, doc) {
        var _this = this;
        if (!doc || !doc.documents || doc.documents.length === 0) {
            return null;
        }
        var collectOutlineEntries = function (result, node, containerName) {
            if (node.type === 'array') {
                node.items.forEach(function (node) {
                    collectOutlineEntries(result, node, containerName);
                });
            }
            else if (node.type === 'object') {
                var objectNode = node;
                objectNode.properties.forEach(function (property) {
                    var location = vscode_languageserver_types_1.Location.create(document.uri, vscode_languageserver_types_1.Range.create(document.positionAt(property.start), document.positionAt(property.end)));
                    var valueNode = property.value;
                    if (valueNode) {
                        var childContainerName = containerName ? containerName + '.' + property.key.value : property.key.value;
                        result.push({ name: property.key.getValue(), kind: _this.getSymbolKind(valueNode.type), location: location, containerName: containerName });
                        collectOutlineEntries(result, valueNode, childContainerName);
                    }
                });
            }
            return result;
        };
        var results = [];
        doc.documents.forEach(function (yamlDocument) {
            if (yamlDocument.root) {
                var result = collectOutlineEntries([], yamlDocument.root, void 0);
                results.push.apply(results, result);
            }
        });
        return results;
    };
    YAMLDocumentSymbols.prototype.getSymbolKind = function (nodeType) {
        switch (nodeType) {
            case 'object':
                return vscode_languageserver_types_1.SymbolKind.Module;
            case 'string':
                return vscode_languageserver_types_1.SymbolKind.String;
            case 'number':
                return vscode_languageserver_types_1.SymbolKind.Number;
            case 'array':
                return vscode_languageserver_types_1.SymbolKind.Array;
            case 'boolean':
                return vscode_languageserver_types_1.SymbolKind.Boolean;
            default: // 'null'
                return vscode_languageserver_types_1.SymbolKind.Variable;
        }
    };
    return YAMLDocumentSymbols;
}());
exports.YAMLDocumentSymbols = YAMLDocumentSymbols;
//# sourceMappingURL=documentSymbols.js.map